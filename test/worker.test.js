import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import worker from "../src/worker.js";
import { assertNearTermMarketCoverage, MISSING_MARKET_ERROR_CODE } from "../src/market-coverage.js";
import {
  applyHouseRaceRevealScales,
  applyCanonicalPoliticsUrls,
  buildTeamFuturesFromManifest,
  buildPoliticsPublicSnapshot,
  buildMlbFuturesSnapshot,
  buildMlbPlayerProps,
  classifyTeamFuturesSeries,
  DEFAULT_SERIES,
  filterForDate,
  normalizeEvent,
  nextScheduledRefreshStep,
  parseSeries,
  pollInterval,
  runFuturesMaintenance,
  runGeographicPoll,
  runPoliticsPoll,
  runPoll,
  runScheduledRefresh,
  runWeatherPoll,
  runTeamFuturesPoll,
  SUPPORTED_TEAM_FUTURES_SPORTS,
  scheduledRefreshStepForTime,
  teamFuturesCacheKey,
  validateTeamFuturesRecord,
  weatherPollInterval
} from "../src/worker.js";
import { classifyPoliticsEvent, classifyPoliticsLocations, HOUSE_RACE_MIN_SCALE, HOUSE_RACE_PREVIEW_MIN_SCALE, houseRaceRevealScale, kalshiSeriesSlugFromUrl, politicsMarketUrl, politicsParty, resolveKalshiSeriesSlug, resolvePoliticalLocation } from "../src/politics-registry.js";
import { HOUSE_DISTRICT_CENTROIDS } from "../src/congressional-district-centroids.js";
import { interpretMarketQuery, searchMarkets } from "../src/market-search.js";
import { canonicalSportsMatchupTitle, canonicalSportsOutcomeName } from "../src/client/sports-team-names.js";
import { buildWeatherPublicSnapshot, weatherMarketUrl } from "../src/weather-registry.js";

test("paces hosted refreshes as a durable three-step rotation", async () => {
  assert.equal(nextScheduledRefreshStep("geographic"), "sports");
  assert.equal(nextScheduledRefreshStep("sports"), "futures");
  assert.equal(nextScheduledRefreshStep("futures"), "geographic");
  assert.equal(nextScheduledRefreshStep("unknown"), "geographic");
  const minute = 60_000;
  assert.equal(scheduledRefreshStepForTime(0 * minute), "geographic");
  assert.equal(scheduledRefreshStepForTime(1 * minute), "sports");
  assert.equal(scheduledRefreshStepForTime(2 * minute), "futures");

  const now = Date.parse("2026-08-02T12:00:00Z");
  const cache = new Map([
    ["kalshi:team-futures:manifest:v3", JSON.stringify({ lastRunAt: now })],
    ["kalshi:team-futures:manifest:v2:MLB", JSON.stringify({ lastRunAt: now })]
  ]);
  const env = {
    ENVIRONMENT: "test",
    MARKET_ATLAS_CACHE: {
      async get(key, type) { const value = cache.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_SCHEDULED_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const result = await runScheduledRefresh(env, now, { step: "futures" });
  assert.equal(result.step, "futures");
  assert.deepEqual(result.steps, ["futures"]);
  assert.equal(result.nextStep, "geographic");
  assert.deepEqual(Object.keys(result.results), ["futures"]);
  assert.equal(result.ok, true);
});

test("runs a complete authenticated maintenance cycle through one shared gate", async () => {
  const now = Date.parse("2026-08-02T12:00:00Z");
  const cache = new Map([
    ["kalshi:team-futures:manifest:v3", JSON.stringify({ lastRunAt: now })],
    ["kalshi:team-futures:manifest:v2:MLB", JSON.stringify({ lastRunAt: now })]
  ]);
  const env = {
    ENVIRONMENT: "test",
    MARKET_ATLAS_CACHE: {
      async get(key, type) { const value = cache.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_SCHEDULED_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_SCHEDULED_STEPS_PER_RUN: "3",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "4"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    return Response.json(url.pathname.endsWith("/series")
      ? { series: [], cursor: "" }
      : { events: [], cursor: "" });
  };
  try {
    const result = await runScheduledRefresh(env, now, { step: "geographic" });
    assert.deepEqual(result.steps, ["geographic", "sports", "futures"]);
    assert.equal(result.nextStep, "geographic");
    assert.deepEqual(Object.keys(result.results), ["geographic", "sports", "futures"]);
    assert.equal(result.ok, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("redirects legacy preview URLs to the canonical Market Atlas routes", async () => {
  const integrated = await worker.fetch(new Request("https://example.com/integrated-test/?category=politics"), {}, {});
  const politics = await worker.fetch(new Request("https://example.com/politics-test/"), {}, {});
  const weather = await worker.fetch(new Request("https://example.com/weather-test/"), {}, {});
  assert.equal(integrated.status, 308);
  assert.equal(integrated.headers.get("location"), "https://example.com/?category=politics");
  assert.equal(politics.headers.get("location"), "https://example.com/categories/politics/");
  assert.equal(weather.headers.get("location"), "https://example.com/categories/weather/");
});

test("rewrites stale cached Politics links to the full canonical Kalshi market page", async () => {
  const cached = {
    schemaVersion: 1,
    generatedAt: "2026-08-03T16:00:00.000Z",
    bundleCount: 1,
    marketCount: 1,
    periods: [],
    bundles: [{
      id: "vatican",
      scope: "International",
      markets: [{
        eventTicker: "KXPOPEVISIT-27JAN01",
        url: "https://kalshi.com/markets/kxpopevisit/guessed-slug/kxpopevisit-27jan01"
      }]
    }]
  };
  applyCanonicalPoliticsUrls(cached.bundles);
  assert.equal(cached.bundles[0].markets[0].url, "https://kalshi.com/markets/kxpopevisit/what-countries-will-pope-leo-visit-before-2027/kxpopevisit-27jan01");

  cached.bundles[0].markets[0].url = "https://kalshi.com/markets/kxpopevisit/stale-cache/kxpopevisit-27jan01";
  const env = { MARKET_ATLAS_CACHE: { async get(key) { return key === "kalshi:politics:public:v1" ? cached : null; } } };
  const response = await worker.fetch(new Request("https://example.com/api/politics"), env, {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("etag"), /politics-links-v3/);
  const payload = await response.json();
  assert.equal(payload.bundles[0].markets[0].url, "https://kalshi.com/markets/kxpopevisit/what-countries-will-pope-leo-visit-before-2027/kxpopevisit-27jan01");
});

test("resolves and validates Kalshi's canonical series slug before caching links", async () => {
  const canonical = "https://kalshi.com/markets/kxpopevisit/what-countries-will-pope-leo-visit-before-2027/kxpopevisit-27jan01";
  assert.equal(kalshiSeriesSlugFromUrl(canonical, "KXPOPEVISIT"), "what-countries-will-pope-leo-visit-before-2027");
  assert.equal(kalshiSeriesSlugFromUrl(canonical, "KXOTHER"), "", "a redirect for another series is never accepted");
  const slug = await resolveKalshiSeriesSlug("KXPOPEVISIT", async url => {
    assert.equal(url, "https://kalshi.com/markets/kxpopevisit");
    return { ok: true, url: canonical, body: { async cancel() {} } };
  });
  assert.equal(slug, "what-countries-will-pope-leo-visit-before-2027");

  const htmlSlug = await resolveKalshiSeriesSlug("KXPOPEVISIT", async () => new Response(
    `<html><head><link rel="canonical" href="${canonical}"></head></html>`,
    { status: 200, headers: { "content-type": "text/html" } }
  ));
  assert.equal(htmlSlug, "what-countries-will-pope-leo-visit-before-2027");
});

test("maps all Philadelphia weather series and splits multi-city rain into city markets", () => {
  const now = Date.parse("2026-08-02T16:00:00Z");
  const snapshot = (seriesTicker, eventTicker, title, seriesTitle, tags, markets) => ({
    seriesTicker, eventTicker, title, seriesTitle, seriesTags: tags, seriesFrequency: "daily",
    endsAt: "2026-08-03T04:00:00Z", updatedAt: new Date(now).toISOString(), markets,
    volume: markets.reduce((sum, market) => sum + market.volume, 0)
  });
  const market = (ticker, label, lastPrice, volume) => ({ ticker, label, lastPrice, volume, status: "active" });
  const payload = buildWeatherPublicSnapshot([
    snapshot("KXHIGHPHIL", "KXHIGHPHIL-26AUG02", "Highest temperature in Philadelphia today?", "Highest temperature in Philadelphia", ["Daily temperature"], [
      market("KXHIGHPHIL-26AUG02-B84", "84° to 85°", 52, 1000), market("KXHIGHPHIL-26AUG02-B86", "86° to 87°", 33, 700)
    ]),
    snapshot("KXRAIN", "KXRAIN-26AUG02", "Where will it rain today?", "Where will it rain daily", ["Snow and rain"], [
      market("KXRAIN-26AUG02-PHIL", "Philadelphia", 61, 800), market("KXRAIN-26AUG02-BOS", "Boston", 30, 400)
    ])
  ], now);
  const philadelphia = payload.bundles.find(bundle => bundle.id === "philadelphia");
  assert.ok(philadelphia, "Philadelphia should always resolve to its own marker");
  assert.equal(philadelphia.markets.length, 2);
  assert.deepEqual(philadelphia.markets.map(item => item.kind).sort(), ["Rain & Snow", "Temperature"]);
  assert.equal(payload.bundles.find(bundle => bundle.id === "boston").markets[0].outcomes[0].price, 30);
  assert.equal(weatherMarketUrl({ seriesTicker: "KXHIGHPHIL", eventTicker: "KXHIGHPHIL-26AUG02", seriesTitle: "Highest temperature in Philadelphia" }),
    "https://kalshi.com/markets/kxhighphil/highest-temperature-in-philadelphia/kxhighphil-26aug02");
});

test("weather cache refreshes hourly and daily contracts faster than seasonal markets", () => {
  const now = Date.parse("2026-08-02T12:00:00Z");
  assert.equal(weatherPollInterval({ seriesFrequency: "hourly", endsAt: "2026-08-03T12:00:00Z" }, now), 60_000);
  assert.equal(weatherPollInterval({ seriesFrequency: "daily", endsAt: "2026-08-03T12:00:00Z" }, now), 120_000);
  assert.equal(weatherPollInterval({ seriesFrequency: "annual", endsAt: "2027-01-01T00:00:00Z" }, now), 3_600_000);
});

test("discovers the full Climate and Weather category and serves a stale-while-revalidate cache", async () => {
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) { const value = cache.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_WEATHER_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) {
      assert.equal(url.searchParams.get("category"), "Climate and Weather");
      return Response.json({ series: [
        { ticker: "KXHIGHPHIL", title: "Highest temperature in Philadelphia", frequency: "daily", tags: ["Daily temperature"] },
        { ticker: "KXRAIN", title: "Where will it rain daily", frequency: "daily", tags: ["Snow and rain"] }
      ] });
    }
    return Response.json({ events: [
      { event_ticker: "KXHIGHPHIL-26AUG02", series_ticker: "KXHIGHPHIL", title: "Highest temperature in Philadelphia today?", markets: [
        { ticker: "KXHIGHPHIL-26AUG02-B84", yes_sub_title: "84° to 85°", status: "active", last_price_dollars: "0.5200", volume_fp: "1200.00" }
      ] },
      { event_ticker: "KXRAIN-26AUG02", series_ticker: "KXRAIN", title: "Where will it rain today?", markets: [
        { ticker: "KXRAIN-26AUG02-PHIL", yes_sub_title: "Philadelphia", status: "active", last_price_dollars: "0.6100", volume_fp: "800.00" }
      ] }
    ], cursor: "" });
  };
  try {
    const result = await runWeatherPoll(env, Date.parse("2026-08-02T12:00:00Z"));
    assert.equal(result.seriesCount, 2);
    assert.equal(result.bundleCount, 1);
    assert.equal(result.marketCount, 2);
    const cached = JSON.parse(cache.get("kalshi:weather:public:v1"));
    assert.equal(cached.bundles[0].name, "Philadelphia");
    const response = await worker.fetch(new Request("https://example.com/api/weather"), env, { waitUntil() {} });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("warms Politics and Weather from one shared Kalshi event-catalog pass", async () => {
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) { const value = cache.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_SCHEDULED_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const originalFetch = globalThis.fetch;
  let eventCatalogRequests = 0;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) {
      if (url.searchParams.get("category") === "Climate and Weather") {
        return Response.json({ series: [{ ticker: "KXHIGHPHIL", title: "Highest temperature in Philadelphia", frequency: "daily", tags: ["Daily temperature"] }] });
      }
      if (url.searchParams.get("category") === "Elections") {
        return Response.json({ series: [{ ticker: "SENATETX", title: "Texas Senate race", tags: ["US Elections"] }] });
      }
      return Response.json({ series: [{ ticker: "KXHORMUZNORM", title: "Strait of Hormuz traffic", tags: ["International"] }] });
    }
    eventCatalogRequests += 1;
    return Response.json({ events: [
      {
        event_ticker: "SENATETX-26", series_ticker: "SENATETX", title: "Texas Senate winner?", status: "open",
        markets: [
          { ticker: "SENATETX-26-R", yes_sub_title: "Republican Party", last_price_dollars: "0.5400", volume_fp: "4000000.00" },
          { ticker: "SENATETX-26-D", yes_sub_title: "Democratic Party", last_price_dollars: "0.4700", volume_fp: "3000000.00" }
        ]
      },
      {
        event_ticker: "KXHIGHPHIL-26AUG02", series_ticker: "KXHIGHPHIL", title: "Highest temperature in Philadelphia today?", status: "open",
        markets: [{ ticker: "KXHIGHPHIL-26AUG02-B84", yes_sub_title: "84° to 85°", last_price_dollars: "0.5200", volume_fp: "1200.00" }]
      }
    ], cursor: "" });
  };
  try {
    const result = await runGeographicPoll(env, Date.parse("2026-08-02T12:00:00Z"));
    assert.equal(result.discoveryDue, true);
    assert.equal(eventCatalogRequests, 1, "Politics and Weather must share one open-events scan");
    assert.equal(result.politics.bundleCount, 1);
    assert.equal(result.weather.bundleCount, 1);
    const politicsPayload = JSON.parse(cache.get("kalshi:politics:public:v1"));
    assert.equal(politicsPayload.bundles[0].jurisdiction, "Texas");
    assert.equal(politicsPayload.bundles[0].markets[0].url, "https://kalshi.com/markets/senatetx/texas-senate-race/senatetx-26");
    assert.equal(JSON.parse(cache.get("kalshi:weather:public:v1")).bundles[0].name, "Philadelphia");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("interprets colloquial market queries into category, sport, time, and ranking intent", () => {
  const now = new Date("2026-08-01T16:00:00-04:00").getTime();
  assert.deepEqual(interpretMarketQuery("show me the biggest soccer markets this weekend", now), {
    query: "show me the biggest soccer markets this weekend",
    category: "sports",
    requiredTags: ["soccer"],
    sort: "volume",
    timing: { start: "2026-08-01", end: "2026-08-02", label: "this weekend" },
    liveOnly: false,
    yearIntent: null,
    terms: []
  });
  const politics = interpretMarketQuery("what are the closest Senate races?", now);
  assert.equal(politics.category, "politics");
  assert.equal(politics.sort, "close");
  assert.deepEqual(politics.terms, ["senate"]);
  const mls = interpretMarketQuery("show me MLS games", now);
  assert.equal(mls.category, "sports");
  assert.deepEqual(mls.requiredTags, ["soccer", "mls"]);
  assert.deepEqual(mls.terms, []);
});

test("searches cached Sports and Politics markets with prices and conversational ranking", () => {
  const now = new Date("2026-08-01T16:00:00-04:00").getTime();
  const market = (ticker, label, lastPrice, volume) => ({ ticker, label, lastPrice, volume, status: "active" });
  const sports = { events: [
    {
      eventTicker: "KXMLBGAME-26AUG012000BOSLAD", seriesTicker: "KXMLBGAME",
      title: "Boston Red Sox at Los Angeles Dodgers", startsAt: "2026-08-02T00:00:00.000Z", endsAt: "2026-08-02T04:00:00.000Z",
      status: "active", volume: 900000, markets: [market("KXMLBGAME-26AUG012000BOSLAD-LAD", "Los Angeles Dodgers", 64, 500000), market("KXMLBGAME-26AUG012000BOSLAD-BOS", "Boston Red Sox", 36, 400000)]
    },
    {
      eventTicker: "KXEPLGAME-26AUG02ARSNEW", seriesTicker: "KXEPLGAME", title: "Arsenal vs Newcastle",
      startsAt: "2026-08-02T15:00:00.000Z", endsAt: "2026-08-02T17:00:00.000Z", status: "active", volume: 1200000,
      markets: [market("KXEPLGAME-26AUG02ARSNEW-ARS", "Arsenal", 58, 700000), market("KXEPLGAME-26AUG02ARSNEW-NEW", "Newcastle", 42, 500000)]
    },
    {
      eventTicker: "KXMLSGAME-26AUG02MIAORL", seriesTicker: "KXMLSGAME", title: "Inter Miami vs Orlando City",
      startsAt: "2026-08-02T23:30:00.000Z", endsAt: "2026-08-03T02:00:00.000Z", status: "active", volume: 600000,
      markets: [market("KXMLSGAME-26AUG02MIAORL-MIA", "Inter Miami", 61, 350000), market("KXMLSGAME-26AUG02MIAORL-ORL", "Orlando City", 39, 250000)]
    }
  ] };
  const politics = { bundles: [
    { id: "us-mi", jurisdiction: "Michigan", capital: "Lansing", scope: "Statewide", dateKey: "2026-11-03", markets: [
      { eventTicker: "SENATEMI-26", seriesTicker: "SENATEMI", title: "Michigan Senate winner?", office: "Senate", stage: "general", volume: 700000,
        seriesTitle: "Michigan Senate race", seriesSlug: "michigan-senate-race",
        url: "https://kalshi.com/markets/senatemi/michigan-senate-race/senatemi-26", outcomes: [{ name: "Democratic", price: 51, volume: 400000 }, { name: "Republican", price: 49, volume: 300000 }] }
    ] },
    { id: "us-oh", jurisdiction: "Ohio", capital: "Columbus", scope: "Statewide", dateKey: "2026-11-03", markets: [
      { eventTicker: "SENATEOH-26", seriesTicker: "SENATEOH", title: "Ohio Senate winner?", office: "Senate", stage: "general", volume: 800000,
        outcomes: [{ name: "Republican", price: 72, volume: 500000 }, { name: "Democratic", price: 28, volume: 300000 }] }
    ] }
  ] };

  const dodgers = searchMarkets("Dodgers tonight", { sports, politics }, { now });
  assert.equal(dodgers.results[0].eventTicker, "KXMLBGAME-26AUG012000BOSLAD");
  assert.deepEqual(dodgers.results[0].outcomes.map(outcome => outcome.name), ["Los Angeles Dodgers", "Boston Red Sox"]);
  const soccer = searchMarkets("biggest soccer markets this weekend", { sports, politics }, { now });
  assert.equal(soccer.results[0].eventTicker, "KXEPLGAME-26AUG02ARSNEW");
  const mls = searchMarkets("MLS games", { sports, politics }, { now });
  assert.equal(mls.results[0].eventTicker, "KXMLSGAME-26AUG02MIAORL");
  const allSports = searchMarkets("sports", { sports, politics }, { now });
  assert.deepEqual(allSports.results.map(result => result.volume), [1200000, 900000, 600000], "ordinary market search ranks matching markets by volume");
  const senate = searchMarkets("close Senate races", { sports, politics }, { now });
  assert.deepEqual(senate.results.map(result => result.bundleId), ["us-mi", "us-oh"]);
  assert.equal(
    senate.results[0].url,
    "https://kalshi.com/markets/senatemi/michigan-senate-race/senatemi-26",
    "search preserves the canonical URL stored with the cached market"
  );
  const malformed = searchMarkets("biggest markets", { sports: { events: [{
    eventTicker: "KXBADDATE-26", seriesTicker: "KXBADDATE", title: "Market with unavailable date", startsAt: "not-a-date",
    volume: 10, markets: [market("KXBADDATE-26-YES", "Yes", 50, 10)]
  }] } }, { now });
  assert.equal(malformed.results[0].eventTicker, "KXBADDATE-26");
});

test("search spans Weather and uses location navigation without overriding explicit market intent", () => {
  const sports = { events: [
    {
      eventTicker: "KXMLBGAME-26AUG012000BOSLAD", seriesTicker: "KXMLBGAME",
      title: "Boston vs Los Angeles D", startsAt: "2026-08-02T00:00:00.000Z", status: "active", volume: 900000,
      markets: [
        { ticker: "KXMLBGAME-26AUG012000BOSLAD-BOS", label: "Boston", lastPrice: 36, volume: 400000, status: "active" },
        { ticker: "KXMLBGAME-26AUG012000BOSLAD-LAD", label: "Los Angeles D", lastPrice: 64, volume: 500000, status: "active" }
      ]
    },
    {
      eventTicker: "KXMLBKS-26AUG012000BOSLAD", seriesTicker: "KXMLBKS",
      title: "Boston vs Los Angeles D: Strikeouts", startsAt: "2026-08-02T00:00:00.000Z", status: "active", volume: 12000,
      markets: [
        { ticker: "KXMLBKS-26AUG012000BOSLAD-LADPITCHER-7", label: "Starting pitcher: 7+", lastPrice: 41, volume: 12000, status: "active" }
      ]
    }
  ] };
  const weather = { bundles: [{
    id: "boston", name: "Boston", location: "Boston, Massachusetts", lat: 42.3601, lon: -71.0589, kind: "Rain & Snow", horizon: "Today",
    markets: [{
      id: "KXRAIN-26AUG02-BOS", eventTicker: "KXRAIN-26AUG02", seriesTicker: "KXRAIN",
      title: "Will it rain in Boston on Aug 2?", kind: "Rain & Snow", horizon: "Today", volume: 12000,
      outcomes: [{ name: "Yes", price: 41, volume: 7000 }, { name: "No", price: 59, volume: 5000 }]
    }]
  }] };

  const weatherMarket = searchMarkets("rain in Boston", { sports, weather }, { activeCategory: "sports" });
  assert.equal(weatherMarket.results[0].category, "weather");
  assert.equal(weatherMarket.results[0].type, "weather");

  const currentTabLocation = searchMarkets("Boston", { sports, weather }, { activeCategory: "weather" });
  assert.equal(currentTabLocation.results[0].type, "location");
  assert.equal(currentTabLocation.results[0].category, "weather");
  assert.equal(currentTabLocation.results[0].lat, 42.3601);

  const explicitCrossTabLocation = searchMarkets("Boston sports", { sports, weather }, { activeCategory: "weather" });
  assert.equal(explicitCrossTabLocation.results[0].type, "location");
  assert.equal(explicitCrossTabLocation.results[0].category, "sports");

  const explicitTeam = searchMarkets("Boston Red Sox", { sports, weather }, { activeCategory: "weather" });
  assert.equal(explicitTeam.results[0].type, "event");
  assert.equal(explicitTeam.results[0].category, "sports");

  const nicknameTeam = searchMarkets("Dodgers", { sports, weather }, { activeCategory: "weather" });
  assert.equal(nicknameTeam.results[0].eventTicker, "KXMLBGAME-26AUG012000BOSLAD");
  assert.equal(nicknameTeam.results[0].title, "Boston Red Sox vs Los Angeles Dodgers");
  assert.equal(nicknameTeam.results[0].outcomes[0].name, "Los Angeles Dodgers");

  const nicknameProp = searchMarkets("Dodgers strikeouts", { sports, weather }, { activeCategory: "politics" });
  assert.equal(nicknameProp.results[0].eventTicker, "KXMLBKS-26AUG012000BOSLAD");

  const dcPolitics = { bundles: [{
    id: "us", jurisdiction: "United States", capital: "Washington, D.C.", dateKey: "2028-11-07",
    markets: [{ eventTicker: "KXPRESPERSON-28", seriesTicker: "KXPRESPERSON", title: "2028 U.S. Presidential Election winner?", volume: 1000000,
      outcomes: [{ name: "Candidate A", price: 50, volume: 500000 }, { name: "Candidate B", price: 50, volume: 500000 }] }]
  }] };
  const meaningfulPrefixOnly = searchMarkets("Dodgers", { sports, politics: dcPolitics }, { activeCategory: "politics" });
  assert.ok(meaningfulPrefixOnly.results.length > 0);
  assert.ok(meaningfulPrefixOnly.results.every(result => result.category === "sports"), "one-letter place tokens must not pollute another category");
});

test("expands team abbreviations consistently across major team sports", () => {
  assert.equal(canonicalSportsMatchupTitle("NFL · NE at SEA", { sport: "NFL" }),
    "NFL · New England Patriots at Seattle Seahawks");
  assert.equal(canonicalSportsMatchupTitle("Arizona St vs Pitt", { sport: "CFB" }),
    "Arizona State vs Pittsburgh");
  assert.equal(canonicalSportsOutcomeName("Los Angeles L", {
    seriesTicker: "KXNBAGAME", ticker: "KXNBAGAME-26OCT06LALGSW-LAL"
  }), "Los Angeles Lakers");
  assert.equal(canonicalSportsOutcomeName("New York R", {
    seriesTicker: "KXNHLGAME", ticker: "KXNHLGAME-26SEP29NYRBOS-NYR"
  }), "New York Rangers");
  assert.equal(canonicalSportsOutcomeName("MI", {
    seriesTicker: "KXIPLGAME", ticker: "KXIPLGAME-26APR201400MIGT-MI"
  }), "Mumbai Indians");
});

test("serves cached colloquial search without polling Kalshi", async () => {
  const sports = { generatedAt: "2026-08-02T12:00:00.000Z", events: [{
    eventTicker: "KXNFLGAME-26SEP10DALPHI", seriesTicker: "KXNFLGAME", title: "Dallas at Philadelphia",
    startsAt: "2026-09-11T00:00:00.000Z", endsAt: "2026-09-11T04:00:00.000Z", status: "active", volume: 400000,
    markets: [
      { ticker: "KXNFLGAME-26SEP10DALPHI-DAL", label: "Dallas", lastPrice: 44, volume: 170000, status: "active" },
      { ticker: "KXNFLGAME-26SEP10DALPHI-PHI", label: "Philadelphia Eagles", lastPrice: 57, volume: 230000, status: "active" }
    ]
  }] };
  const kv = { async get(key) { return key === "kalshi:sports:public:v2" ? sports : null; } };
  const response = await worker.fetch(new Request("https://example.com/api/search?q=Eagles%20game&limit=5"), { MARKET_ATLAS_CACHE: kv }, {});
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.results[0].eventTicker, "KXNFLGAME-26SEP10DALPHI");
  assert.equal(payload.results[0].outcomes[0].price, 57);
});

test("maps actual major election series to capitals and rejects adjacent political markets", () => {
  const texas = classifyPoliticsEvent({
    eventTicker: "SENATELA-26", seriesTicker: "SENATELA", title: "Kentucky Senate winner?", subtitle: "2026"
  });
  assert.equal(texas.jurisdiction, "Kentucky", "the title, not a potentially misleading ticker suffix, determines the state");
  assert.equal(texas.capital, "Frankfort");
  assert.equal(texas.office, "Senate");
  assert.equal(classifyPoliticsEvent({ eventTicker: "SENATETXPRIMARY-26", seriesTicker: "SENATETXPRIMARY", title: "Texas Senate primary winner?", subtitle: "2026" }), null);
  assert.equal(classifyPoliticsEvent({ eventTicker: "KXTRUMPAPPROVAL-26", seriesTicker: "KXTRUMPAPPROVAL", title: "Trump approval rating" }), null);
  const michiganPrimary = classifyPoliticsEvent({
    eventTicker: "KXSENATEMID-26", seriesTicker: "KXSENATEMID", title: "Michigan Democratic Senate nominee?"
  });
  assert.deepEqual(
    [michiganPrimary.jurisdiction, michiganPrimary.capital, michiganPrimary.office, michiganPrimary.stage],
    ["Michigan", "Lansing", "Senate", "primary"]
  );
  assert.equal(classifyPoliticsEvent({
    eventTicker: "KXPRIMARYMOV-SENATEMIR26", seriesTicker: "KXPRIMARYMOV", title: "Michigan Republican Senate primary: margin of victory"
  }), null, "primary derivatives do not become candidate-winner cards");

  const brazil = classifyPoliticsEvent({ eventTicker: "KXBRPRES-26", seriesTicker: "KXBRPRES", title: "Brazil Presidential election winner?" });
  assert.deepEqual([brazil.jurisdiction, brazil.capital, brazil.dateKey], ["Brazil", "Brasília", "2026-10-04"]);
  assert.equal(classifyPoliticsEvent({ eventTicker: "KXFRENCHPRES-27", seriesTicker: "KXFRENCHPRES", title: "Next French Presidential Election Winner?" }).capital, "Paris");
  assert.equal(politicsParty("Republican Party"), "R");
  assert.equal(politicsParty("Roy Cooper"), "D");
  assert.equal(politicsParty("Who will win the 2026 CA-04 House election? Mike Thompson"), "D");
  assert.equal(politicsParty("Kurt Alme", "SENATEMT-26-R"), "R");
  assert.equal(politicsParty("Alani Bankhead", "SENATEMT-26-D"), "D");
  assert.equal(politicsParty("Independent candidate", "SENATEMT-26-I"), "N");
  assert.equal(resolvePoliticalLocation("Will the US issue a warning for Taiwan?").jurisdiction, "Taiwan");
  assert.equal(resolvePoliticalLocation("Will Spain or France act first?"), null, "multi-country titles require a manual location");

  const hormuz = classifyPoliticsEvent({
    eventTicker: "KXHORMUZNORM-27", seriesTicker: "KXHORMUZNORM",
    title: "When will traffic at the Strait of Hormuz return to normal?", seriesTitle: "Strait of Hormuz traffic",
    politicsTags: ["International"]
  });
  assert.deepEqual([hormuz.jurisdiction, hormuz.capital, hormuz.office], ["Strait of Hormuz", "Strait of Hormuz", "International"]);
});

test("adds both parties' nominee markets only for major Senate-primary states", () => {
  const candidate = (ticker, label, lastPrice, volume) => ({ ticker, label, title: label, lastPrice, volume, status: "active" });
  const snapshots = [
    {
      eventTicker: "SENATEMI-26", seriesTicker: "SENATEMI", title: "Michigan Senate winner?", volume: 100_000,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [
        candidate("SENATEMI-26-D", "Democratic party", 54, 60_000),
        candidate("SENATEMI-26-R", "Republican party", 46, 40_000)
      ]
    },
    {
      eventTicker: "KXSENATEMID-26", seriesTicker: "KXSENATEMID", title: "Michigan Democratic Senate nominee?", volume: 30_000,
      seriesTitle: "MID",
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [candidate("KXSENATEMID-26-AELS", "Abdul El-Sayed", 75, 30_000)]
    },
    {
      eventTicker: "KXSENATEMIR-26", seriesTicker: "KXSENATEMIR", title: "Michigan Republican Senate nominee?", volume: 15_000,
      seriesTitle: "MIR",
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [candidate("KXSENATEMIR-26-MROG", "Mike Rogers", 95, 15_000)]
    },
    {
      eventTicker: "KXSENATEVAR-26", seriesTicker: "KXSENATEVAR", title: "Virginia Republican Senate nominee?", volume: 39_999,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [candidate("KXSENATEVAR-26-BMIZ", "Bert Mizusawa", 84, 39_999)]
    }
  ];
  const payload = buildPoliticsPublicSnapshot(snapshots, Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(payload.bundleCount, 1, "sub-threshold primary states stay off the globe");
  assert.equal(payload.bundles[0].jurisdiction, "Michigan");
  assert.deepEqual(payload.bundles[0].markets.map(market => market.stage), ["general", "primary", "primary"]);
  assert.equal(payload.bundles[0].leaderParty, "D", "the general election, not a primary party, controls marker color");
  assert.equal(payload.bundles[0].markets[1].outcomes[0].party, "D");
  assert.equal(payload.bundles[0].markets[2].outcomes[0].party, "R");
  assert.equal(
    payload.bundles[0].markets[1].url,
    "https://kalshi.com/markets/kxsenatemid/mid/kxsenatemid-26"
  );
});

test("tags every party-coded Senate outcome and colors from the party race", () => {
  const candidate = (ticker, label, lastPrice, volume) => ({
    ticker, label, title: label, lastPrice, volume, status: "active"
  });
  const snapshots = [
    {
      eventTicker: "KXAKSENATE-26NOV03", seriesTicker: "KXAKSENATE", title: "Alaska Senate winner?", volume: 500_000,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [
        candidate("KXAKSENATE-26NOV03-PELT", "Mary Peltola", 57, 280_000),
        candidate("KXAKSENATE-26NOV03-SULL", "Dan Sullivan", 45, 220_000)
      ]
    },
    {
      eventTicker: "SENATEAK-26", seriesTicker: "SENATEAK", title: "Alaska Senate winner?", volume: 200_000,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [
        candidate("SENATEAK-26-D", "Mary Peltola", 55, 110_000),
        candidate("SENATEAK-26-R", "Dan Sullivan", 45, 90_000)
      ]
    },
    {
      eventTicker: "SENATEKS-26", seriesTicker: "SENATEKS", title: "Kansas Senate winner?", volume: 100_000,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [
        candidate("SENATEKS-26-R", "Roger Marshall", 82, 82_000),
        candidate("SENATEKS-26-D", "Adam Hamilton", 18, 18_000)
      ]
    },
    {
      eventTicker: "SENATEMT-26", seriesTicker: "SENATEMT", title: "Montana Senate winner?", volume: 100_000,
      updatedAt: "2026-08-01T12:00:00.000Z", markets: [
        candidate("SENATEMT-26-R", "Kurt Alme", 84, 84_000),
        candidate("SENATEMT-26-I", "Seth Bodnar", 15, 15_000),
        candidate("SENATEMT-26-D", "Alani Bankhead", 1, 1_000)
      ]
    }
  ];
  const payload = buildPoliticsPublicSnapshot(snapshots, Date.parse("2026-08-01T12:00:00Z"));
  const alaska = payload.bundles.find(bundle => bundle.jurisdiction === "Alaska");
  const alaskaPartyMarket = alaska.markets.find(market => market.eventTicker === "SENATEAK-26");
  assert.deepEqual(alaskaPartyMarket.outcomes.map(outcome => outcome.party), ["D", "R"]);
  assert.equal(alaska.leaderParty, "D", "a higher-volume person market must not displace the canonical party race");
  assert.equal(payload.bundles.find(bundle => bundle.jurisdiction === "Kansas").leaderParty, "R");
  assert.equal(payload.bundles.find(bundle => bundle.jurisdiction === "Montana").leaderParty, "R");
});

test("maps every congressional district and marks House races as a deep-zoom layer", () => {
  assert.equal(HOUSE_DISTRICT_CENTROIDS.size, 435);
  const kansasThird = classifyPoliticsEvent({
    eventTicker: "KXHOUSERACE-KS03-26",
    seriesTicker: "KXHOUSERACE",
    title: "KS-03 House winner?"
  });
  assert.deepEqual(
    [kansasThird.jurisdiction, kansasThird.code, kansasThird.office, kansasThird.scope],
    ["Kansas 3rd District", "KS3", "Congress", "Congressional district"]
  );
  assert.equal(kansasThird.minZoomScale, HOUSE_RACE_MIN_SCALE);
  assert.equal(HOUSE_RACE_MIN_SCALE, 4000, "every House race is reachable inside the integrated globe's regional zoom range");
  assert.ok(kansasThird.lon < -94 && kansasThird.lat > 37);

  const alaska = classifyPoliticsEvent({
    eventTicker: "KXHOUSERACE-AKAL-26",
    seriesTicker: "KXHOUSERACE",
    title: "AK-AL House winner?"
  });
  assert.equal(alaska.jurisdiction, "Alaska At-Large District");

  const payload = buildPoliticsPublicSnapshot([{
    eventTicker: "KXHOUSERACE-KS03-26", seriesTicker: "KXHOUSERACE", title: "KS-03 House winner?",
    volume: 1000, updatedAt: "2026-08-01T12:00:00.000Z", markets: []
  }], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(payload.bundles[0].minZoomScale, HOUSE_RACE_PREVIEW_MIN_SCALE);
  assert.equal(houseRaceRevealScale(0, 100), 1600);
  assert.equal(houseRaceRevealScale(10, 100), 1600);
  assert.equal(houseRaceRevealScale(20, 100), 2200);
  assert.equal(houseRaceRevealScale(50, 100), 3000);
  assert.equal(houseRaceRevealScale(80, 100), HOUSE_RACE_MIN_SCALE);
  const cachedHouseBundles = Array.from({ length: 100 }, (_, index) => ({
    id: `cached-house-${index}`,
    scope: "Congressional district",
    minZoomScale: 5400
  }));
  applyHouseRaceRevealScales(cachedHouseBundles);
  assert.deepEqual(
    [cachedHouseBundles[0], cachedHouseBundles[20], cachedHouseBundles[50], cachedHouseBundles[80]].map(bundle => bundle.minZoomScale),
    [1600, 2200, 3000, 4000],
    "stale cached payloads migrate to the current progressive reveal tiers"
  );
  assert.equal(
    politicsMarketUrl("KXHOUSERACE-PA15-26", "KXHOUSERACE"),
    "https://kalshi.com/markets/kxhouserace/house-race-winner/kxhouserace-pa15-26"
  );

  const californiaThird = classifyPoliticsEvent({
    eventTicker: "HOUSECA3-26",
    seriesTicker: "HOUSECA3",
    title: "CA-03 House winner?"
  });
  assert.deepEqual(
    [californiaThird.jurisdiction, californiaThird.code, californiaThird.scope],
    ["California 3rd District", "CA3", "Congressional district"]
  );
  assert.equal(californiaThird.minZoomScale, HOUSE_RACE_MIN_SCALE);
  assert.equal(
    politicsMarketUrl("HOUSECA3-26", "HOUSECA3"),
    "https://kalshi.com/markets/houseca3/house-ca3/houseca3-26"
  );

  const missouriFifth = classifyPoliticsEvent({
    eventTicker: "KXHOUSEMO5-26",
    seriesTicker: "KXHOUSEMO5",
    title: "MO-05 House winner?"
  });
  assert.deepEqual(
    [missouriFifth.jurisdiction, missouriFifth.code, missouriFifth.scope],
    ["Missouri 5th District", "MO5", "Congressional district"]
  );
  assert.equal(
    politicsMarketUrl("KXHOUSEMO5-26", "KXHOUSEMO5"),
    "https://kalshi.com/markets/kxhousemo5/house-mo5/kxhousemo5-26"
  );

  const californiaFourth = classifyPoliticsEvent({
    eventTicker: "KXCAELECTION-2604",
    seriesTicker: "KXCAELECTION",
    title: "CA-04 House winner?"
  });
  assert.deepEqual(
    [californiaFourth.jurisdiction, californiaFourth.code, californiaFourth.scope],
    ["California 4th District", "CA4", "Congressional district"]
  );
  assert.equal(
    politicsMarketUrl("KXCAELECTION-2604", "KXCAELECTION"),
    "https://kalshi.com/markets/kxcaelection/california-general-elections-/kxcaelection-2604"
  );
  assert.equal(
    politicsMarketUrl({ eventTicker: "KXCAELECTION-2604", seriesTicker: "KXCAELECTION", seriesSlug: "california-general-elections-" }),
    "https://kalshi.com/markets/kxcaelection/california-general-elections-/kxcaelection-2604",
    "stored canonical slugs retain Kalshi's significant trailing hyphen"
  );
  assert.equal(
    politicsMarketUrl("KXCA11PERSON-26", "KXCA11PERSON"),
    "https://kalshi.com/markets/kxca11person/ca11-house-winner-person/kxca11person-26"
  );
  assert.equal(
    politicsMarketUrl("KXPOPEVISIT-27JAN01", "KXPOPEVISIT"),
    "https://kalshi.com/markets/kxpopevisit/what-countries-will-pope-leo-visit-before-2027/kxpopevisit-27jan01",
    "the stored series slug and exact event ticker produce Kalshi's canonical page"
  );
});

test("uses Kalshi House party metadata for marker color and canonical event links", () => {
  const snapshot = normalizeEvent({
    event_ticker: "KXHOUSERACE-PA15-26", series_ticker: "KXHOUSERACE", title: "PA-15 House winner?"
  }, [
    {
      ticker: "KXHOUSERACE-PA15-26-D", yes_sub_title: "Ray Bilger",
      subtitle: "Democratic party:: Democratic party", title: "Will Democratic win the House race for PA-15?",
      last_price_dollars: "0.0700", volume_fp: "239.00", status: "active"
    },
    {
      ticker: "KXHOUSERACE-PA15-26-R", yes_sub_title: "Glenn Thompson",
      subtitle: "Republican party:: Republican party", title: "Will Republican win the House race for PA-15?",
      last_price_dollars: "0.9250", volume_fp: "7570.05", status: "active"
    }
  ], Date.parse("2026-08-01T12:00:00Z"));
  const payload = buildPoliticsPublicSnapshot([snapshot], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(payload.bundles[0].leaderParty, "R");
  assert.equal(payload.bundles[0].leaderPrice, 92.5);
  assert.deepEqual(payload.bundles[0].markets[0].outcomes.map(outcome => outcome.party), ["R", "D"]);
  assert.equal(payload.bundles[0].markets[0].url, "https://kalshi.com/markets/kxhouserace/house-race-winner/kxhouserace-pa15-26");

  const california = normalizeEvent({
    event_ticker: "KXCAELECTION-2604", series_ticker: "KXCAELECTION", title: "CA-04 House winner?"
  }, [
    { ticker: "KXCAELECTION-2604-MTHO", title: "Who will win the 2026 CA-04 House election?", yes_sub_title: "Mike Thompson", status: "active", last_price_dollars: "0.7600", volume_fp: "19265.25" },
    { ticker: "KXCAELECTION-2604-EJON", title: "Who will win the 2026 CA-04 House election?", yes_sub_title: "Eric Jones", status: "active", last_price_dollars: "0.2200", volume_fp: "6711.88" },
    { ticker: "KXCAELECTION-2604-OLD", yes_sub_title: "Withdrawn candidate", status: "finalized", last_price_dollars: "0.9900", volume_fp: "1.00" }
  ], Date.parse("2026-08-01T12:00:00Z"));
  const californiaPayload = buildPoliticsPublicSnapshot([california], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(californiaPayload.bundles[0].code, "CA4");
  assert.equal(californiaPayload.bundles[0].leaderParty, "D");
  assert.equal(californiaPayload.bundles[0].leaderPrice, 76);
  assert.equal(californiaPayload.bundles[0].markets[0].outcomes.length, 2, "finalized candidate contracts stay out of live prices");
});

test("applies manual politics locations, duplicates multi-country events, and follows the five highest leader prices", () => {
  const market = (label, lastPrice) => ({ label, lastPrice, volume: 100 });
  assert.deepEqual(
    classifyPoliticsLocations({ seriesTicker: "KXZELENSKYPUTIN" }).map(location => location.capital),
    ["Moscow", "Kyiv"]
  );
  assert.equal(classifyPoliticsLocations({ seriesTicker: "KXG7LEADEROUT" }).length, 7);

  const leaderLocations = classifyPoliticsLocations({
    eventTicker: "KXLEADERSOUT-27JAN01",
    seriesTicker: "KXLEADERSOUT",
    markets: [
      market("Benjamin Netanyahu", 44), market("Volodymyr Zelenskyy", 8), market("Keir Starmer", 99),
      market("Gustavo Petro", 98), market("Aleksandar Vučić", 94), market("Christopher Luxon", 47),
      market("Emmanuel Macron", 11), market("Narendra Modi", 1)
    ]
  });
  assert.deepEqual(
    leaderLocations.map(location => location.jurisdiction),
    ["United Kingdom", "Colombia", "Serbia", "New Zealand", "Israel", "India"]
  );

  const duplicate = {
    eventTicker: "KXZELENSKYPUTIN-26",
    seriesTicker: "KXZELENSKYPUTIN",
    title: "Will Zelenskyy and Putin speak?",
    volume: 1_000,
    updatedAt: "2026-08-01T12:00:00.000Z",
    markets: [market("Yes", 50)]
  };
  const payload = buildPoliticsPublicSnapshot([duplicate], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(payload.bundleCount, 2);
  assert.equal(payload.marketCount, 1, "the same multi-location market is counted once globally");
  assert.deepEqual(payload.bundles.map(bundle => bundle.capital).sort(), ["Kyiv", "Moscow"]);
});

test("maps all ten African leader risks and keeps India outcomes visible", () => {
  const market = (ticker, label, lastPrice, volume = 100) => ({ ticker, label, lastPrice, volume, status: "active" });
  const africa = {
    eventTicker: "KXAFRICALEADEROUT-35",
    seriesTicker: "KXAFRICALEADEROUT",
    title: "Which of these African leaders will leave office next?",
    volume: 22_551,
    updatedAt: "2026-08-03T12:00:00.000Z",
    markets: [
      market("KXAFRICALEADEROUT-35-BT", "Bola Tinubu", 38),
      market("KXAFRICALEADEROUT-35-EM", "Emmerson Mnangagwa", 18),
      market("KXAFRICALEADEROUT-35-WR", "William Ruto", 17),
      market("KXAFRICALEADEROUT-35-CR", "Cyril Ramaphosa", 8),
      market("KXAFRICALEADEROUT-35-AFES", "Abdel Fattah El-Sisi", 7),
      market("KXAFRICALEADEROUT-35-JM", "John Mahama", 6),
      market("KXAFRICALEADEROUT-35-AT", "Abdelmadjid Tebboune", 5),
      market("KXAFRICALEADEROUT-35-PK", "Paul Kagame", 4),
      market("KXAFRICALEADEROUT-35-FT", "Félix Tshisekedi", 3),
      market("KXAFRICALEADEROUT-35-TAS", "Taye Atske Selassie", 2)
    ]
  };
  const africaLocations = classifyPoliticsLocations(africa);
  assert.deepEqual(
    africaLocations.map(location => location.capital),
    ["Abuja", "Harare", "Nairobi", "Pretoria", "Cairo", "Accra", "Algiers", "Kigali", "Kinshasa", "Addis Ababa"]
  );
  const africaPayload = buildPoliticsPublicSnapshot([africa], Date.parse("2026-08-03T12:00:00Z"));
  assert.equal(africaPayload.bundleCount, 10);
  assert.ok(africaPayload.bundles.every(bundle => bundle.markets[0].outcomes.length === 1));
  assert.equal(
    africaPayload.bundles[0].markets[0].url,
    "https://kalshi.com/markets/kxafricaleaderout/next-african-leader-out/kxafricaleaderout-35"
  );

  const india = {
    eventTicker: "KXFTACOUNTRIES-27",
    seriesTicker: "KXFTACOUNTRIES",
    title: "Which countries will Trump make formal trade deals with this year?",
    volume: 7_673,
    updatedAt: "2026-08-03T12:00:00.000Z",
    markets: [
      market("KXFTACOUNTRIES-27-IND", "India", 21),
      market("KXFTACOUNTRIES-27-JPN", "Japan", 13)
    ]
  };
  const indiaPayload = buildPoliticsPublicSnapshot([india], Date.parse("2026-08-03T12:00:00Z"));
  assert.equal(indiaPayload.bundleCount, 1);
  assert.equal(indiaPayload.bundles[0].capital, "New Delhi");
  assert.deepEqual(indiaPayload.bundles[0].markets[0].outcomes.map(outcome => outcome.name), ["India"]);
});

test("invalidates stale politics geography so the African leader market leaves the unmapped cache", async () => {
  const now = Date.parse("2026-08-03T20:30:00Z");
  const cache = new Map([["kalshi:politics:state:v1", JSON.stringify({
    registryVersion: 1,
    lastDiscoveryAt: now,
    events: { "OLD-MAPPED": { eventTicker: "OLD-MAPPED", updatedAt: new Date(now).toISOString() } },
    unmapped: [{ eventTicker: "KXAFRICALEADEROUT-35", seriesTicker: "KXAFRICALEADEROUT" }]
  })]]);
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_POLITICS_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const originalFetch = globalThis.fetch;
  let eventCatalogRequests = 0;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) return Response.json({
      series: [{ ticker: "KXAFRICALEADEROUT", title: "Next African leader out", tags: ["International"] }]
    });
    eventCatalogRequests += 1;
    return Response.json({ events: [{
      event_ticker: "KXAFRICALEADEROUT-35",
      series_ticker: "KXAFRICALEADEROUT",
      title: "Which of these African leaders will leave office next?",
      status: "open",
      markets: [
        { ticker: "KXAFRICALEADEROUT-35-BT", yes_sub_title: "Bola Tinubu", last_price_dollars: "0.3800", volume_fp: "12000.00", status: "active" },
        { ticker: "KXAFRICALEADEROUT-35-CR", yes_sub_title: "Cyril Ramaphosa", last_price_dollars: "0.0970", volume_fp: "4000.00", status: "active" },
        { ticker: "KXAFRICALEADEROUT-35-JM", yes_sub_title: "John Mahama", last_price_dollars: "0.0890", volume_fp: "3000.00", status: "active" },
        { ticker: "KXAFRICALEADEROUT-35-WR", yes_sub_title: "William Ruto", last_price_dollars: "0.0800", volume_fp: "2000.00", status: "active" },
        { ticker: "KXAFRICALEADEROUT-35-EM", yes_sub_title: "Emmerson Mnangagwa", last_price_dollars: "0.0700", volume_fp: "1000.00", status: "active" }
      ]
    }], cursor: "" });
  };
  try {
    const result = await runPoliticsPoll(env, now);
    assert.equal(result.discoveryDue, true, "a registry change must bypass a recent KV discovery timestamp");
    assert.equal(eventCatalogRequests, 1);
    const state = JSON.parse(cache.get("kalshi:politics:state:v1"));
    assert.equal(state.registryVersion, 4);
    assert.ok(state.events["KXAFRICALEADEROUT-35"]);
    assert.ok(!state.unmapped.some(event => event.eventTicker === "KXAFRICALEADEROUT-35"));
    const publicData = JSON.parse(cache.get("kalshi:politics:public:v1"));
    assert.deepEqual(publicData.bundles.map(bundle => bundle.capital), ["Abuja", "Pretoria", "Accra", "Nairobi", "Harare"]);
    assert.ok(publicData.bundles.every(bundle => bundle.markets[0].url.endsWith("/kxafricaleaderout-35")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps each actual election event as a separate market card with party-aware outcomes", () => {
  const snapshot = (seriesTicker, eventTicker, title, markets, volume) => ({
    seriesTicker, eventTicker, title, subtitle: "", volume, updatedAt: "2026-08-01T12:00:00.000Z", markets
  });
  const market = (ticker, label, price, volume) => ({ ticker, label, lastPrice: price, yesBid: price - 1, yesAsk: price + 1, volume });
  const payload = buildPoliticsPublicSnapshot([
    snapshot("CONTROLH", "CONTROLH-2026", "Which party will win the U.S. House?", [
      market("CONTROLH-2026-D", "Democratic Party", 84, 12_000_000), market("CONTROLH-2026-R", "Republican Party", 17, 7_000_000)
    ], 19_000_000),
    snapshot("CONTROLS", "CONTROLS-2026", "Which party will win the U.S. Senate?", [
      market("CONTROLS-2026-D", "Democratic Party", 47, 3_000_000), market("CONTROLS-2026-R", "Republican Party", 55, 3_000_000)
    ], 6_000_000)
  ], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(payload.bundleCount, 1);
  assert.equal(payload.marketCount, 2);
  assert.deepEqual(payload.bundles[0].markets.map(item => item.eventTicker), ["CONTROLH-2026", "CONTROLS-2026"]);
  assert.equal(payload.bundles[0].markets[0].outcomes[0].party, "D");
  assert.equal(payload.bundles[0].leaderParty, "D");
});

test("discovers, validates, caches, and serves live politics markets server-side", async () => {
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_POLITICS_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) {
      if (url.searchParams.get("category") === "Elections") {
        return Response.json({ series: [{ ticker: "SENATETX", title: "Texas Senate race", tags: ["US Elections"] }] });
      }
      return Response.json({ series: [{ ticker: "KXHORMUZNORM", title: "Strait of Hormuz traffic", tags: ["International"] }] });
    }
    assert.ok(url.pathname.endsWith("/events"));
    return Response.json({ events: [
      {
        event_ticker: "SENATETX-26", series_ticker: "SENATETX", title: "Texas Senate winner?", status: "open",
        markets: [
          { ticker: "SENATETX-26-PA", yes_sub_title: "Ken Paxton", last_price_dollars: "0.5400", volume_fp: "4000000.00" },
          { ticker: "SENATETX-26-JT", yes_sub_title: "James Talarico", last_price_dollars: "0.4700", volume_fp: "3000000.00" }
        ]
      },
      {
        event_ticker: "KXTRUMPAPPROVAL-26AUG", series_ticker: "KXTRUMPAPPROVAL", title: "Trump approval rating", status: "open",
        markets: [{ ticker: "KXTRUMPAPPROVAL-26AUG-T50", yes_sub_title: "Above 50", last_price_dollars: "0.4000" }]
      },
      {
        event_ticker: "KXHORMUZNORM-27", series_ticker: "KXHORMUZNORM", title: "When will traffic at the Strait of Hormuz return to normal?", status: "open",
        markets: [{ ticker: "KXHORMUZNORM-27-JAN", yes_sub_title: "Before January", last_price_dollars: "0.5200", volume_fp: "8000000.00" }]
      }
    ], cursor: "" });
  };
  try {
    const result = await runPoliticsPoll(env, Date.parse("2026-08-01T12:00:00Z"));
    assert.deepEqual([result.bundleCount, result.marketCount], [2, 2]);
    const cached = JSON.parse(cache.get("kalshi:politics:public:v1"));
    const texasBundle = cached.bundles.find(bundle => bundle.jurisdiction === "Texas");
    assert.equal(texasBundle.markets[0].eventTicker, "SENATETX-26");
    assert.equal(texasBundle.markets[0].url, "https://kalshi.com/markets/senatetx/texas-senate-race/senatetx-26");
    const response = await worker.fetch(new Request("https://example.com/api/politics"), env, { waitUntil() {} });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /stale-while-revalidate/);
    assert.equal((await response.json()).marketCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("discovers Americas soccer games and the live AFCON future", () => {
  assert.ok(DEFAULT_SERIES.includes("KXBRASILEIROGAME"));
  assert.ok(DEFAULT_SERIES.includes("KXLIGAMXGAME"));
  assert.ok(DEFAULT_SERIES.includes("KXARGPREMDIVGAME"));
  assert.ok(DEFAULT_SERIES.includes("KXMLSGAME"));
  assert.ok(DEFAULT_SERIES.includes("KXCOPADOBRASILGAME"));
  assert.ok(DEFAULT_SERIES.includes("KXCOPADOBRASILADVANCE"));
  assert.ok(DEFAULT_SERIES.includes("KXAFCON"));
});

test("throws a hard coverage error when any unelapsed event today or tomorrow lacks a listed Kalshi market", () => {
  const events = [
    { id: "today-posted", sport: "MLB", name: "Posted today", start: "2026-08-01", end: "2026-08-01" },
    { id: "tomorrow-missing", sport: "AFL", name: "Missing tomorrow", start: "2026-08-02", end: "2026-08-02" },
    { id: "future-missing", sport: "NFL", name: "Allowed future", start: "2026-08-05", end: "2026-08-05" },
    { id: "elapsed-missing", sport: "Soccer", name: "Finished already", start: "2026-08-01", end: "2026-08-01" }
  ];
  assert.throws(() => assertNearTermMarketCoverage(events, {
    today: "2026-08-01",
    resolveMarket: event => event.id === "today-posted" ? { eventTicker: "POSTED" } : null,
    isElapsed: event => event.id === "elapsed-missing"
  }), error => {
    assert.equal(error.code, MISSING_MARKET_ERROR_CODE);
    assert.deepEqual(error.missingEvents.map(event => event.id), ["tomorrow-missing"]);
    return true;
  });
});

test("allows distant unlisted events while requiring every active near-term sport to resolve", () => {
  const result = assertNearTermMarketCoverage([
    { id: "cricket-today", sport: "CRK", start: "2026-08-01", end: "2026-08-03" },
    { id: "f1-future", sport: "F1", start: "2026-08-08", end: "2026-08-10" }
  ], {
    today: "2026-08-01",
    resolveMarket: event => event.id === "cricket-today" ? { eventTicker: "KXT20MATCH-POSTED" } : null
  });
  assert.deepEqual(result, { checkedEventCount: 1, missingEventCount: 0 });
});

test("applies near-term market coverage validation to every sport on the globe", () => {
  const sports = ["MLB", "LMB", "KBO", "NPB", "NBA", "WNBA", "NHL", "NFL", "CFB", "AFL", "ATP", "WTA", "PGA", "GOLF", "UCL", "SOC", "EPL", "LALIGA", "BUNDESLIGA", "SERIEA", "LIGUE1", "BRASILEIRAO", "LIGAMX", "ARGPRIMERA", "MLS", "COPADOBRASIL", "AFCON", "CRK", "IPL", "F1"];
  const events = sports.map(sport => ({ id: `today-${sport}`, sport, name: `${sport} event`, start: "2026-08-01", end: "2026-08-01" }));
  for (const missingSport of sports) {
    assert.throws(() => assertNearTermMarketCoverage(events, {
      today: "2026-08-01",
      resolveMarket: event => event.sport === missingSport ? null : { eventTicker: `POSTED-${event.sport}` }
    }), error => {
      assert.equal(error.code, MISSING_MARKET_ERROR_CODE);
      assert.deepEqual(error.missingEvents.map(event => event.sport), [missingSport]);
      return true;
    });
  }
});

test("keeps near-term Kalshi coverage diagnostics internal to the generated app", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /MISSING_NEAR_TERM_KALSHI_MARKETS/);
  assert.match(html, /validateNearTermMarketCoverage/);
  assert.match(html, /\[Sports coverage diagnostic\]/);
  assert.doesNotMatch(html, /ERROR · Kalshi market missing/);
  assert.doesNotMatch(html, /coverage-error-window|coverage-error-item|showCoverageErrors/);
  assert.doesNotMatch(html, /data-market-coverage-error/);
});

test("discovers AFL games and ships the remaining 2026 fixture with mapped venues", () => {
  assert.ok(DEFAULT_SERIES.includes("KXAFLGAME"));
  const schedule = JSON.parse(fs.readFileSync(new URL("../data/afl-schedule-2026.json", import.meta.url), "utf8"));
  assert.equal(schedule.length, 36);
  assert.equal(new Set(schedule.map(event => event.id)).size, schedule.length);
  assert.ok(schedule.every(event => event.sport === "AFL" && event.seriesTicker === "KXAFLGAME"));
  assert.ok(schedule.every(event => Number.isFinite(event.lat) && Number.isFinite(event.lon)));
  const nearTerm = schedule.filter(event => event.start >= "2026-08-01" && event.start <= "2026-08-02");
  assert.equal(nearTerm.length, 7);
  assert.ok(nearTerm.every(event => /^KXAFLGAME-26[A-Z]{3}\d{6}[A-Z]+$/.test(event.expectedEventTicker || "")));
});

test("migrates a stale series manifest and publishes AFL prices", async () => {
  const now = Date.parse("2026-08-01T20:00:00Z");
  const eventTicker = "KXAFLGAME-26AUG020115MELGCS";
  const cache = new Map([
    ["kalshi:sports:state:v2", JSON.stringify({
      lastDiscoveryAt: now,
      lastRunAt: now,
      discoveredSeries: DEFAULT_SERIES.filter(ticker => ticker !== "KXAFLGAME"),
      events: {}
    })]
  ]);
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "20"
  };
  const requestedSeries = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const url = new URL(input);
    const seriesTicker = url.searchParams.get("series_ticker");
    requestedSeries.push(seriesTicker);
    if (seriesTicker !== "KXAFLGAME") return Response.json({ events: [], cursor: "" });
    return Response.json({ events: [{
      event_ticker: eventTicker,
      series_ticker: "KXAFLGAME",
      title: "Melbourne Demons at Gold Coast Suns",
      status: "open",
      markets: [
        {
          ticker: `${eventTicker}-MEL`, event_ticker: eventTicker, yes_sub_title: "Melbourne Demons",
          last_price_dollars: "0.6200", volume_fp: "2400.00", occurrence_datetime: "2026-08-02T05:15:00Z"
        },
        {
          ticker: `${eventTicker}-GCS`, event_ticker: eventTicker, yes_sub_title: "Gold Coast Suns",
          last_price_dollars: "0.3900", volume_fp: "1800.00", occurrence_datetime: "2026-08-02T05:15:00Z"
        }
      ]
    }], cursor: "" });
  };
  try {
    const result = await runPoll(env, now);
    assert.equal(result.discoveryDue, true, "a newly required series must invalidate a recent discovery manifest");
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(requestedSeries.includes("KXAFLGAME"));
  const state = JSON.parse(cache.get("kalshi:sports:state:v2"));
  assert.ok(state.discoveredSeries.includes("KXAFLGAME"));
  const snapshot = JSON.parse(cache.get("kalshi:sports:public:v2")).events
    .find(event => event.eventTicker === eventTicker);
  assert.ok(snapshot, "the AFL game should reach the browser-readable cache");
  assert.equal(snapshot.volume, 4200);
  assert.deepEqual(snapshot.markets.map(market => [market.label, market.lastPrice]), [
    ["Melbourne Demons", 62],
    ["Gold Coast Suns", 39]
  ]);
});

test("stops a rate-limited sports stage and resumes only missing series", async () => {
  const now = Date.parse("2026-08-02T20:00:00Z");
  const missing = DEFAULT_SERIES.slice(-2);
  const cache = new Map([["kalshi:sports:state:v2", JSON.stringify({
    lastDiscoveryAt: now,
    discoveredSeries: DEFAULT_SERIES.slice(0, -2),
    events: {}
  })]]);
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) { const value = cache.get(key); return type === "json" && value ? JSON.parse(value) : value || null; },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "1",
    KALSHI_MAX_RETRY_ATTEMPTS: "0"
  };
  const originalFetch = globalThis.fetch;
  const requested = [];
  let releaseRateLimit = false;
  globalThis.fetch = async input => {
    const ticker = new URL(input).searchParams.get("series_ticker");
    requested.push(ticker);
    if (ticker === missing[1] && !releaseRateLimit) return new Response('{"error":"too many requests"}', { status: 429 });
    return Response.json({ events: [], cursor: "" });
  };
  try {
    await runPoll(env, now);
    const partial = JSON.parse(cache.get("kalshi:sports:state:v2"));
    assert.ok(partial.discoveredSeries.includes(missing[0]));
    assert.ok(!partial.discoveredSeries.includes(missing[1]));
    assert.equal(partial.lastRequestSuccessCount, 1);
    assert.match(partial.lastError, /1 remaining/);
    assert.deepEqual(requested, missing);

    releaseRateLimit = true;
    requested.length = 0;
    await runPoll(env, now + 3 * 60_000);
    const complete = JSON.parse(cache.get("kalshi:sports:state:v2"));
    assert.equal(complete.discoveredSeries.length, DEFAULT_SERIES.length);
    assert.equal(complete.lastError, null);
    assert.deepEqual(requested, [missing[1]], "the successful series should not be requested again");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("never presents a bare Kalshi series ticker as a specific event code", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /function specificEventTicker\(event\)/);
  assert.match(html, /eventTicker: event\.expectedEventTicker \|\| event\.eventTicker/);
  assert.match(html, /No listed Kalshi event ticker/);
  assert.match(html, /KXAFLGAME-26AUG020115MELGCS/);
  assert.match(html, /"CFB", "AFL", "IPL"/);
  assert.doesNotMatch(html, /root\.querySelector\("\.event-ticker"\)\.textContent = event\.eventTicker/);
});

test("keeps required international baseball series when configuration is stale", () => {
  const series = parseSeries({ KALSHI_SPORTS_SERIES: "KXMLBGAME" });
  assert.ok(series.includes("KXLMBGAME"));
  assert.ok(series.includes("KXKBOGAME"));
  assert.ok(series.includes("KXNPBGAME"));
  assert.equal(new Set(series).size, series.length);
});

test("discovers ATP/WTA outrights and singles matches and keeps tournament outrights available for schedule joins", () => {
  assert.ok(DEFAULT_SERIES.includes("KXATP"));
  assert.ok(DEFAULT_SERIES.includes("KXWTA"));
  assert.ok(DEFAULT_SERIES.includes("KXATPMATCH"));
  assert.ok(DEFAULT_SERIES.includes("KXWTAMATCH"));
  const payload = filterForDate({ events: [
    { eventTicker: "KXATP-26USO", seriesTicker: "KXATP", startsAt: "2026-09-13T20:00:00Z" },
    { eventTicker: "KXATPMATCH-26AUG01AABB", seriesTicker: "KXATPMATCH", startsAt: "2026-08-01T20:00:00Z" },
    { eventTicker: "KXATPMATCH-26SEP13CCDD", seriesTicker: "KXATPMATCH", startsAt: "2026-09-13T20:00:00Z" }
  ] }, "2026-08-01");
  assert.deepEqual(payload.events.map(event => event.eventTicker), [
    "KXATP-26USO",
    "KXATPMATCH-26AUG01AABB"
  ]);
});

test("keeps a wide enough cached odds window to validate tomorrow in every global time zone", () => {
  const payload = filterForDate({ events: [
    { eventTicker: "INSIDE", seriesTicker: "KXTEST", startsAt: "2026-08-03T08:00:00Z" },
    { eventTicker: "ONGOING", seriesTicker: "KXTESTMATCH", startsAt: "2026-07-29T08:00:00Z", endsAt: "2026-08-02T20:00:00Z" },
    { eventTicker: "OUTSIDE", seriesTicker: "KXTEST", startsAt: "2026-08-03T13:00:01Z" },
    { eventTicker: "EXPIRED", seriesTicker: "KXTESTMATCH", startsAt: "2026-07-25T08:00:00Z", endsAt: "2026-07-29T11:59:59Z" }
  ] }, "2026-08-01");
  assert.deepEqual(payload.events.map(event => event.eventTicker), ["INSIDE", "ONGOING"]);
});

test("repairs legacy cached outright status when remaining player contracts are active", async () => {
  const now = new Date().toISOString();
  const payload = {
    generatedAt: now,
    cache: {},
    events: [{
      eventTicker: "KXWTA-26WASHIN",
      seriesTicker: "KXWTA",
      status: "finalized",
      startsAt: "2026-08-22T17:00:00Z",
      updatedAt: now,
      markets: [
        { ticker: "KXWTA-26WASHIN-OUT", status: "finalized", label: "Eliminated player" },
        { ticker: "KXWTA-26WASHIN-LIVE", status: "active", label: "Remaining player" }
      ]
    }]
  };
  const env = {
    MARKET_ATLAS_CACHE: { async get(key) { return key === "kalshi:sports:public:v2" ? payload : null; } },
    ASSETS: { fetch() { return new Response("Not found", { status: 404 }); } }
  };
  const response = await worker.fetch(new Request("https://example.com/api/odds?date=2026-08-01"), env, { waitUntil() {} });
  assert.equal((await response.json()).events[0].status, "active");
});

test("classifies major-league team futures and rejects game lines, props, awards, and novelty markets", () => {
  const classify = (ticker, title, tags = []) => classifyTeamFuturesSeries({ ticker, title, tags, volume_fp: "100.00" });
  assert.deepEqual(classify("KXSB", "Super Bowl", ["Football"]), {
    ticker: "KXSB", title: "Super Bowl", sport: "NFL", kind: "title", volume: 100
  });
  assert.equal(classify("KXNFLAFCWEST", "American Football Conference West Winner", ["Football"])?.kind, "division");
  assert.equal(classify("KXNFLNFCCHAMP", "National Football Conference Champion", ["Football"])?.kind, "conference");
  assert.equal(classify("KXTEAMSINSB", "Teams in Super Bowl", ["Football"])?.kind, "finalist");
  assert.equal(classify("KXNBAWINS", "Pro Basketball Win Totals", ["Basketball"])?.kind, "regularSeasonWins");
  assert.equal(classify("KXNHLPLAYOFF", "Playoff Qualifier", ["Hockey"])?.kind, "playoffs");
  assert.equal(classify("KXNCAAFB12", "Big 12 Champion", ["Football"])?.kind, "conference");
  assert.equal(classify("KXPREMIERLEAGUE", "PREMIER LEAGUE", ["Soccer"])?.kind, "title");
  assert.equal(classify("KXEPLTOP4", "EPL top 4 teams", ["Soccer"])?.kind, "top4");
  assert.equal(classify("KXLALIGARELEGATION", "La Liga Relegation", ["Soccer"])?.kind, "relegation");
  assert.equal(classify("KXUCLADVANCE", "Champions League Advance", ["Soccer"])?.kind, "advance");
  for (const [ticker, title, tags] of [
    ["KXUCLGAME", "UEFA Champions League Game", ["Soccer"]],
    ["KXFIRSTSUPERBOWLSONG", "What will be the first Super Bowl song?", ["Football", "Music"]],
    ["KXNBAMVP", "Pro Basketball MVP", ["Basketball"]],
    ["KXNFLSPREAD", "Pro Football Spread", ["Football"]],
    ["KXNEXTTEAMNBA", "Next NBA Team", ["Basketball"]]
  ]) assert.equal(classify(ticker, title, tags), null, `${ticker} should not enter the team-futures cache`);
});

test("builds a dense, team-pure futures panel from a cross-league manifest", () => {
  const market = (ticker, label, volume, primaryParticipantKey = "") => ({
    ticker, label, volume, lastPrice: 42, yesBid: 41, yesAsk: 43, primaryParticipantKey
  });
  const snapshot = (seriesTicker, eventTicker, title, futuresKind, markets, volume = 100_000) => ({
    seriesTicker, eventTicker, title, subtitle: "", futuresKind, markets, volume,
    updatedAt: "2026-08-01T12:00:00.000Z"
  });
  const manifest = {
    generatedAt: "2026-08-01T12:00:00.000Z",
    sports: {
      NFL: [
        snapshot("KXSB", "KXSB-27", "Super Bowl", "title", [
          market("KXSB-27-DAL", "Dallas Cowboys", 90_000, "DAL"),
          market("KXSB-27-PHI", "Philadelphia Eagles", 80_000, "PHI")
        ], 2_000_000),
        snapshot("KXNFLNFCCHAMP", "KXNFLNFCCHAMP-27", "NFC champion", "conference", [market("KXNFLNFCCHAMP-27-DAL", "Dallas Cowboys", 70_000)], 800_000),
        snapshot("KXNFLNFCEAST", "KXNFLNFCEAST-27", "NFC East winner", "division", [market("KXNFLNFCEAST-27-DAL", "Dallas Cowboys", 50_000)], 600_000),
        snapshot("KXNFLPLAYOFF", "KXNFLPLAYOFF-27", "NFL playoffs", "playoffs", [market("KXNFLPLAYOFF-27-DAL", "Dallas Cowboys", 45_000)], 500_000),
        snapshot("KXNFLWINS-DAL", "KXNFLWINS-DAL-27", "Dallas regular-season wins", "regularSeasonWins", [
          market("KXNFLWINS-DAL-27-T10", "More than 10.5 wins", 20_000),
          market("KXNFLWINS-DAL-27-T11", "More than 11.5 wins", 30_000)
        ], 75_000),
        snapshot("KXNFL1SEED", "KXNFL1SEED-27", "NFC No. 1 seed", "seed", [market("KXNFL1SEED-27-DAL", "Dallas Cowboys", 12_000)], 90_000)
      ],
      EPL: [snapshot("KXPREMIERLEAGUE", "KXPREMIERLEAGUE-27", "Premier League", "title", [market("KXPREMIERLEAGUE-27-ARS", "Arsenal", 60_000)], 900_000)]
    }
  };
  const dallas = buildTeamFuturesFromManifest(manifest, "NFL", "DAL", "Dallas Cowboys");
  assert.deepEqual(dallas.cards.map(card => card.marketKind), ["title", "conference", "division", "playoffs", "regularSeasonWins", "seed"]);
  assert.equal(dallas.futures.regularSeasonWins.ticker, "KXNFLWINS-DAL-27-T11");
  assert.ok(dallas.cards.every(card => card.sport === "NFL" && card.teamCode === "DAL"));
  assert.ok(dallas.cards.every(card => !card.ticker.endsWith("-PHI")));
  assert.equal(buildTeamFuturesFromManifest(manifest, "EPL", "ARS", "Arsenal").cards[0].ticker, "KXPREMIERLEAGUE-27-ARS");
});

test("discovers and serves daily team futures through the generalized cache API", async () => {
  assert.ok(["NFL", "CFB", "NBA", "WNBA", "NHL", "EPL", "UCL", "LALIGA", "BUNDESLIGA", "SERIEA", "LIGUE1", "BRASILEIRAO", "LIGAMX", "ARGPRIMERA"]
    .every(sport => SUPPORTED_TEAM_FUTURES_SPORTS.has(sport)));
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "20",
    KALSHI_MAX_FUTURES_SERIES: "20"
  };
  const originalFetch = globalThis.fetch;
  let openEventScans = 0;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) {
      return Response.json({ series: [{ ticker: "KXSB", title: "Super Bowl", tags: ["Football"], volume_fp: "50000000.00" }] });
    }
    if (url.pathname.endsWith("/events") && !url.searchParams.has("series_ticker")) {
      openEventScans += 1;
      return Response.json({ events: [{
        event_ticker: "KXSB-27", series_ticker: "KXSB", title: "Super Bowl", status: "open",
        markets: [{
          ticker: "KXSB-27-DAL", yes_sub_title: "Dallas Cowboys", primary_participant_key: "DAL",
          last_price_dollars: "0.1200", volume_fp: "100000.00", occurrence_datetime: "2027-02-14T23:30:00Z"
        }]
      }], cursor: "" });
    }
    return Response.json({ events: [], cursor: "" });
  };
  try {
    const result = await runTeamFuturesPoll(env, Date.parse("2026-08-01T12:00:00Z"));
    assert.equal(result.refreshed, true);
    assert.ok(result.seriesRequested >= 20);
    assert.equal(openEventScans, 1, "all futures series should share one paginated open-events scan");
    const manifest = JSON.parse(cache.get("kalshi:team-futures:manifest:v3"));
    assert.equal(manifest.sports.NFL.find(event => event.eventTicker === "KXSB-27")?.futuresKind, "title");
    const response = await worker.fetch(new Request("https://example.com/api/team-markets?sport=NFL&team=DAL&name=Dallas%20Cowboys"), env, { waitUntil() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.schemaVersion, 3);
    assert.equal(payload.cards[0].ticker, "KXSB-27-DAL");
    assert.equal(payload.cards[0].lastPrice, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updates all daily futures caches from one server-side open-events sweep", async () => {
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_FUTURES_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_MAX_FUTURES_SERIES: "20"
  };
  const originalFetch = globalThis.fetch;
  let seriesRequests = 0;
  let eventSweeps = 0;
  globalThis.fetch = async input => {
    const url = new URL(input);
    if (url.pathname.endsWith("/series")) {
      seriesRequests += 1;
      return Response.json({ series: [{ ticker: "KXSB", title: "Super Bowl", tags: ["Football"], volume_fp: "50000000.00" }] });
    }
    eventSweeps += 1;
    return Response.json({ events: [
      {
        event_ticker: "KXSB-27", series_ticker: "KXSB", title: "Super Bowl", status: "open",
        markets: [{ ticker: "KXSB-27-DAL", yes_sub_title: "Dallas Cowboys", primary_participant_key: "DAL", last_price_dollars: "0.1200", volume_fp: "100000.00" }]
      },
      {
        event_ticker: "KXMLB-26", series_ticker: "KXMLB", title: "World Series", status: "open",
        markets: [{ ticker: "KXMLB-26-LAD", yes_sub_title: "Los Angeles Dodgers", primary_participant_key: "LAD", last_price_dollars: "0.2800", volume_fp: "200000.00" }]
      }
    ], cursor: "" });
  };
  try {
    const now = Date.parse("2026-08-01T12:00:00Z");
    const result = await runFuturesMaintenance(env, now);
    assert.equal(result.refreshed, true);
    assert.equal(seriesRequests, 1);
    assert.equal(eventSweeps, 1, "generic and MLB futures must share one upstream sweep");
    assert.equal(JSON.parse(cache.get("kalshi:team-futures:manifest:v3")).sports.NFL[0].eventTicker, "KXSB-27");
    assert.equal(JSON.parse(cache.get(teamFuturesCacheKey("MLB", "LAD"))).futures.title.ticker, "KXMLB-26-LAD");
    const second = await runFuturesMaintenance(env, now + 60_000);
    assert.equal(second.refreshed, false);
    assert.equal(eventSweeps, 1, "the daily completion timestamp must prevent duplicate sweeps");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ships complete, located Americas soccer schedules", () => {
  const schedules = JSON.parse(fs.readFileSync(new URL("../data/americas-soccer-schedules-2026.json", import.meta.url)));
  const minimums = { BRASILEIRAO: 380, LIGAMX: 300, ARGPRIMERA: 480, MLS: 510 };
  for (const [league, minimum] of Object.entries(minimums)) {
    const events = schedules[league].events;
    assert.ok(events.length >= minimum, `${league} should include its complete 2026 calendar`);
    assert.equal(new Set(events.map(event => event.id)).size, events.length, `${league} event IDs should be unique`);
    assert.ok(events.every(event => Number.isFinite(event.lat) && Number.isFinite(event.lon)), `${league} events should have map coordinates`);
  }
});

test("ships located LMB, KBO, and NPB schedules and discovers their game markets", () => {
  const schedules = JSON.parse(fs.readFileSync(new URL("../data/international-baseball-schedules-2026.json", import.meta.url)));
  const minimums = { LMB: 900, KBO: 650, NPB: 800 };
  const series = { LMB: "KXLMBGAME", KBO: "KXKBOGAME", NPB: "KXNPBGAME" };
  for (const [league, minimum] of Object.entries(minimums)) {
    const events = schedules[league].events;
    assert.ok(DEFAULT_SERIES.includes(series[league]), `${league} Kalshi series should be discovered`);
    assert.ok(events.length >= minimum, `${league} should include its posted 2026 schedule`);
    assert.equal(new Set(events.map(event => event.id)).size, events.length, `${league} event IDs should be unique`);
    assert.ok(events.every(event => Number.isFinite(event.lat) && Number.isFinite(event.lon)), `${league} games should have stadium coordinates`);
  }

  assert.ok(schedules.NPB.events.every(event => /^KXNPBGAME-/.test(event.eventTicker)), "every NPB game should have an exact Kalshi ticker");
  assert.ok(schedules.KBO.events.every(event => /^KXKBOGAME-/.test(event.eventTicker)), "every KBO game should have an exact Kalshi ticker");
  assert.ok(schedules.LMB.events.filter(event => !/All-Stars|National Team/.test(`${event.home} ${event.away}`))
    .every(event => /^KXLMBGAME-/.test(event.eventTicker)), "every regular LMB game should have an exact Kalshi ticker");

  const npbExample = schedules.NPB.events.find(event => event.utc === "2026-08-02T04:00:00.000Z"
    && event.away === "Chiba Lotte Marines" && event.home === "Hokkaido Nippon-Ham Fighters");
  assert.ok(npbExample, "NPB schedule should preserve the venue's true home team");
  assert.equal(npbExample.venue, "ES CON Field Hokkaido");
  assert.equal(npbExample.eventTicker, "KXNPBGAME-26AUG020000CHIHOK");

  const kboExample = schedules.KBO.events.find(event => event.utc === "2026-06-23T09:30:00.000Z"
    && event.away === "SSG Landers" && event.home === "KT Wiz");
  assert.ok(kboExample, "KBO schedule should preserve away and home teams");
  assert.equal(kboExample.eventTicker, "KXKBOGAME-26JUN230530SSGKTW");

  assert.equal(schedules.KBO.events.find(event => event.away === "SSG Landers" && event.home === "Kiwoom Heroes"
    && event.utc === "2026-08-02T05:00:00.000Z")?.eventTicker, "KXKBOGAME-26AUG020100SSGKIW");
  assert.equal(schedules.KBO.events.find(event => event.away === "LG Twins" && event.home === "Doosan Bears"
    && event.utc === "2026-08-02T09:00:00.000Z")?.eventTicker, "KXKBOGAME-26AUG020500LGDOO");
  assert.equal(schedules.LMB.events.find(event => event.away === "Dorados de Chihuahua" && event.home === "Sultanes de Monterrey"
    && event.utc === "2026-08-01T23:00:00Z")?.eventTicker, "KXLMBGAME-26AUG011900DORSDM");
});

test("discovers odds from Kalshi events rather than rebuilding them from an MLB-shaped market list", () => {
  const source = fs.readFileSync(new URL("../src/worker.js", import.meta.url), "utf8");
  assert.match(source, /\/events\?\$\{query\}/);
  assert.match(source, /with_nested_markets: "true"/);
  assert.doesNotMatch(source, /const grouped = new Map\(\)/);
});

test("polls international baseball events into the public odds cache", async () => {
  const now = Date.parse("2026-08-01T20:00:00Z");
  const fixtures = {
    KXKBOGAME: ["KXKBOGAME-26AUG020100SSGKIW", "SSG Landers vs Kiwoom Heroes", "2026-08-02T05:00:00Z"],
    KXNPBGAME: ["KXNPBGAME-26AUG020000CHIHOK", "Chiba Lotte Marines vs Hokkaido Nippon-Ham Fighters", "2026-08-02T04:00:00Z"],
    KXLMBGAME: ["KXLMBGAME-26AUG011900DORSDM", "Dorados de Chihuahua vs Sultanes de Monterrey", "2026-08-01T23:00:00Z"]
  };
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "20"
  };
  const originalFetch = globalThis.fetch;
  const requestedPaths = [];
  globalThis.fetch = async input => {
    const url = new URL(input);
    requestedPaths.push(`${url.pathname}?${url.searchParams}`);
    const fixture = fixtures[url.searchParams.get("series_ticker")];
    if (!fixture) return Response.json({ events: [], cursor: "" });
    const [eventTicker, title, occurrence] = fixture;
    return Response.json({ events: [{
      event_ticker: eventTicker,
      series_ticker: url.searchParams.get("series_ticker"),
      title,
      status: "open",
      markets: [
        { ticker: `${eventTicker}-AWAY`, event_ticker: eventTicker, yes_sub_title: title.split(" vs ")[0], last_price_dollars: "0.4500", volume_fp: "1200.00", occurrence_datetime: occurrence },
        { ticker: `${eventTicker}-HOME`, event_ticker: eventTicker, yes_sub_title: title.split(" vs ")[1], last_price_dollars: "0.5600", volume_fp: "1800.00", occurrence_datetime: occurrence }
      ]
    }], cursor: "" });
  };
  try {
    await runPoll(env, now);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const payload = JSON.parse(cache.get("kalshi:sports:public:v2"));
  assert.equal(JSON.parse(cache.get("kalshi:sports:state:v2")).lastDiscoveryAt, now);
  for (const [seriesTicker, [eventTicker]] of Object.entries(fixtures)) {
    const snapshot = payload.events.find(event => event.eventTicker === eventTicker);
    assert.ok(snapshot, `${seriesTicker} event should reach the public cache`);
    assert.equal(snapshot.seriesTicker, seriesTicker);
    assert.equal(snapshot.markets.length, 2);
    assert.equal(snapshot.volume, 3000);
  }
  assert.ok(requestedPaths.every(path => path.startsWith("/trade-api/v2/events?")));
  assert.ok(requestedPaths.every(path => path.includes("with_nested_markets=true")));
});

test("warms and refreshes the Kalshi cache from the local odds endpoint", async () => {
  const cache = new Map();
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000",
    KALSHI_POLL_CONCURRENCY: "20"
  };
  const originalFetch = globalThis.fetch;
  let upstreamRequests = 0;
  globalThis.fetch = async input => {
    const url = new URL(input);
    upstreamRequests += 1;
    const isMlb = url.searchParams.get("series_ticker") === "KXMLBGAME";
    return Response.json({
      events: isMlb ? [{
        event_ticker: "KXMLBGAME-26AUG011507STLTOR",
        series_ticker: "KXMLBGAME",
        title: "St. Louis at Toronto",
        status: "open",
        markets: [{
          ticker: "KXMLBGAME-26AUG011507STLTOR-TOR",
          event_ticker: "KXMLBGAME-26AUG011507STLTOR",
          yes_sub_title: "Toronto Blue Jays",
          last_price_dollars: "0.6100",
          volume_fp: "2400.00",
          occurrence_datetime: "2026-08-01T19:07:00Z"
        }]
      }] : [],
      cursor: ""
    });
  };
  try {
    const response = await worker.fetch(new Request("http://localhost/api/odds?date=2026-08-01"), env, { waitUntil() {} });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.events[0].eventTicker, "KXMLBGAME-26AUG011507STLTOR");
    assert.equal(payload.events[0].markets[0].lastPrice, 61);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.ok(upstreamRequests >= DEFAULT_SERIES.length);
  const state = JSON.parse(cache.get("kalshi:sports:state:v2"));
  assert.ok(Date.now() - state.lastRunAt < 5000);
});

test("hides stale odds while revalidating the local MLB cache in the background", async () => {
  const now = Date.now();
  const eventTicker = "KXMLBGAME-26AUG011907BOSTOR";
  const staleEvent = {
    eventTicker,
    seriesTicker: "KXMLBGAME",
    title: "Boston at Toronto",
    subtitle: "",
    status: "open",
    startsAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(now + 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    volume: 1000,
    markets: [{ ticker: `${eventTicker}-TOR`, label: "Toronto Blue Jays", lastPrice: 41, yesBid: 40, yesAsk: 42, volume: 1000 }]
  };
  const cache = new Map([
    ["kalshi:sports:state:v2", JSON.stringify({
      lastDiscoveryAt: now,
      lastRunAt: now - 24 * 60 * 60 * 1000,
      discoveredSeries: DEFAULT_SERIES,
      events: { [eventTicker]: staleEvent }
    })],
    ["kalshi:sports:public:v2", JSON.stringify({ generatedAt: staleEvent.updatedAt, eventCount: 1, events: [staleEvent] })]
  ]);
  const env = {
    MARKET_ATLAS_CACHE: {
      async get(key, type) {
        const value = cache.get(key);
        return type === "json" && value ? JSON.parse(value) : value || null;
      },
      async put(key, value) { cache.set(key, value); }
    },
    KALSHI_READ_TOKENS_PER_SECOND: "1000000",
    KALSHI_MAX_READ_REQUESTS_PER_SECOND: "1000000"
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ event: {
    event_ticker: eventTicker,
    series_ticker: "KXMLBGAME",
    title: "Boston at Toronto",
    status: "open",
    markets: [{
      ticker: `${eventTicker}-TOR`,
      event_ticker: eventTicker,
      yes_sub_title: "Toronto Blue Jays",
      last_price_dollars: "0.6300",
      yes_bid_dollars: "0.6200",
      yes_ask_dollars: "0.6400",
      volume_fp: "1800.00",
      occurrence_datetime: staleEvent.startsAt,
      expected_expiration_time: staleEvent.endsAt
    }]
  } });
  const background = [];
  try {
    const response = await worker.fetch(new Request("http://localhost/api/odds"), env, { waitUntil(promise) { background.push(promise); } });
    const stalePayload = await response.json();
    assert.equal(stalePayload.events.length, 0, "24-hour-old odds must never reach the browser");
    assert.equal(stalePayload.cache.updating, true);
    assert.equal(stalePayload.cache.staleEventCount, 1);
    await Promise.all(background);
    const refreshedResponse = await worker.fetch(new Request("https://example.com/api/odds"), env, { waitUntil() {} });
    assert.equal((await refreshedResponse.json()).events[0].markets[0].lastPrice, 63);
  } finally {
    globalThis.fetch = originalFetch;
  }
  const refreshed = JSON.parse(cache.get("kalshi:sports:public:v2"));
  assert.equal(refreshed.events[0].markets[0].lastPrice, 63);
  assert.ok(Date.now() - JSON.parse(cache.get("kalshi:sports:state:v2")).lastRunAt < 5000);
});

test("matches international baseball by exact ticker or both teams and start time", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /hostedOddsByTicker\.get\(event\.expectedEventTicker \|\| event\.eventTicker\)/);
  assert.match(html, /baseballTeamMatches\(event\.awayName, snapshotText\).*baseballTeamMatches\(event\.homeName, snapshotText\)/s);
  assert.match(html, /timeDistance > 2 \* 60 \* 60 \* 1000/);
  assert.match(html, /Acereros de Monclova/);
});

test("keeps every Kalshi poll server-side and makes the browser cache-only", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  const client = fs.readFileSync(new URL("../public/assets/sports-odds.js", import.meta.url), "utf8");
  assert.match(client, /fetch\(`\/api\/odds\?date=/);
  assert.match(client, /fetch\(`\/api\/team-markets\?/);
  assert.doesNotMatch(client, /external-api\.kalshi\.com|api\.elections\.kalshi\.com/);
  assert.doesNotMatch(client, /fetch\(["'`]\/data\//);
  assert.doesNotMatch(client, /exactEventSnapshot|exactBaseballSnapshots|getExactBaseballTickers/);
  assert.doesNotMatch(html, /getExactBaseballTickers/);
});

test("sorts tennis outrights by probability and opens a matchups-only popup", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /class="tennis-markets-trigger"[^>]*>[\s\S]*<strong>Matches<\/strong>[\s\S]*Biggest singles matchups/);
  assert.doesNotMatch(html, /data-tennis-market=|Outright winner<\/button>/);
  assert.match(html, /const tennisMatchSeries = new Map\(\[\["ATP", "KXATPMATCH"\], \["WTA", "KXWTAMATCH"\]\]\)/);
  assert.match(html, /tennisMatchBelongsToEvent\(snapshot, outrightSnapshot\)/);
  assert.match(html, /const activeMarkets = snapshot\.markets\.filter\(market => !completedMarketStatuses\.has/);
  assert.match(html, /sort\(\(left, right\) => outrightProbability\(right\) - outrightProbability\(left\)/);
  assert.match(html, /\(event\.tennisMatches \|\| \[\]\)\.slice\(0, 8\)/);
});

test("never displays embedded stale odds when a cache record is absent", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  const mlbData = JSON.parse(html.match(/<script id="market-atlas-mlb-season-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(Object.keys(mlbData.markets || {}).length, 0, "the shipped MLB schedule must not contain fallback odds");
  assert.match(html, /All displayed odds\s*\n\s*\/\/ must come from the server cache through \/api\/odds/);
  assert.match(html, /if \(!snapshot\) \{\s*return \{\s*\.\.\.event,\s*marketPosted: false,\s*contracts: 0,\s*volume: 0,\s*prices: \[\]/s);
  assert.match(html, /cacheTimestampLabel\(event\.oddsUpdatedAt\)/);
  assert.doesNotMatch(html, /event\.snapshot \|\| "Jul 31, 6:18 PM ET"/);
});

test("persists the local KV cache across server restarts", () => {
  const server = fs.readFileSync(new URL("../scripts/dev-server.mjs", import.meta.url), "utf8");
  assert.match(server, /\.local-cache/);
  assert.match(server, /loadPersistentCache\(\)/);
  assert.match(server, /persistLocalCache\(\)/);
  assert.match(server, /rename\(temporaryFile, cacheFile\)/);
});

test("opens generalized futures panels from team names across every supported game league", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  const client = fs.readFileSync(new URL("../public/assets/sports-odds.js", import.meta.url), "utf8");
  assert.match(html, /const teamFuturesSports = new Set\(\["MLB", "NFL", "CFB", "NBA", "WNBA", "NHL", "EPL", "UCL"/);
  assert.match(html, /new CustomEvent\("market-atlas:team"/);
  assert.match(html, /detail: \{ sport: team\.sport, teamCode: team\.code, teamName: team\.name/);
  assert.match(html, /payload\?\.schemaVersion === 3/);
  assert.match(client, /document\.addEventListener\("market-atlas:team"/);
  assert.match(client, /\/api\/team-markets\?\$\{query\}/);
  assert.doesNotMatch(client, /market-atlas:mlb-team/);
});

test("uses one geography-first baseball filter and no soccer league selector", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /data-sport="BASEBALL-GROUP"[^>]*checked><span>Baseball<\/span>/);
  assert.doesNotMatch(html, /market-atlas-league-select|Soccer league/);
});

test("shows every baseball league only on its game date", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /const baseballSports = new Set\(filterGroups\["BASEBALL-GROUP"\]\)/);
  assert.match(html, /if \(baseballSports\.has\(event\.sport\)\) \{\s*return \{ visible: false, upcoming: false/);
  assert.doesNotMatch(html, /advanceWindowSports = new Set\(\["LMB", "KBO", "NPB"/);
});

test("anchors Sports upcoming labels to the browser date instead of the selected timeline date", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /function upcomingEventLabel\(eventStart, browserToday = browserLocalIsoDate\(\)\)/);
  assert.match(html, /daysFromToday >= 1 && daysFromToday <= ADVANCE_WINDOW_DAYS/);
  assert.match(html, /const selectedDateLead = isoDayDistance\(date, event\.start\)/);
  assert.match(html, /upcomingLabel: visible \? upcomingEventLabel\(event\.start\) : ""/);
  assert.match(html, /event\.upcoming \? `\$\{sportLabel\} · \$\{event\.upcomingLabel\}` : sportLabel/);
  assert.doesNotMatch(html, /upcomingLabel: visible \? `In \$\{daysUntil\}/);
});

test("starts the timeline today and removes events after they finish", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /const todayIso = easternIsoDate\(\)/);
  assert.match(html, /const calendarStart = todayIso < scheduleStart \? scheduleStart : todayIso > calendarEnd \? calendarEnd : todayIso/);
  assert.match(html, /if \(event\.state === "L"\) return false/);
  assert.match(html, /if \(event\.state === "F"\) return true/);
  assert.match(html, /completedMarketStatuses\.has/);
  assert.match(html, /eventHasElapsed\(currentEvent, now\)/);
  assert.match(html, /map\(unpackMlb\)\.filter\(event => !eventHasElapsed\(event, now\)\)/);
});

test("removes closed and time-expired games before rendering or missing-market validation", () => {
  const html = fs.readFileSync(new URL("../public/categories/sports/index.html", import.meta.url), "utf8");
  assert.match(html, /completedMarketStatuses = new Set\(\["closed", "settled", "finalized", "determined", "resolved"\]\)/);
  assert.match(html, /\["AFL", 3 \* 60 \* 60 \* 1000\]/);
  assert.match(html, /if \(completedMarketStatuses\.has\(String\(event\.marketStatus \|\| ""\)\.toLowerCase\(\)\)\) return true/);
  assert.match(html, /if \(eventHasElapsed\(currentEvent, now\)\) return \[\]/);
  assert.match(html, /isElapsed: event => eventHasElapsed\(withHostedOdds\(event\), now\)/);
  assert.match(html, /function scheduledStartFromTicker\(ticker\)/);
  assert.match(html, /scheduledStartFromTicker\(event\.eventTicker \|\| event\.expectedEventTicker\)/);
  assert.match(html, /function eventLocalDayHasPassed\(event, now\)/);
  assert.match(html, /if \(eventLocalDayHasPassed\(event, now\)\) return true/);
});

test("normalizes fixed-point Kalshi prices and volumes", () => {
  const now = Date.parse("2026-08-01T12:00:00Z");
  const snapshot = normalizeEvent(
    { ticker: "KXMLBGAME-TEST", series_ticker: "KXMLBGAME", title: "BOS at LAD" },
    [{
      ticker: "KXMLBGAME-TEST-LAD",
      event_ticker: "KXMLBGAME-TEST",
      yes_sub_title: "Los Angeles Dodgers",
      last_price_dollars: "0.6350",
      yes_bid_dollars: "0.6200",
      yes_ask_dollars: "0.6500",
      volume_fp: "12345.00",
      occurrence_datetime: "2026-08-01T20:00:00Z",
      expected_expiration_time: "2026-08-01T23:00:00Z"
    }],
    now
  );
  assert.equal(snapshot.markets[0].lastPrice, 63.5);
  assert.equal(snapshot.markets[0].yesBid, 62);
  assert.equal(snapshot.volume, 12345);
  assert.equal(snapshot.startsAt, "2026-08-01T20:00:00.000Z");
  assert.equal(snapshot.endsAt, "2026-08-01T23:00:00.000Z");
});

test("uses a game ticker schedule when Kalshi copies a settlement deadline into occurrence time", () => {
  const snapshot = normalizeEvent(
    { event_ticker: "KXTESTMATCH-26AUG021000PAKWI", series_ticker: "KXTESTMATCH", title: "West Indies vs Pakistan" },
    [{
      ticker: "KXTESTMATCH-26AUG021000PAKWI-WI",
      event_ticker: "KXTESTMATCH-26AUG021000PAKWI",
      yes_sub_title: "West Indies",
      status: "active",
      occurrence_datetime: "2026-08-07T14:00:00Z",
      expected_expiration_time: "2026-08-07T14:00:00Z",
      close_time: "2026-08-09T14:00:00Z"
    }],
    Date.parse("2026-08-03T12:00:00Z")
  );
  assert.equal(snapshot.startsAt, "2026-08-02T14:00:00.000Z");
  assert.equal(snapshot.endsAt, "2026-08-09T14:00:00.000Z");
  assert.deepEqual(filterForDate({ events: [snapshot] }, "2026-08-03").events.map(event => event.eventTicker), [
    "KXTESTMATCH-26AUG021000PAKWI"
  ]);

  const legacySnapshot = { ...snapshot, startsAt: "2026-08-07T14:00:00.000Z" };
  assert.deepEqual(filterForDate({ events: [legacySnapshot] }, "2026-08-03").events.map(event => event.eventTicker), [
    "KXTESTMATCH-26AUG021000PAKWI"
  ]);
  assert.equal(pollInterval(legacySnapshot, Date.parse("2026-08-03T12:00:00Z")), 60 * 1000);
});

test("keeps a multi-contract outright active while any player market is active", () => {
  const snapshot = normalizeEvent(
    { ticker: "KXWTA-26WASHIN", series_ticker: "KXWTA", title: "WTA Washington Winner" },
    [
      { ticker: "KXWTA-26WASHIN-OUT", status: "finalized", yes_sub_title: "Eliminated player" },
      { ticker: "KXWTA-26WASHIN-LIVE", status: "active", yes_sub_title: "Remaining player" }
    ],
    Date.parse("2026-08-01T12:00:00Z")
  );
  assert.equal(snapshot.status, "active");
  assert.deepEqual(snapshot.markets.map(market => market.status), ["finalized", "active"]);
});

test("uses adaptive intervals around a live event", () => {
  const start = Date.parse("2026-08-01T20:00:00Z");
  const snapshot = { startsAt: new Date(start).toISOString(), status: "open" };
  assert.equal(pollInterval(snapshot, start - 25 * 60 * 60 * 1000), 60 * 60 * 1000);
  assert.equal(pollInterval(snapshot, start - 6 * 60 * 60 * 1000), 15 * 60 * 1000);
  assert.equal(pollInterval(snapshot, start - 60 * 60 * 1000), 5 * 60 * 1000);
  assert.equal(pollInterval(snapshot, start + 30 * 60 * 1000), 60 * 1000);
});

test("keeps multi-day events on the live cadence until their expiration", () => {
  const start = Date.parse("2026-08-01T12:00:00Z");
  const snapshot = {
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active"
  };
  assert.equal(pollInterval(snapshot, start + 2 * 24 * 60 * 60 * 1000), 60 * 1000);
});

test("builds title, playoff, season-win, and division futures by MLB team", () => {
  const market = (ticker, label, volume, lastPrice) => ({ ticker, label, volume, lastPrice, yesBid: lastPrice - 1, yesAsk: lastPrice + 1 });
  const snapshots = [
    [{ seriesTicker: "KXMLB", title: "Pro Baseball Champion", volume: 37_000_000, markets: [market("KXMLB-26-LAD", "Los Angeles D", 4_000_000, 33)] }],
    [{ seriesTicker: "KXMLBPLAYOFFS", title: "Pro Baseball Playoff Qualifiers", volume: 1_400_000, markets: [market("KXMLBPLAYOFFS-26-LAD", "Los Angeles D", 90_000, 88)] }],
    [{ seriesTicker: "KXMLBWINS-LAD", title: "Los Angeles D season wins", volume: 230_000, markets: [market("KXMLBWINS-LAD-26-100", "100+ wins", 120_000, 54)] }],
    [{ seriesTicker: "KXMLBNLWEST", title: "NL West Division Winner", volume: 1_300_000, markets: [market("KXMLBNLWEST-26-LAD", "Los Angeles D", 500_000, 87)] }]
  ];
  const result = buildMlbFuturesSnapshot(snapshots, Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(result.teams.LAD.primary.ticker, "KXMLB-26-LAD");
  assert.equal(result.teams.LAD.title.lastPrice, 33);
  assert.equal(result.teams.LAD.playoffs.lastPrice, 88);
  assert.equal(result.teams.LAD.seasonWins.heading, "Regular-season wins");
  assert.equal(result.teams.LAD.seasonWins.ticker, "KXMLBWINS-LAD-26-100");
  assert.equal(result.teams.LAD.division.ticker, "KXMLBNLWEST-26-LAD");
  assert.deepEqual(result.teams.LAD.playerProps, []);
  assert.equal(result.teams.LAD.schemaVersion, 2);
  assert.equal(result.teams.LAD.futures.title.teamCode, "LAD");
  assert.equal(result.teams.LAD.futures.regularSeasonWins.marketKind, "regularSeasonWins");
  assert.ok(validateTeamFuturesRecord(result.teams.LAD));
});

test("indexes shared futures by exact team ticker and rejects cross-team cache records", () => {
  const market = (ticker, label, lastPrice) => ({ ticker, label, volume: 10_000, lastPrice, yesBid: lastPrice - 1, yesAsk: lastPrice + 1 });
  const snapshot = {
    seriesTicker: "KXMLB",
    eventTicker: "KXMLB-26",
    title: "World Series",
    updatedAt: "2026-08-01T12:00:00.000Z",
    volume: 20_000,
    markets: [
      market("KXMLB-26-LAD", "Boston Red Sox", 34),
      market("KXMLB-26-BOS", "Los Angeles Dodgers", 5)
    ]
  };
  const result = buildMlbFuturesSnapshot([[snapshot]], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(result.teams.LAD.title.ticker, "KXMLB-26-LAD");
  assert.equal(result.teams.LAD.title.lastPrice, 34);
  assert.equal(result.teams.BOS.title.ticker, "KXMLB-26-BOS");
  assert.equal(result.teams.BOS.title.lastPrice, 5);
  assert.notEqual(teamFuturesCacheKey("MLB", "LAD"), teamFuturesCacheKey("MLB", "BOS"));

  const contaminated = structuredClone(result.teams.BOS);
  contaminated.futures.title = result.teams.LAD.title;
  assert.equal(validateTeamFuturesRecord(contaminated), false);
});

test("ships a distinct validated daily futures record for every MLB team", () => {
  const cache = JSON.parse(fs.readFileSync(new URL("../data/mlb-team-futures-cache.json", import.meta.url)));
  assert.equal(Object.keys(cache.teams).length, 30);
  for (const [teamCode, record] of Object.entries(cache.teams)) {
    assert.equal(record.teamCode, teamCode);
    assert.ok(validateTeamFuturesRecord(record), `${teamCode} cache record should be team-pure`);
  }
  for (const kind of ["title", "playoffs", "regularSeasonWins", "division"]) {
    const tickers = Object.values(cache.teams).map(record => record.futures[kind]?.ticker).filter(Boolean);
    assert.equal(new Set(tickers).size, tickers.length, `${kind} contracts should not be shared across teams`);
  }
  assert.notEqual(cache.teams.LAD.title.ticker, cache.teams.BOS.title.ticker);
  assert.notEqual(cache.teams.LAD.title.lastPrice, cache.teams.BOS.title.lastPrice);
});

test("replaces a sub-two-percent title price with playoff odds", () => {
  const market = (ticker, label, volume, lastPrice) => ({ ticker, label, volume, lastPrice, yesBid: lastPrice, yesAsk: lastPrice + 1 });
  const result = buildMlbFuturesSnapshot([
    [{ seriesTicker: "KXMLB", title: "Pro Baseball Champion", volume: 37_000_000, markets: [market("KXMLB-26-COL", "Colorado", 20_000, 1.5)] }],
    [{ seriesTicker: "KXMLBPLAYOFFS", title: "Playoff Qualifiers", volume: 1_400_000, markets: [market("KXMLBPLAYOFFS-26-COL", "Colorado", 15_000, 7)] }]
  ], Date.parse("2026-08-01T12:00:00Z"));
  assert.equal(result.teams.COL.primary.heading, "Make the playoffs");
  assert.equal(result.teams.COL.primary.lastPrice, 7);
  assert.equal(result.teams.COL.title.lastPrice, 1.5);
  assert.equal(result.teams.COL.playoffs.lastPrice, 7);
});

test("matches MLB player props to the selected game and team", () => {
  const payload = { events: [
    {
      seriesTicker: "KXMLBKS",
      eventTicker: "KXMLBKS-26AUG011507STLTOR",
      title: "St. Louis vs Toronto: Strikeouts",
      startsAt: "2026-08-01T19:07:00Z",
      volume: 12_000,
      markets: [
        { ticker: "KXMLBKS-26AUG011507STLTOR-STLPGRAY54-6", label: "Sonny Gray: 6+", lastPrice: 47, volume: 7_000 },
        { ticker: "KXMLBKS-26AUG011507STLTOR-TORKGAUSMAN34-7", label: "Kevin Gausman: 7+", lastPrice: 39, volume: 5_000 }
      ]
    },
    {
      seriesTicker: "KXMLBHRR",
      eventTicker: "KXMLBHRR-26AUG021310STLTOR",
      title: "St. Louis vs Toronto: Hits + Runs + RBIs",
      volume: 8_000,
      markets: [{ ticker: "KXMLBHRR-26AUG021310STLTOR-STLNARENADO5-2", label: "Nolan Arenado: 2+", lastPrice: 55, volume: 8_000 }]
    }
  ] };
  const props = buildMlbPlayerProps(payload, "STL", "KXMLBGAME-26AUG011507STLTOR");
  assert.equal(props.length, 1);
  assert.equal(props[0].heading, "Sonny Gray: 6+");
  assert.equal(props[0].ticker, "KXMLBKS-26AUG011507STLTOR-STLPGRAY54-6");
});
