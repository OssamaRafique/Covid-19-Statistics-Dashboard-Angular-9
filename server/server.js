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
function fillResult(html, idExtension) {
	const countriesTable = html(`table#main_table_countries_${idExtension}`);
	const countries = countriesTable.children('tbody:first-of-type').children('tr:not(.row_continent)').map(mapRows).get();
	const continents = countriesTable.children('tbody:first-of-type').children('tr.row_continent').map(mapRows).get().map(el => continentMapping(el, countries)).filter(data => !!data.continent);
	const world = countries.shift();
	world.population = countries.map(country => country.population).reduce((sum, pop) => sum + pop);
	world.tests = countries.map(country => country.tests).reduce((sum, test) => sum + test);
	world.testsPerOneMillion = toPerOneMillion(world.population, world.tests);
	world.activePerOneMillion = toPerOneMillion(world.population, world.active);
	world.recoveredPerOneMillion = toPerOneMillion(world.population, world.recovered);
	world.criticalPerOneMillion = toPerOneMillion(world.population, world.critical);
	return { world, countries, continents };
}
const getCountries = async () => {
	try {
		const html = cheerio.load((await axios.get('https://www.worldometers.info/coronavirus')).data);
		['today', 'yesterday', 'yesterday2'].forEach(key => {
      const data = fillResult(html, key);
      let countries = [data.world, ...getOrderByCountryName(data.countries)].filter(country => country.country!="World");
      console.log(countries)
			redis.set(keys[`${key === 'today' ? '' : key === 'yesterday2' ? 'twoDaysAgo_' : 'yesterday_'}countries`], JSON.stringify(countries));
			console.info(`Updated ${key} countries statistics: ${data.countries.length + 1}`);
			redis.set(keys[`${key === 'today' ? '' : key === 'yesterday2' ? 'twoDaysAgo_' : 'yesterday_'}continents`], JSON.stringify(getOrderByCountryName(data.continents)));
			console.info(`Updated ${key} continents statistics: ${data.continents.length}`);
		});
	} catch (err) {
		console.log('Error: Requesting WorldoMeters failed!', err);
	}
};
const columns = ['index', 'country', 'cases', 'todayCases', 'deaths', 'todayDeaths', 'recovered', 'todayRecovered', 'active',
	'critical', 'casesPerOneMillion', 'deathsPerOneMillion', 'tests', 'testsPerOneMillion', 'population', 'continent', 'oneCasePerPeople', 'oneDeathPerPeople', 'oneTestPerPeople'];
const mapRows = (_, row) => {
	const entry = { updated: Date.now() };
	const replaceRegex = /(\n|,)/g;
	cheerio(row).children('td').each((index, cell) => {
		const selector = columns[index];
		cell = cheerio.load(cell);
		switch (index) {
			case 0: {
				break;
			}
			case 1: {
				const countryInfo = {};
				entry[selector] = countryInfo.country || cell.text().replace(replaceRegex, '');
				delete countryInfo.country;
				entry.countryInfo = countryInfo;
				break;
			}
			case 15: {
				entry[selector] = cell.text();
				break;
			}
			default:
				entry[selector] = parseFloat(cell.text().replace(replaceRegex, '')) || null;
		}
	});
	// eslint-disable-next-line no-unused-expressions
	!entry.active && (entry.active = entry.cases - entry.recovered - entry.deaths);
	entry.activePerOneMillion = toPerOneMillion(entry.population, entry.active);
	entry.recoveredPerOneMillion = toPerOneMillion(entry.population, entry.recovered);
	entry.criticalPerOneMillion = toPerOneMillion(entry.population, entry.critical);
	return entry;
};
const toPerOneMillion = (population, property) => property && parseFloat((1e6 / population * property).toFixed(2));
const continentMapping = (element, countries) => {
	const continentCountries = countries.filter(country => country.continent === element.continent);
	element.population = continentCountries.map(country => country.population).reduce((sum, pop) => sum + pop);
	element.tests = continentCountries.map(country => country.tests).reduce((sum, tests) => sum + tests);
	element.casesPerOneMillion = toPerOneMillion(element.population, element.cases);
	element.deathsPerOneMillion = toPerOneMillion(element.population, element.deaths);
	element.testsPerOneMillion = toPerOneMillion(element.population, element.tests);
	element.activePerOneMillion = toPerOneMillion(element.population, element.active);
	element.recoveredPerOneMillion = toPerOneMillion(element.population, element.recovered);
	element.criticalPerOneMillion = toPerOneMillion(element.population, element.critical);
	// eslint-disable-next-line no-unused-vars
	const { country, countryInfo, oneCasePerPeople, oneDeathPerPeople, oneTestPerPeople, ...continentData } = element;
	return continentData;
};
const getOrderByCountryName = (data) => data.sort((a, b) => a.country < b.country ? -1 : 1);

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
