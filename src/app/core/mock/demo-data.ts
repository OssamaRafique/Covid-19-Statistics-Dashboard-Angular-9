/**
 * Demo data for the unmaintained dashboard.
 *
 * The API this project used to talk to (api.coronastatistics.live) has been retired, so the
 * dashboard ships with generated sample data instead. THESE ARE NOT REAL COVID-19 FIGURES, they
 * exist purely so the charts, search, sorting and country pages remain explorable.
 *
 * The numbers are produced by a seeded PRNG, so they are identical on every reload. The response
 * shapes mirror the old Express API in server/server.js so the components need no changes.
 */
import COUNTRY_CODES from '../../shared/utils/countries';
import { Country } from '../models/country';

const DAYS = 420;
const START_DATE = Date.UTC(2020, 0, 22);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TimelinePoint {
  date: string;
  cases: number;
  deaths: number;
  recovered: number;
}

export interface CountryTimeline {
  country: string;
  timeline: TimelinePoint[];
}

/**
 * Rough real populations (millions) for the countries big enough to dominate a chart. Only the
 * ordering matters here: without it the generator hands Liechtenstein more cases than China and the
 * whole dashboard reads as broken. Anything not listed is treated as a smaller nation below.
 */
const POPULATIONS = {
  'China': 1411, 'India': 1380, 'USA': 331, 'Indonesia': 274, 'Pakistan': 221, 'Brazil': 213,
  'Nigeria': 206, 'Bangladesh': 165, 'Russia': 146, 'Mexico': 129, 'Japan': 126, 'Ethiopia': 115,
  'Philippines': 110, 'Egypt': 102, 'Vietnam': 97, 'DRC': 90, 'Turkey': 84, 'Iran': 84,
  'Germany': 84, 'Thailand': 70, 'UK': 68, 'France': 65, 'Italy': 60, 'Tanzania': 60,
  'South Africa': 59, 'Myanmar': 54, 'Kenya': 54, 'S. Korea': 52, 'Colombia': 51, 'Spain': 47,
  'Uganda': 46, 'Argentina': 45, 'Algeria': 44, 'Sudan': 44, 'Ukraine': 44, 'Iraq': 40,
  'Canada': 38, 'Poland': 38, 'Morocco': 37, 'Saudi Arabia': 35, 'Uzbekistan': 34, 'Peru': 33,
  'Angola': 33, 'Malaysia': 32, 'Mozambique': 31, 'Ghana': 31, 'Yemen': 30, 'Nepal': 29,
  'Venezuela': 28, 'Madagascar': 28, 'Cameroon': 27, 'Ivory Coast': 26, 'Australia': 26,
  'Niger': 24, 'Sri Lanka': 22, 'Burkina Faso': 21, 'Mali': 20, 'Romania': 19, 'Malawi': 19,
  'Chile': 19, 'Kazakhstan': 19, 'Zambia': 18, 'Guatemala': 18, 'Ecuador': 18,
  'Syrian Arab Republic': 17, 'Netherlands': 17, 'Senegal': 17, 'Cambodia': 17, 'Chad': 16,
  'Somalia': 16, 'Zimbabwe': 15, 'Guinea': 13, 'Rwanda': 13, 'Benin': 12, 'Burundi': 12,
  'Tunisia': 12, 'Bolivia': 12, 'Belgium': 12, 'Haiti': 11, 'Cuba': 11,
  'Dominican Republic': 11, 'Czechia': 11, 'Greece': 10, 'Jordan': 10, 'Portugal': 10,
  'Azerbaijan': 10, 'Sweden': 10, 'Honduras': 10, 'UAE': 10, 'Hungary': 10, 'Belarus': 9,
  'Tajikistan': 9, 'Austria': 9, 'Papua New Guinea': 9, 'Serbia': 9, 'Israel': 9, 'Switzerland': 9
};

/**
 * Entries in COUNTRY_CODES that the world map cannot place: Antarctica is excluded from the polygon
 * series in dashboard.component.ts, and the other two have no polygon in the amCharts geodata. Left
 * in, each would drop a stray bubble at 0°/0° in the Gulf of Guinea.
 */
const NOT_ON_MAP = ['Antarctica', 'United States Outlying Islands', 'Netherlands Antilles'];

/**
 * Names the country page rewrites before asking for a timeline (see country.component.ts) that no
 * longer match a key here. Without these, /country/usa would draw someone else's curve.
 */
const TIMELINE_ALIASES = {
  'us': 'USA',
  'united kingdom': 'UK',
  'united arab emirates': 'UAE'
};

/** Small, fast, deterministic PRNG. Same seed always yields the same sequence. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, so each country seeds off its own name rather than its position in the list. */
function seedFromName(name: string): number {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isoDate(dayIndex: number): string {
  return new Date(START_DATE + dayIndex * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Normalised logistic curve: 0 on day 0, exactly 1 on the last day, monotonically increasing in
 * between. Shifting `mid` later gives deaths and recoveries their natural lag behind cases while
 * still landing on the country's totals at the end of the series.
 */
function curve(dayIndex: number, mid: number, steepness: number): number {
  const logistic = (x: number) => 1 / (1 + Math.exp(-steepness * (x - mid)));
  const first = logistic(0);
  const last = logistic(DAYS - 1);
  return (logistic(dayIndex) - first) / (last - first);
}

function buildCountry(name: string): Country {
  const rnd = mulberry32(seedFromName(name));

  // Listed countries keep their real order of magnitude; everything else is treated as a smaller
  // nation, which keeps the top of every chart plausible.
  const population = POPULATIONS[name]
    ? Math.round(POPULATIONS[name] * 1e6)
    : Math.round(3e4 + rnd() * 9e6);
  const cases = Math.max(50, Math.round(population * (0.005 + rnd() * 0.06)));
  const deaths = Math.max(1, Math.round(cases * (0.005 + rnd() * 0.03)));
  const recovered = Math.max(1, Math.round((cases - deaths) * (0.6 + rnd() * 0.35)));
  // The rate cards and the radar chart divide by these, so neither may be zero.
  const active = Math.max(1, cases - deaths - recovered);
  const critical = Math.max(1, Math.round(active * (0.005 + rnd() * 0.02)));
  const todayCases = Math.max(1, Math.round(cases * (0.001 + rnd() * 0.01)));
  const todayDeaths = Math.max(1, Math.round(todayCases * (0.005 + rnd() * 0.02)));

  return {
    country: name,
    cases,
    todayCases,
    deaths,
    todayDeaths,
    recovered,
    active,
    critical,
    casesPerOneMillion: Math.round((cases / population) * 1e6)
  };
}

let countriesCache: Country[] = null;

/** Every country in COUNTRY_CODES, so each row resolves both a flag and a world map bubble. */
function baseCountries(): Country[] {
  if (!countriesCache) {
    countriesCache = Object.keys(COUNTRY_CODES)
      .filter(name => NOT_ON_MAP.indexOf(name) === -1)
      .map(buildCountry);
  }
  return countriesCache;
}

function buildTimeline(country: Country): TimelinePoint[] {
  const rnd = mulberry32(seedFromName(country.country) ^ 0x9e3779b9);
  const mid = DAYS * (0.35 + rnd() * 0.4);
  const steepness = 0.02 + rnd() * 0.03;
  const deathsMid = mid + 10 + rnd() * 20;
  const recoveredMid = mid + 20 + rnd() * 30;

  const timeline: TimelinePoint[] = [];
  for (let day = 0; day < DAYS; day++) {
    timeline.push({
      date: isoDate(day),
      // Floored at 1 so the dashboard's logarithmic scale toggle stays usable.
      cases: Math.max(1, Math.round(country.cases * curve(day, mid, steepness))),
      deaths: Math.max(1, Math.round(country.deaths * curve(day, deathsMid, steepness * 0.9))),
      recovered: Math.max(1, Math.round(country.recovered * curve(day, recoveredMid, steepness * 0.85)))
    });
  }
  return timeline;
}

let timelineCache: CountryTimeline[] = null;

function allTimelines(): CountryTimeline[] {
  if (!timelineCache) {
    timelineCache = baseCountries().map(country => ({
      country: country.country,
      timeline: buildTimeline(country)
    }));
  }
  return timelineCache;
}

let globalTimelineCache: any = null;

/** Mirrors the sort in server/server.js: ascending compare, then reversed. */
export function getDemoCountries(sortBy?: string): Country[] {
  const countries = baseCountries().slice();
  if (sortBy) {
    countries.sort((a, b) => {
      if (a[sortBy] < b[sortBy]) {
        return -1;
      } else if (a[sortBy] > b[sortBy]) {
        return 1;
      }
      return 0;
    });
    countries.reverse();
  }
  return countries;
}

/**
 * Case-insensitive match, widening the same way the old /countries/:country endpoint did but
 * preferring an exact hit, so "us" lands on USA rather than on the first country spelt with a "us".
 */
function resolveName(name: string): string {
  const needle = (name || '').toLowerCase().replace(/\*$/, '');
  if (!needle) {
    return null;
  }
  if (TIMELINE_ALIASES[needle]) {
    return TIMELINE_ALIASES[needle];
  }
  const names = baseCountries().map(country => country.country);
  return names.find(country => country.toLowerCase() === needle)
    || names.find(country => country.toLowerCase().startsWith(needle))
    || names.find(country => country.toLowerCase().includes(needle))
    || null;
}

/** Unknown names get a generated entry rather than an error, so a hand-typed URL still renders. */
export function getDemoCountry(name: string): Country {
  const resolved = resolveName(name);
  return resolved
    ? baseCountries().find(country => country.country === resolved)
    : buildCountry(name);
}

export function getDemoTimeline(): CountryTimeline[] {
  return allTimelines();
}

/** Same accumulation as calculateAllTimeline() in server/server.js. */
export function getDemoGlobalTimeline(): any {
  if (!globalTimelineCache) {
    const totals = {};
    allTimelines().forEach(entry => {
      entry.timeline.forEach(point => {
        if (!totals.hasOwnProperty(point.date)) {
          totals[point.date] = { cases: 0, deaths: 0, recovered: 0 };
        }
        totals[point.date].cases += point.cases;
        totals[point.date].deaths += point.deaths;
        totals[point.date].recovered += point.recovered;
      });
    });
    globalTimelineCache = totals;
  }
  return globalTimelineCache;
}

/**
 * Resolved through getDemoCountry so the curve always ends on the totals the cards show, even for
 * the names country.component.ts rewrites before asking. Builds a single curve unless the whole set
 * has already been generated for the global timeline.
 */
export function getDemoCountryTimeline(name: string): any {
  const country = getDemoCountry(name);
  const cached = timelineCache && timelineCache.find(entry => entry.country === country.country);
  const data = cached || { country: country.country, timeline: buildTimeline(country) };
  return {
    multiple: false,
    name: data.country,
    data
  };
}
