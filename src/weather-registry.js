const WEATHER_LOCATIONS = [
  ["philadelphia", "Philadelphia", "Philadelphia, Pennsylvania", 39.9526, -75.1652, ["philadelphia", "philly", "phil"]],
  ["washington-dc", "Washington, D.C.", "Washington, D.C.", 38.9072, -77.0369, ["washington dc", "washington d.c", "dc temperature", "dc monthly", "temp dc", "united states climate", "us meets its climate"]],
  ["los-angeles", "Los Angeles", "Los Angeles, California", 34.0522, -118.2437, ["los angeles", " la ", "lax"]],
  ["new-york", "New York City", "New York, New York", 40.7128, -74.006, ["new york city", "new york", "nyc"]],
  ["san-francisco", "San Francisco", "San Francisco, California", 37.7749, -122.4194, ["san francisco", "sfo"]],
  ["oklahoma-city", "Oklahoma City", "Oklahoma City, Oklahoma", 35.4676, -97.5164, ["oklahoma city", "okc"]],
  ["new-orleans", "New Orleans", "New Orleans, Louisiana", 29.9511, -90.0715, ["new orleans", "nola"]],
  ["san-antonio", "San Antonio", "San Antonio, Texas", 29.4241, -98.4936, ["san antonio", "satx"]],
  ["salt-lake-city", "Salt Lake City", "Salt Lake City, Utah", 40.7608, -111.891, ["salt lake city", "slc"]],
  ["st-petersburg", "St. Petersburg", "St. Petersburg, Florida", 27.7676, -82.6403, ["st petersburg", "st. petersburg"]],
  ["minneapolis", "Minneapolis", "Minneapolis, Minnesota", 44.9778, -93.265, ["minneapolis", "minnesota"]],
  ["las-vegas", "Las Vegas", "Las Vegas, Nevada", 36.1699, -115.1398, ["las vegas"]],
  ["houston", "Houston", "Houston, Texas", 29.7604, -95.3698, ["houston"]],
  ["chicago", "Chicago", "Chicago, Illinois", 41.8781, -87.6298, ["chicago"]],
  ["miami", "Miami", "Miami, Florida", 25.7617, -80.1918, ["miami"]],
  ["austin", "Austin", "Austin, Texas", 30.2672, -97.7431, ["austin"]],
  ["denver", "Denver", "Denver, Colorado", 39.7392, -104.9903, ["denver"]],
  ["boston", "Boston", "Boston, Massachusetts", 42.3601, -71.0589, ["boston"]],
  ["atlanta", "Atlanta", "Atlanta, Georgia", 33.749, -84.388, ["atlanta"]],
  ["seattle", "Seattle", "Seattle, Washington", 47.6062, -122.3321, ["seattle"]],
  ["phoenix", "Phoenix", "Phoenix, Arizona", 33.4484, -112.074, ["phoenix"]],
  ["dallas", "Dallas", "Dallas, Texas", 32.7767, -96.797, ["dallas"]],
  ["detroit", "Detroit", "Detroit, Michigan", 42.3314, -83.0458, ["detroit"]],
  ["aspen", "Aspen", "Aspen, Colorado", 39.1911, -106.8175, ["aspen"]],
  ["california", "California", "California", 36.7783, -119.4179, ["california"]],
  ["japan", "Japan", "Japan", 36.2048, 138.2529, ["japan"]],
  ["india", "India", "New Delhi, India", 28.6139, 77.209, ["india"]],
  ["european-union", "European Union", "Brussels, Belgium", 50.8503, 4.3517, ["european union", " eu "]]
].map(([id, name, location, lat, lon, aliases]) => ({ id, name, location, lat, lon, aliases }));

const REGIONAL_LOCATIONS = [
  { id: "atlantic-basin", name: "Atlantic Basin", location: "Tropical Atlantic", lat: 24, lon: -55, aliases: ["atlantic hurricane", "atlantic hurricanes", "hurricanes in the atlantic", "storms in the atlantic", "atlantic tropical", "atlantic named", "hurricane names", "first hurricane"] },
  { id: "central-pacific", name: "Central Pacific", location: "Central Pacific basin", lat: 18, lon: -155, aliases: ["central pacific"] },
  { id: "eastern-pacific", name: "Eastern Pacific", location: "Eastern Pacific basin", lat: 16, lon: -112, aliases: ["eastern pacific", "hurricane fausto"] },
  { id: "arctic", name: "Arctic", location: "Arctic Ocean", lat: 78, lon: 0, aliases: ["arctic", "sea ice"] },
  { id: "tornado-alley", name: "Tornado Alley", location: "Central United States", lat: 36.5, lon: -98, aliases: ["tornado", "tornadoes"] },
  { id: "global-volcanoes", name: "Global Volcanoes", location: "Pacific Ring of Fire", lat: 0, lon: 135, aliases: ["volcano", "supervolcano"] },
  { id: "el-nino", name: "El Niño Region", location: "Equatorial Pacific", lat: 0, lon: -150, aliases: ["el nino", "roni value", "roni be"] },
  { id: "lake-mead", name: "Lake Mead", location: "Lake Mead, Nevada", lat: 36.145, lon: -114.375, aliases: ["lake mead"] },
  { id: "texas-weather", name: "Texas", location: "Texas", lat: 31, lon: -99, aliases: ["temperature in texas", "texas dfw"] },
  { id: "global-climate", name: "Global Climate", location: "Global climate index", lat: 0, lon: -15, aliases: ["hottest year", "hottest july", "hottest august", "hottest month", "temperature increase", "world pass", "global warming", "pre-industrial", "co2 atmospheric", "co2 level", "ev market share"] }
];

const COMPLETED = new Set(["closed", "settled", "finalized", "determined", "resolved"]);

function normalized(value) {
  return ` ${String(value || "").toLowerCase().replace(/[^a-z0-9°]+/g, " ").replace(/\s+/g, " ").trim()} `;
}

function matchesAlias(text, alias) {
  const clean = normalized(alias);
  return text.includes(clean);
}

export function resolveWeatherLocations(text) {
  const haystack = normalized(text);
  const matches = [...WEATHER_LOCATIONS, ...REGIONAL_LOCATIONS].filter(location => location.aliases.some(alias => matchesAlias(haystack, alias)));
  const cityMatches = matches.filter(location => !new Set(["california", "japan", "india", "european-union"]).has(location.id));
  return cityMatches.length ? cityMatches : matches;
}

export function weatherKind(snapshot) {
  const tags = new Set((snapshot.seriesTags || []).map(tag => String(tag).toLowerCase()));
  const text = normalized(`${snapshot.seriesTitle} ${snapshot.title} ${snapshot.subtitle}`);
  if (tags.has("hourly temperature") || tags.has("daily temperature") || text.includes(" temperature ") || text.includes(" temp ")) return "Temperature";
  if (tags.has("snow and rain") || text.includes(" rain ") || text.includes(" snow ")) return "Rain & Snow";
  if (tags.has("hurricanes") || text.includes(" hurricane ") || text.includes(" tropical storm ")) return "Hurricanes";
  if (tags.has("natural disasters") || / earthquake | tornado | volcano /.test(text)) return "Natural Disasters";
  if (tags.has("climate change")) return "Climate Change";
  return "Climate Change";
}

export function weatherHorizon(snapshot, now = Date.now()) {
  const kind = weatherKind(snapshot);
  const frequency = String(snapshot.seriesFrequency || "").toLowerCase();
  const text = normalized(`${snapshot.seriesTitle} ${snapshot.title}`);
  const end = new Date(snapshot.endsAt || 0).getTime();
  if (frequency === "hourly" || frequency === "daily" || (Number.isFinite(end) && end > now && end - now <= 36 * 60 * 60 * 1000)) return "Today";
  if (kind === "Hurricanes" || frequency === "monthly" || text.includes(" season ")) return "Season";
  if (text.includes(" 2026 ") || frequency === "annual") return "2026";
  return "Long range";
}

function price(market) {
  if (market.lastPrice != null) return market.lastPrice;
  if (market.yesBid != null && market.yesAsk != null) return (market.yesBid + market.yesAsk) / 2;
  return market.yesAsk ?? market.yesBid ?? null;
}

function slug(value) {
  return String(value || "market").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function weatherMarketUrl(snapshot) {
  return `https://kalshi.com/markets/${String(snapshot.seriesTicker || "").toLowerCase()}/${slug(snapshot.seriesTitle || snapshot.title)}/${String(snapshot.eventTicker || "").toLowerCase()}`;
}

function activeMarkets(snapshot) {
  return (snapshot.markets || []).filter(market => !COMPLETED.has(String(market.status || "").toLowerCase()));
}

function markerCode(kind, outcomes) {
  const priced = outcomes.filter(outcome => Number.isFinite(Number(outcome.price)));
  if (!priced.length) return "—";
  const leader = priced.slice().sort((left, right) => right.price - left.price)[0];
  if (kind === "Temperature") {
    const match = String(leader.name).match(/-?\d{1,3}°/);
    if (match) return match[0];
  }
  const yes = priced.find(outcome => /^yes$/i.test(outcome.name));
  return `${Math.round(yes?.price ?? leader.price)}%`;
}

function weatherMarket(snapshot, markets, location, split = false) {
  const kind = weatherKind(snapshot);
  const normalizedMarkets = markets.map(market => ({
    name: split ? "Yes" : market.label || market.title || market.ticker,
    price: price(market),
    ticker: market.ticker
  })).filter(outcome => outcome.price != null);
  const outcomes = split && normalizedMarkets.length === 1
    ? [normalizedMarkets[0], { name: "No", price: Math.max(0, 100 - normalizedMarkets[0].price) }]
    : normalizedMarkets;
  const volume = markets.reduce((sum, market) => sum + Number(market.volume || 0), 0);
  return {
    id: `${snapshot.eventTicker}:${location.id}`,
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    title: split ? `${snapshot.title.replace(/\?$/, "")} — ${location.name}?` : snapshot.title,
    url: weatherMarketUrl(snapshot),
    kind,
    horizon: weatherHorizon(snapshot),
    volume,
    updatedAt: snapshot.updatedAt,
    markerCode: markerCode(kind, outcomes),
    outcomes
  };
}

export function buildWeatherPublicSnapshot(snapshots, now = Date.now(), cache = {}, unmapped = []) {
  const byLocation = new Map();
  const add = (location, market) => {
    if (!market.outcomes.length) return;
    if (!byLocation.has(location.id)) byLocation.set(location.id, {
      id: location.id, name: location.name, location: location.location, lat: location.lat, lon: location.lon, markets: []
    });
    const bundle = byLocation.get(location.id);
    if (!bundle.markets.some(item => item.id === market.id)) bundle.markets.push(market);
  };

  for (const snapshot of snapshots) {
    const markets = activeMarkets(snapshot);
    if (!markets.length) continue;
    const eventText = `${snapshot.seriesTitle || ""} ${snapshot.title || ""} ${snapshot.subtitle || ""}`;
    const eventLocations = resolveWeatherLocations(eventText);
    if (eventLocations.length === 1) {
      add(eventLocations[0], weatherMarket(snapshot, markets, eventLocations[0]));
      continue;
    }
    let mappedMarket = false;
    for (const market of markets) {
      const marketLocations = resolveWeatherLocations(`${market.label || ""} ${market.title || ""} ${market.subtitle || ""}`);
      for (const location of marketLocations) {
        add(location, weatherMarket(snapshot, [market], location, true));
        mappedMarket = true;
      }
    }
    if (!mappedMarket && eventLocations.length > 1) {
      for (const location of eventLocations) add(location, weatherMarket(snapshot, markets, location));
    }
  }

  const bundles = [...byLocation.values()].map(bundle => {
    bundle.markets.sort((left, right) => right.volume - left.volume);
    const representative = bundle.markets[0];
    return {
      ...bundle,
      code: representative?.markerCode || "—",
      kind: representative?.kind || "Climate Change",
      horizon: representative?.horizon || "Long range"
    };
  }).sort((left, right) => Math.max(...right.markets.map(market => market.volume)) - Math.max(...left.markets.map(market => market.volume)));

  return {
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    cache,
    bundleCount: bundles.length,
    marketCount: new Set(bundles.flatMap(bundle => bundle.markets.map(market => market.id))).size,
    unmappedCount: unmapped.length,
    unmapped,
    horizons: ["All", "Today", "Season", "2026", "Long range"],
    bundles
  };
}
