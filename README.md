
<h1 align="center">(Unmaintained Repo) Welcome to 🦠 COVID-19/Corona Statistics Dashboard Angular 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.5.0-blue.svg?cacheSeconds=2592000" />
    <img alt="Version" src="https://img.shields.io/badge/build-passing-brightgreen" />
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
<!--   <a href="https://discord.gg/QFmHc9" target="_blank">
    <img alt="Discord Server" src="https://user-images.githubusercontent.com/7288322/34472039-a19b9ed4-efbc-11e7-8946-c1ff405ae2a6.png" />
  </a> -->
  <a href="https://ko-fi.com/ossamarafique" target="_blank">
    <img alt="Buy Me A Coffee" src="https://www.ko-fi.com/img/githubbutton_sm.svg" />
  </a>
  <a href="https://twitter.com/OssamaRafique" target="_blank">
    <img alt="Twitter: OssamaRafique" src="https://img.shields.io/twitter/follow/OssamaRafique.svg?style=social" />
  </a>
</p>
<img alt="Covid Stats Live Dashboard" src="https://coronastatistics.live/assets/images/preview.png" />

### 🏠 [Homepage](https://github.com/OssamaRafique/Corona-Statistics-And-Tracker-Dashboard-Angular-9)

### ✨ [Demo](https://coronastatistics.live)

### ✨ [Join Discord Server For Help](https://discord.gg/QFmHc9)

## Screenshots

<img alt="Covid Stats Live Dashboard Screenshot 1" src="https://coronastatistics.live/screenshots/scn1.png" />
<img alt="Covid Stats Live Dashboard Screenshot 2" src="https://coronastatistics.live/screenshots/scn2.png" />
<img alt="Covid Stats Live Dashboard Screenshot 3" src="https://coronastatistics.live/screenshots/scn3.png" />
<img alt="Covid Stats Live Dashboard Screenshot 4" src="https://coronastatistics.live/screenshots/scn4.png" />
<img alt="Covid Stats Live Dashboard Screenshot 5" src="https://coronastatistics.live/screenshots/scn5.png" />

## Build the Angular project

```sh
npm install
```

```sh
ng build
```


## Run the Angular Project

```sh
npm install
```

```sh
ng serve
```

## Run the Node.js Project (open server folder)

Rename config.example.json to config.json and fill in the details

```
{
  "redis": {
    "host": "host",
    "password": "1234"
  },
  "keys": {
    "all": "coronastatistics:all",
    "countries": "coronastatistics:countries",
    "timeline": "coronastatistics:timeline",
    "timelineglobal": "coronastatistics:timelineglobal"
  },
  "interval": 600000
}
```

```sh
npm install
```

```sh
node server.js
```
Edit src/app/core/services/getdata.service.ts and replace with your own api url.

```
  private host = "https://api.coronastatistics.live"
```

# API Endpoints

* http://api.coronastatistics.live/all
* http://api.coronastatistics.live/countries
* http://api.coronastatistics.live/countries?sort={parameter}
* http://api.coronastatistics.live/countries/{country_name}
* http://api.coronastatistics.live/timeline
* http://api.coronastatistics.live/timeline/global
* http://api.coronastatistics.live/timeline/{country_name}

## Author

👤 **Ossama Rafique**

* Website: https://www.ossamarafique.com
* Twitter: [@OssamaRafique](https://twitter.com/OssamaRafique)
* Github: [@OssamaRafique](https://github.com/OssamaRafique)
* LinkedIn: [@OssamaRafique](https://linkedin.com/in/OssamaRafique)
* Buy me a Coffee: https://ko-fi.com/ossamarafique

## Show your support

Give a ⭐️ if this project helped you!

[![ko-fi](https://www.ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/C0C71IRSG)
