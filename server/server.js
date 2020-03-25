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
  console.log("Updated The Cases", result);
}
var getCountries = async () => {
  let response;
    try {
        response = await axios.get("https://www.worldometers.info/coronavirus/");
        if (response.status !== 200) {
            console.log("Error", response.status);
        }
    } catch (err) {
        return null;
    }
    // to store parsed data
    const result = [];
    // get HTML and parse death rates
    const html = cheerio.load(response.data);
    const countriesTable = html("table#main_table_countries_today");
    const countriesTableCells = countriesTable
        .children("tbody")
        .children("tr")
        .children("td");
    // NOTE: this will change when table format change in website
    const totalColumns = 10;
    const countryColIndex = 0;
    const casesColIndex = 1;
    const todayCasesColIndex = 2;
    const deathsColIndex = 3;
    const todayDeathsColIndex = 4;
    const curedColIndex = 5;
    const activeColIndex = 6;
    const criticalColIndex = 7;
    const casesPerOneMillionColIndex = 8;
    const deathsPerOneMillionColIndex = 9;
    // minus totalColumns to skip last row, which is total
    for (let i = 0; i < countriesTableCells.length - totalColumns; i += 1) {
        const cell = countriesTableCells[i];

        // get country
        if (i % totalColumns === countryColIndex) {
            let country =
                cell.children[0].data ||
                cell.children[0].children[0].data ||
                // country name with link has another level
                cell.children[0].children[0].children[0].data ||
                cell.children[0].children[0].children[0].children[0].data ||
                "";
            country = country.trim();
            if (country.length === 0) {
                // parse with hyperlink
                country = cell.children[0].next.children[0].data || "";
            }
            country = country.trim();
            result.push({country});
        }
        // get cases
        if (i % totalColumns === casesColIndex) {
            let cases = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].cases = parseInt(
                cases.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get today cases
        if (i % totalColumns === todayCasesColIndex) {
            let cases = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].todayCases = parseInt(
                cases.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get deaths
        if (i % totalColumns === deathsColIndex) {
            let deaths = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].deaths = parseInt(
                deaths.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get today deaths
        if (i % totalColumns === todayDeathsColIndex) {
            let deaths = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].todayDeaths = parseInt(
                deaths.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get cured
        if (i % totalColumns === curedColIndex) {
            let cured = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].recovered = parseInt(
                cured.trim().replace(/,/g, "") || 0,
                10
            );
        }
        // get active
        if (i % totalColumns === activeColIndex) {
            let cured = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].active = parseInt(
                cured.trim().replace(/,/g, "") || 0,
                10
            );
        }
        // get critical
        if (i % totalColumns === criticalColIndex) {
            let critical = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].critical = parseInt(
                critical.trim().replace(/,/g, "") || "0",
                10
            );
        }
        // get total cases per one million population
        if (i % totalColumns === casesPerOneMillionColIndex) {
            let casesPerOneMillion = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].casesPerOneMillion = parseInt(
                casesPerOneMillion.trim().replace(/,/g, "") || "0",
                10
            );
        }

        // get total deaths per one million population
        if (i % totalColumns === deathsPerOneMillionColIndex) {
            let deathsPerOneMillion = cell.children.length != 0 ? cell.children[0].data : "";
            result[result.length - 1].deathsPerOneMillion = parseInt(
                deathsPerOneMillion.trim().replace(/,/g, "") || "0",
                10
            );
        }
    }

    const string = JSON.stringify(result);
    redis.set(keys.countries, string);
    console.log(`Updated all countries: ${result.length} countries`);
};

var getHistory = async () => {
  let casesResponse, deathsResponse, recResponse;
  const date = new Date();
  try {
    casesResponse = await axios.get(`${basePathHistory}time_series_19-covid-Confirmed.csv`);
    deathsResponse = await axios.get(`${basePathHistory}time_series_19-covid-Deaths.csv`);
    recResponse = await axios.get(`${basePathHistory}time_series_19-covid-Recovered.csv`);
  } catch (err) {
    console.log(err)
    return null;
  }

  const parsedCases = await csv({
    noheader: true,
    output: "csv"
  }).fromString(casesResponse.data);

  const parsedDeaths = await csv({
    noheader: true,
    output: "csv"
  }).fromString(deathsResponse.data);

  const recParsed = await csv({
    noheader: true,
    output: "csv"
  }).fromString(recResponse.data);

  const result = [];
  const timelineKey = parsedCases[0].splice(4);

  for (let b = 1; b < parsedDeaths.length;) {
    const timeline = []
    const c = parsedCases[b].splice(4);
    const r = recParsed[b].splice(4);
    const d = parsedDeaths[b].splice(4);
    for (let i = 0; i < c.length; i++) {
      timeline.push({
        date: timelineKey[i],
        cases: c[i],
        deaths: d[i],
        recovered: r[i]
      });
    }
    result.push({
      country: parsedCases[b][1],
      province: parsedCases[b][0] === "" ? null : parsedCases[b][0],
      timeline
    })
    b++;
  }

  const string = JSON.stringify(result);
  redis.set(keys.timeline, string);

  let globalTimeline = JSON.stringify(await calculateAllTimeline(result));
  redis.set(keys.timelineglobal,globalTimeline);
  console.log(`Updated JHU CSSE Timeline: ${result.length} locations in total`);
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
      if(!data.hasOwnProperty(o.date)){
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
var listener = app.listen(process.env.PORT || 5000, function () {
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
    e => e.country.toLowerCase()===req.params.country.toLowerCase()
  );
  if (!country) {
    res.send(false);
    return;
  }
  country = data.filter(
    e => e.country.toLowerCase()===req.params.country.toLowerCase()
  );
  if(country.length==1){
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