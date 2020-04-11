var express = require('express');
var app = express();
var axios = require("axios");
var cheerio = require("cheerio");
var cors = require('cors');
const config = require('./config.json');
const Redis = require('ioredis');
const csv = require('csvtojson')

let basePathHistory = "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/";


app.use(cors());

// create redis instance :O
const redis = new Redis(config.redis.host, {
  password: config.redis.password
})

const keys = config.keys


var getAll = async () => {
  let response;
  try {
    response = await axios.get("https://www.worldometers.info/coronavirus/");
    if (response.status !== 200) {
      console.log("ERROR");
    }
  } catch (err) {
    return null;
  }
  // to store parsed data
  const result = {};
  // get HTML and parse death rates
  const html = cheerio.load(response.data);
  html(".maincounter-number").filter((i, el) => {
    let count = el.children[0].next.children[0].data || "0";
    count = parseInt(count.replace(/,/g, "") || "0", 10);
    // first one is
    if (i === 0) {
      result.cases = count;
    } else if (i === 1) {
      result.deaths = count;
    } else {
      result.recovered = count;
    }
  });
  result.updated = Date.now()
  const string = JSON.stringify(result);
  redis.set(keys.all, string);
  console.log("Updated The Cases");
}
const getCountryData = (cell) => (cell.children[0].data || cell.children[0].children[0].data || cell.children[0].children[0].children[0].data
	|| cell.children[0].children[0].children[0].children[0].data || (cell.children[0].next.children[0] && cell.children[0].next.children[0].data) || '').trim();

const getOrderByCountryName = (data) => data.sort((a, b) => a.country < b.country ? -1 : 1);

const getCellData = (cell) => parseInt((cell.children.length !== 0 ? cell.children[0].data : '').trim().replace(/,/g, '') || '0', 10);

let fillResult = (html, yesterday = false) => {
	// to store parsed data
	const countryColIndex = 0;
	const casesColIndex = 1;
	const newCasesColIndex = 2;
	const deathsColIndex = 3;
	const newDeathsColIndex = 4;
	const curedColIndex = 5;
	const activeColIndex = 6;
	const criticalColIndex = 7;
	const casesPerOneMillionColIndex = 8;
	const deathsPerOneMillionColIndex = 9;
	const testsColIndex = 10;
	const testsPerOneMillionColIndex = 11;

	const countriesTable = html(yesterday ? 'table#main_table_countries_yesterday' : 'table#main_table_countries_today');
	const totalColumns = html('table#main_table_countries_today th').length;
	const countriesRows = countriesTable.children('tbody:first-of-type').children('tr:not(.row_continent)');
	const countriesData = countriesRows.map((index, row) => {
		const cells = cheerio(row).children('td');
		const country = { updated: Date.now() };
		for (const cellIndex in cells) {
			const cell = cells[cellIndex];
			switch (cellIndex % totalColumns) {
				// get country
				case countryColIndex: {
					// eslint-disable-next-line prefer-destructuring
					country.country = getCountryData(cell);
					break;
				}
				// get cases
				case casesColIndex:
					country.cases = getCellData(cell);
					break;
				// get today cases
				case newCasesColIndex:
					country.todayCases = getCellData(cell);
					break;
				// get deaths
				case deathsColIndex:
					country.deaths = getCellData(cell);
					break;
				// get today deaths
				case newDeathsColIndex:
					country.todayDeaths = getCellData(cell);
					break;
				// get cured
				case curedColIndex:
					country.recovered = getCellData(cell);
					break;
				// get active
				case activeColIndex:
					country.active = getCellData(cell);
					break;
				// get critical
				case criticalColIndex:
					country.critical = getCellData(cell);
					break;
				// get total cases per one million population
				case casesPerOneMillionColIndex:
					country.casesPerOneMillion = getCellData(cell);
					break;
				// get total deaths per one million population
				case deathsPerOneMillionColIndex:
					country.deathsPerOneMillion = getCellData(cell);
					break;
				// get tests
				case testsColIndex:
					country.tests = getCellData(cell);
					break;
				// get total tests per one million population
				case testsPerOneMillionColIndex:
					country.testsPerOneMillion = getCellData(cell);
					break;
			}
		}
		return country;
	}).get();
	const world = countriesData.find(country => country.country.toLowerCase() === 'world');
	world.tests = countriesData.map(country => country.tests).splice(1).reduce((sum, test) => sum + test);
	world.testsPerOneMillion = parseFloat(((1e6 / (1e6 / (world.casesPerOneMillion / world.cases))) * world.tests).toFixed(1));
	return countriesData;
}
var getCountries = async () => {
  let response;
	try {
		response = await axios.get('https://www.worldometers.info/coronavirus');
	} catch (err) {
		logger.httpErrorLogger(err, 'error in getWorldometers REQUEST');
		return null;
	}
	// get HTML and parse death rates
	const html = cheerio.load(response.data);

	// Getting country data from today
	let countriesToday = fillResult(html);
	const worldToday = countriesToday[0];
	countriesToday = getOrderByCountryName(countriesToday.splice(1));
	countriesToday.unshift(worldToday);
  redis.set(keys.countries, JSON.stringify(countriesToday.filter(x=>x.country!="World")));
	console.log(`Updated countries statistics: ${countriesToday.length}`);
};

var getHistory = async () => {
  let history = await axios.get(`https://pomber.github.io/covid19/timeseries.json`).then(async response => {
    const res = response.data;
    const hKeys = Object.keys(res);
    let newHistory = [];
    for (key of hKeys) {
      const newArr = res[key].map(({
        confirmed: cases,
        ...rest
      }) => ({
        cases,
        ...rest
      }));

      newHistory.push({
        country: key,
        timeline: newArr
      });
    }
    redis.set(keys.timeline, JSON.stringify(newHistory));
    let globalTimeline = JSON.stringify(await calculateAllTimeline(newHistory));
    redis.set(keys.timelineglobal, globalTimeline);
    console.log(`Updated JHU CSSE Timeline`);
  });
}
getCountries()
getAll()
getHistory()

setInterval(getCountries, config.interval);
setInterval(getAll, config.interval);
setInterval(getHistory, config.interval);


let calculateAllTimeline = async (timeline) => {
  let data = {};
  timeline.forEach(async element => {
    element.timeline.forEach(async o => {
      if (!data.hasOwnProperty(o.date)) {
        data[o.date] = {};
        data[o.date]["cases"] = 0;
        data[o.date]["deaths"] = 0;
        data[o.date]["recovered"] = 0;
      }
      data[o.date].cases += parseInt(o.cases);
      data[o.date].deaths += parseInt(o.deaths);
      data[o.date].recovered += parseInt(o.recovered);
    });
  });
  return data;
}

app.get("/", async function (request, response) {
  console.log("hello");
  let a = JSON.parse(await redis.get(keys.all))
  response.send(
    `${a.cases} cases are reported of the COVID-19<br> ${a.deaths} have died from it <br>\n${a.recovered} have recovered from it. <br>
    View the dashboard here : <a href="https://coronastatistics.live">coronastatistics.live</a>`
  );
});
var listener = app.listen(process.env.PORT || 5001, function () {
  console.log("Your app is listening on port " + listener.address().port);
});
app.get("/all/", async function (req, res) {
  let all = JSON.parse(await redis.get(keys.all))
  res.send(all);
});
app.get("/countries/", async function (req, res) {
  let countries = JSON.parse(await redis.get(keys.countries))
  if (req.query['sort']) {
    try {
      const sortProp = req.query['sort'];
      countries.sort((a, b) => {
        if (a[sortProp] < b[sortProp]) {
          return -1;
        } else if (a[sortProp] > b[sortProp]) {
          return 1;
        }
        return 0;
      })
    } catch (e) {
      console.error("ERROR while sorting", e);
      res.status(422).send(e);
      return;
    }
  }
  res.send(countries.reverse());
});
app.get("/countries/:country", async function (req, res) {
  let countries = JSON.parse(await redis.get(keys.countries))
  let country = countries.find(
    e => e.country.toLowerCase().includes(req.params.country.toLowerCase())
  );
  if (!country) {
    res.send("false");
    return;
  }
  res.send(country);
});

app.get("/timeline", async function (req, res) {

  let data = JSON.parse(await redis.get(keys.timeline))
  res.send(data);
});
app.get("/timeline/global", async function (req, res) {

  let data = JSON.parse(await redis.get(keys.timelineglobal))
  res.send(data);
});

app.get("/timeline/:country", async function (req, res) {
  let data = JSON.parse(await redis.get(keys.timeline));
  let country = data.find(
    e => e.country.toLowerCase() === req.params.country.toLowerCase()
  );
  if (!country) {
    res.send(false);
    return;
  }
  country = data.filter(
    e => e.country.toLowerCase() === req.params.country.toLowerCase()
  );
  if (country.length == 1) {
    res.send({
      multiple: false,
      name: country[0].country,
      data: country[0]
    });
    return;
  }
  res.send({
    multiple: true,
    name: country[0].country,
    data: country
  });
});
