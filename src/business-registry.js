const BUSINESS_LOCATIONS = {
  KXHOODA: ["robinhood", "Robinhood", "HOOD", "Menlo Park, California", 37.4529, -122.1817, "Technology", "United States"],
  KXSBUXA: ["starbucks", "Starbucks", "SBUX", "Seattle, Washington", 47.6062, -122.3321, "Consumer", "United States"],
  KXNCLHA: ["norwegian-cruise", "Norwegian Cruise Line", "NCLH", "Miami, Florida", 25.7617, -80.1918, "Travel", "United States"],
  KXRIVNA: ["rivian", "Rivian", "RIVN", "Irvine, California", 33.6846, -117.8265, "Mobility", "United States"],
  KXTSLAA: ["tesla", "Tesla", "TSLA", "Austin, Texas", 30.2672, -97.7431, "Mobility", "United States"],
  KXEBAYA: ["ebay", "eBay", "EBAY", "San Jose, California", 37.3382, -121.8863, "Consumer", "United States"],
  KXMETAA: ["meta", "Meta", "META", "Menlo Park, California", 37.4848, -122.1484, "Technology", "United States"],
  KXCCLA: ["carnival", "Carnival", "CCL", "Miami, Florida", 25.7743, -80.1937, "Travel", "United States"],
  KXBAA: ["boeing", "Boeing", "BA", "Arlington, Virginia", 38.8816, -77.091, "Industrial", "United States"],
  KXMELIA: ["mercadolibre", "MercadoLibre", "MELI", "Buenos Aires, Argentina", -34.6037, -58.3816, "Consumer", "International"],
  KXFA: ["ford", "Ford", "F", "Dearborn, Michigan", 42.3223, -83.1763, "Mobility", "United States"],
  KXRACEA: ["ferrari", "Ferrari", "RACE", "Maranello, Italy", 44.5263, 10.8667, "Mobility", "International"],
  KXGRABA: ["grab", "Grab", "GRAB", "Singapore", 1.3521, 103.8198, "Technology", "International"],
  KXMTCHA: ["match-group", "Match Group", "MTCH", "Dallas, Texas", 32.7767, -96.797, "Technology", "United States"],
  KXUALA: ["united-airlines", "United Airlines", "UAL", "Chicago, Illinois", 41.8781, -87.6298, "Travel", "United States"],
  KXCMGA: ["chipotle", "Chipotle", "CMG", "Newport Beach, California", 33.6189, -117.9298, "Consumer", "United States"],
  KXPLTRA: ["palantir", "Palantir", "PLTR", "Denver, Colorado", 39.7392, -104.9903, "Technology", "United States"],
  KXRDDTA: ["reddit", "Reddit", "RDDT", "San Francisco, California", 37.7749, -122.4194, "Technology", "United States"],
  KXSPOTA: ["spotify", "Spotify", "SPOT", "Stockholm, Sweden", 59.3293, 18.0686, "Technology", "International"],
  KXCVNAA: ["carvana", "Carvana", "CVNA", "Tempe, Arizona", 33.4255, -111.94, "Mobility", "United States"],
  KXAMZNA: ["amazon", "Amazon", "AMZN", "Seattle, Washington", 47.61, -122.337, "Technology", "United States"],
  KXAAPLA: ["apple", "Apple", "AAPL", "Cupertino, California", 37.323, -122.0322, "Technology", "United States"],
  KXGOOGA: ["google", "Google", "GOOG", "Mountain View, California", 37.422, -122.0841, "Technology", "United States"],
  KXNVDAA: ["nvidia", "Nvidia", "NVDA", "Santa Clara, California", 37.3541, -121.9552, "Technology", "United States"],
  KXNFLXA: ["netflix", "Netflix", "NFLX", "Los Gatos, California", 37.2358, -121.9624, "Technology", "United States"],
  KXELECTRICM3: ["bmw", "BMW", "BMW", "Munich, Germany", 48.1351, 11.582, "Mobility", "International"]
};

// Active Kalshi Mentions series, mapped to the corporate headquarters, event venue,
// or institutional base that best explains why the market belongs at that point.
const MENTION_LOCATIONS = {
  KXHEARINGMENTION: ["us-capitol-mentions", "U.S. Capitol", "CAP", "U.S. Capitol · Washington, D.C.", 38.8899, -77.0091, "Mentions", "United States"],
  KXTALARICOMENTION: ["rockefeller-center-mentions", "Rockefeller Center", "NYC", "The Rachel Maddow Show · New York, New York", 40.7587, -73.9787, "Mentions", "United States"],
  KXTRUMPSAY: ["white-house-mentions", "White House mentions", "WH", "White House · Washington, D.C.", 38.8977, -77.0365, "Mentions", "United States"],
  KXTRUMPMENTION: ["las-vegas-mentions", "Las Vegas remarks", "LAS", "Las Vegas, Nevada · Event city", 36.1699, -115.1398, "Mentions", "United States"],
  KXTRUMPSAYNICKNAME: ["white-house-mentions", "White House mentions", "WH", "White House · Washington, D.C.", 38.8977, -77.0365, "Mentions", "United States"],
  KXTRUMPSAYMONTH: ["white-house-mentions", "White House mentions", "WH", "White House · Washington, D.C.", 38.8977, -77.0365, "Mentions", "United States"],
  KXTRUMPSAYCOMPANY: ["white-house-mentions", "White House mentions", "WH", "White House · Washington, D.C.", 38.8977, -77.0365, "Mentions", "United States"],
  KXMRBEASTMENTION: ["greenville-creators", "Greenville creators", "MRB", "Greenville, North Carolina · Creator base", 35.6127, -77.3664, "Mentions", "United States"],
  KXELONMENTION: ["spacex", "SpaceX", "SPX", "Starbase, Texas · Headquarters", 25.997, -97.156, "Mentions", "United States"],
  KXMAMDANIMENTION: ["nyc-city-hall-mentions", "New York City Hall", "NYC", "New York City Hall · New York, New York", 40.7127, -74.006, "Mentions", "United States"],
  KXFEDMENTION: ["federal-reserve-mentions", "Federal Reserve", "FED", "Federal Reserve Board · Washington, D.C.", 38.8928, -77.0457, "Mentions", "United States"],
  KXEARNINGSMENTIONMCD: ["mcdonalds", "McDonald's", "MCD", "Chicago, Illinois · Headquarters", 41.8781, -87.6298, "Mentions", "United States"],
  KXEARNINGSMENTIONPGR: ["progressive", "Progressive", "PGR", "Mayfield Village, Ohio · Headquarters", 41.5519, -81.4412, "Mentions", "United States"],
  KXEARNINGSMENTIONSPOT: ["spotify", "Spotify", "SPOT", "Stockholm, Sweden · Headquarters", 59.3293, 18.0686, "Mentions", "International"],
  KXEARNINGSMENTIONSPCX: ["spacex", "SpaceX", "SPX", "Starbase, Texas · Headquarters", 25.997, -97.156, "Mentions", "United States"],
  KXEARNINGSMENTIONAMD: ["amd", "AMD", "AMD", "Santa Clara, California · Headquarters", 37.3541, -121.9552, "Mentions", "United States"],
  KXEARNINGSMENTIONZETA: ["zeta-global", "Zeta Global", "ZETA", "New York, New York · Headquarters", 40.7128, -74.006, "Mentions", "United States"],
  KXEARNINGSMENTIONTOST: ["toast", "Toast", "TOST", "Boston, Massachusetts · Headquarters", 42.3601, -71.0589, "Mentions", "United States"],
  KXEARNINGSMENTIONDASH: ["doordash", "DoorDash", "DASH", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONEBAY: ["ebay", "eBay", "EBAY", "San Jose, California · Headquarters", 37.3382, -121.8863, "Mentions", "United States"],
  KXEARNINGSMENTIONDPZ: ["dominos", "Domino's", "DPZ", "Ann Arbor, Michigan · Headquarters", 42.2808, -83.743, "Mentions", "United States"],
  KXEARNINGSMENTIONUBER: ["uber", "Uber", "UBER", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONNBIS: ["nebius", "Nebius", "NBIS", "Amsterdam, Netherlands · Headquarters", 52.3676, 4.9041, "Mentions", "International"],
  KXEARNINGSMENTIONDIS: ["disney", "Disney", "DIS", "Burbank, California · Headquarters", 34.1808, -118.309, "Mentions", "United States"],
  KXEARNINGSMENTIONYOU: ["clear-secure", "Clear Secure", "YOU", "New York, New York · Headquarters", 40.7128, -74.006, "Mentions", "United States"],
  KXEARNINGSMENTIONLLY: ["eli-lilly", "Eli Lilly", "LLY", "Indianapolis, Indiana · Headquarters", 39.7684, -86.1581, "Mentions", "United States"],
  KXEARNINGSMENTIONWMT: ["walmart", "Walmart", "WMT", "Bentonville, Arkansas · Headquarters", 36.3729, -94.2088, "Mentions", "United States"],
  KXEARNINGSMENTIONMELI: ["mercadolibre", "MercadoLibre", "MELI", "Buenos Aires, Argentina · Headquarters", -34.6037, -58.3816, "Mentions", "International"],
  KXEARNINGSMENTIONDKNG: ["draftkings", "DraftKings", "DKNG", "Boston, Massachusetts · Headquarters", 42.3601, -71.0589, "Mentions", "United States"],
  KXEARNINGSMENTIONTLN: ["talen-energy", "Talen Energy", "TLN", "Houston, Texas · Headquarters", 29.7604, -95.3698, "Mentions", "United States"],
  KXEARNINGSMENTIONWEN: ["wendys", "Wendy's", "WEN", "Dublin, Ohio · Headquarters", 40.0992, -83.1141, "Mentions", "United States"],
  KXEARNINGSMENTIONABNB: ["airbnb", "Airbnb", "ABNB", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONHIMS: ["hims-hers", "Hims & Hers", "HIMS", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONTGT: ["target", "Target", "TGT", "Minneapolis, Minnesota · Headquarters", 44.9778, -93.265, "Mentions", "United States"],
  KXEARNINGSMENTIONSHOP: ["shopify", "Shopify", "SHOP", "Ottawa, Canada · Headquarters", 45.4215, -75.6972, "Mentions", "International"],
  KXEARNINGSMENTIONLYFT: ["lyft", "Lyft", "LYFT", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONFIG: ["figma", "Figma", "FIG", "San Francisco, California · Headquarters", 37.7749, -122.4194, "Mentions", "United States"],
  KXEARNINGSMENTIONKLAR: ["klarna", "Klarna", "KLAR", "Stockholm, Sweden · Headquarters", 59.3293, 18.0686, "Mentions", "International"],
  KXEARNINGSMENTIONDUOL: ["duolingo", "Duolingo", "DUOL", "Pittsburgh, Pennsylvania · Headquarters", 40.4406, -79.9959, "Mentions", "United States"],
  KXEARNINGSMENTIONCELH: ["celsius", "Celsius", "CELH", "Boca Raton, Florida · Headquarters", 26.3683, -80.1289, "Mentions", "United States"],
  KXEARNINGSMENTIONCAVA: ["cava", "Cava", "CAVA", "Washington, D.C. · Headquarters", 38.9072, -77.0369, "Mentions", "United States"],
  KXEARNINGSMENTIONHD: ["home-depot", "Home Depot", "HD", "Atlanta, Georgia · Headquarters", 33.749, -84.388, "Mentions", "United States"],
  KXEARNINGSMENTIONFUTU: ["futu", "Futu", "FUTU", "Hong Kong · Headquarters", 22.3193, 114.1694, "Mentions", "International"],
  KXEARNINGSMENTIONAC: ["air-canada", "Air Canada", "AC", "Montreal, Canada · Headquarters", 45.5017, -73.5673, "Mentions", "International"],
  KXEARNINGSMENTIONNVDA: ["nvidia", "Nvidia", "NVDA", "Santa Clara, California · Headquarters", 37.3541, -121.9552, "Mentions", "United States"],
  KXEARNINGSMENTIONTOL: ["toll-brothers", "Toll Brothers", "TOL", "Fort Washington, Pennsylvania · Headquarters", 40.1418, -75.2091, "Mentions", "United States"],
  KXEARNINGSMENTIONTTWO: ["take-two", "Take-Two", "TTWO", "New York, New York · Headquarters", 40.7128, -74.006, "Mentions", "United States"],
  KXEARNINGSMENTIONBULL: ["webull", "Webull", "BULL", "St. Petersburg, Florida · Headquarters", 27.7676, -82.6403, "Mentions", "United States"],
  KXEARNINGSMENTIONARITZIA: ["aritzia", "Aritzia", "ATZ", "Vancouver, Canada · Headquarters", 49.2827, -123.1207, "Mentions", "International"],
  KXEARNINGSMENTIONCCL: ["carnival", "Carnival", "CCL", "Miami, Florida · Headquarters", 25.7743, -80.1937, "Mentions", "United States"],
  KXEARNINGSMENTIONULTA: ["ulta", "Ulta Beauty", "ULTA", "Bolingbrook, Illinois · Headquarters", 41.6986, -88.0684, "Mentions", "United States"],
  KXEARNINGSMENTIONUAL: ["united-airlines", "United Airlines", "UAL", "Chicago, Illinois · Headquarters", 41.8781, -87.6298, "Mentions", "United States"],
  KXEARNINGSMENTIONDELL: ["dell", "Dell", "DELL", "Round Rock, Texas · Headquarters", 30.5083, -97.6789, "Mentions", "United States"],
  KXEARNINGSMENTIONSTZ: ["constellation-brands", "Constellation Brands", "STZ", "Victor, New York · Headquarters", 42.9826, -77.4089, "Mentions", "United States"],
  KXEARNINGSMENTIONURBN: ["urban-outfitters", "Urban Outfitters", "URBN", "Philadelphia, Pennsylvania · Headquarters", 39.9526, -75.1652, "Mentions", "United States"]
};

const MUSIC_MARKET_LOCATIONS = {
  "KXTOPARTISTUSA-26-DRA": ["music-toronto", "Toronto artists", "YYZ", "Toronto, Canada · Artist base", 43.6532, -79.3832, "International", "Drake", "Artist base"],
  "KXTOPARTISTUSA-26-BAD": ["music-san-juan", "San Juan artists", "SJU", "San Juan, Puerto Rico · Artist origin", 18.4655, -66.1057, "United States", "Bad Bunny", "Artist origin"],
  "KXTOPARTISTUSA-26-TAY": ["music-nashville", "Nashville artists", "BNA", "Nashville, Tennessee · Artist base", 36.1627, -86.7816, "United States", "Taylor Swift", "Artist base"],
  "KXTOPARTISTUSA-26-BRUN": ["music-honolulu", "Honolulu artists", "HNL", "Honolulu, Hawaii · Artist origin", 21.3099, -157.8581, "United States", "Bruno Mars", "Artist origin"],
  "KXTOPARTISTUSA-26-BTS": ["music-seoul", "Seoul artists", "SEL", "Seoul, South Korea · Group origin", 37.5665, 126.978, "International", "BTS", "Group origin"],
  "KXTOPARTISTUSA-26-KEN": ["music-compton", "Compton artists", "CPT", "Compton, California · Artist origin", 33.8958, -118.2201, "United States", "Kendrick Lamar", "Artist origin"],
  "KXTOPARTISTUSA-26-WEE": ["music-toronto", "Toronto artists", "YYZ", "Toronto, Canada · Artist origin", 43.6532, -79.3832, "International", "The Weeknd", "Artist origin"],
  "KXTOPARTISTUSA-26-BEY": ["music-houston", "Houston artists", "HOU", "Houston, Texas · Artist origin", 29.7604, -95.3698, "United States", "Beyonce", "Artist origin"],
  "KXVENUEPERFORMANCESPHERE-28JAN01-TAY": ["music-sphere", "Sphere", "SPH", "Sphere · Las Vegas, Nevada", 36.1208, -115.1645, "United States", "Taylor Swift", "Venue"],
  "KXVENUEPERFORMANCESPHERE-28JAN01-BEY": ["music-sphere", "Sphere", "SPH", "Sphere · Las Vegas, Nevada", 36.1208, -115.1645, "United States", "Beyonce", "Venue"],
  "KXVENUEPERFORMANCEMSG-27DEC31-DRA": ["music-msg", "Madison Square Garden", "MSG", "Madison Square Garden · New York, New York", 40.7505, -73.9934, "United States", "Drake", "Venue"],
  "KXVENUEPERFORMANCEMSG-27DEC31-SAB": ["music-msg", "Madison Square Garden", "MSG", "Madison Square Garden · New York, New York", 40.7505, -73.9934, "United States", "Sabrina Carpenter", "Venue"],
  "KXROLEATEVENTROLLING-27DEC31-TRA": ["music-rolling-loud-miami", "Rolling Loud Miami", "RLM", "Miami, Florida · Festival city", 25.7617, -80.1918, "United States", "Travis Scott", "Festival city"],
  "KXROLEATEVENTCOACHELLA-27DEC31-BAD": ["music-coachella", "Coachella", "COA", "Empire Polo Club · Indio, California", 33.6803, -116.237, "United States", "Bad Bunny", "Festival venue"],
  "KXPERFORM-27-BIL": ["music-lollapalooza", "Lollapalooza Chicago", "LOL", "Grant Park · Chicago, Illinois", 41.8757, -87.6189, "United States", "Billie Eilish", "Festival venue"],
  "KXRANKLISTIFPIARTIST-27FEB28-DRA": ["music-toronto", "Toronto artists", "YYZ", "Toronto, Canada · Artist origin", 43.6532, -79.3832, "International", "Drake", "Artist origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-WEE": ["music-toronto", "Toronto artists", "YYZ", "Toronto, Canada · Artist origin", 43.6532, -79.3832, "International", "The Weeknd", "Artist origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-JUS": ["music-stratford-on", "Stratford artists", "STR", "Stratford, Ontario · Artist origin", 43.37, -80.982, "International", "Justin Bieber", "Artist origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-ADE": ["music-london", "London artists", "LON", "London, United Kingdom · Artist origin", 51.5074, -0.1278, "International", "Adele", "Artist origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-EDS": ["music-suffolk", "Suffolk artists", "SFK", "Framlingham, Suffolk · Artist base", 52.2219, 1.342, "International", "Ed Sheeran", "Artist base"],
  "KXRANKLISTIFPIARTIST-27FEB28-BTS": ["music-seoul", "Seoul artists", "SEL", "Seoul, South Korea · Group origin", 37.5665, 126.978, "International", "BTS", "Group origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-STR": ["music-seoul", "Seoul artists", "SEL", "Seoul, South Korea · Group origin", 37.5665, 126.978, "International", "Stray Kids", "Group origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-SEV": ["music-seoul", "Seoul artists", "SEL", "Seoul, South Korea · Group origin", 37.5665, 126.978, "International", "SEVENTEEN", "Group origin"],
  "KXRANKLISTIFPIARTIST-27FEB28-MRS": ["music-tokyo", "Tokyo artists", "TYO", "Tokyo, Japan · Group origin", 35.6762, 139.6503, "International", "Mrs. GREEN APPLE", "Group origin"]
};

const MUSIC_SERIES_TICKERS = new Set(Object.keys(MUSIC_MARKET_LOCATIONS).map(ticker => ticker.split("-")[0]));
export const BUSINESS_MENTION_SERIES_TICKERS = new Set(Object.keys(MENTION_LOCATIONS));
export const BUSINESS_SERIES_TICKERS = new Set([...Object.keys(BUSINESS_LOCATIONS), ...BUSINESS_MENTION_SERIES_TICKERS, ...MUSIC_SERIES_TICKERS]);
const COMPLETED = new Set(["closed", "settled", "finalized", "determined", "resolved"]);

function locationForSeries(seriesTicker) {
  const key = String(seriesTicker || "").toUpperCase();
  const value = BUSINESS_LOCATIONS[key] || MENTION_LOCATIONS[key];
  if (!value) return null;
  const [id, name, code, location, lat, lon, kind, horizon] = value;
  return { id, name, code, location, lat, lon, kind, horizon };
}

export function businessLocationForSnapshot(snapshot) {
  return locationForSeries(snapshot?.seriesTicker || snapshot?.eventTicker?.split("-")[0]);
}

function price(market) {
  if (market.lastPrice != null) return Number(market.lastPrice);
  if (market.yesBid != null && market.yesAsk != null) return (Number(market.yesBid) + Number(market.yesAsk)) / 2;
  const fallback = market.yesAsk ?? market.yesBid;
  return fallback == null ? null : Number(fallback);
}

function musicLocationForMarket(market) {
  const value = MUSIC_MARKET_LOCATIONS[String(market?.ticker || "").toUpperCase()];
  if (!value) return null;
  const [id, name, code, location, lat, lon, horizon, artist, relationship] = value;
  return { id, name, code, location, lat, lon, kind: "Music", horizon, artist, relationship };
}

function marketUrl(snapshot, markets) {
  const ticker = markets.find(market => market.ticker)?.ticker || snapshot.eventTicker;
  return `https://kalshi.com/markets_by_ticker/${String(ticker || "").toLowerCase()}`;
}

function publicMarket(snapshot, location) {
  const active = (snapshot.markets || []).filter(market => !COMPLETED.has(String(market.status || "").toLowerCase()));
  const outcomes = active.map(market => ({
    name: market.label || market.subtitle || market.title || market.ticker,
    ticker: market.ticker,
    price: price(market),
    volume: Number(market.volume || 0)
  })).filter(outcome => Number.isFinite(outcome.price));
  if (!outcomes.length) return null;
  return {
    id: `${snapshot.eventTicker}:${location.id}`,
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    title: snapshot.title || snapshot.eventTicker,
    url: marketUrl(snapshot, active),
    kind: location.kind,
    horizon: location.horizon,
    volume: active.reduce((sum, market) => sum + Number(market.volume || 0), 0),
    updatedAt: snapshot.updatedAt,
    endsAt: snapshot.endsAt || null,
    markerCode: location.code,
    outcomes
  };
}

function publicMusicMarket(snapshot, market, location) {
  const marketPrice = price(market);
  if (!Number.isFinite(marketPrice) || COMPLETED.has(String(market.status || "").toLowerCase())) return null;
  const volume = Number(market.volume || 0);
  return {
    id: `${snapshot.eventTicker}:${location.id}:${market.ticker}`,
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    marketTicker: market.ticker,
    title: [location.artist, snapshot.title || market.title].filter(Boolean).join(": ") || market.ticker,
    subtitle: `${location.artist} · ${location.relationship}`,
    url: `https://kalshi.com/markets_by_ticker/${String(market.ticker).toLowerCase()}`,
    kind: "Music",
    horizon: location.horizon,
    volume,
    updatedAt: snapshot.updatedAt,
    endsAt: snapshot.endsAt || null,
    markerCode: location.code,
    outcomes: [{
      name: location.artist,
      ticker: market.ticker,
      price: marketPrice,
      volume
    }]
  };
}

export function buildBusinessPublicSnapshot(snapshots, now = Date.now(), cache = {}) {
  const byCompany = new Map();
  for (const snapshot of snapshots || []) {
    const location = businessLocationForSnapshot(snapshot);
    if (location) {
      const market = publicMarket(snapshot, location);
      if (!market) continue;
      if (!byCompany.has(location.id)) byCompany.set(location.id, { ...location, markets: [] });
      byCompany.get(location.id).markets.push(market);
      continue;
    }
    for (const sourceMarket of snapshot.markets || []) {
      const musicLocation = musicLocationForMarket(sourceMarket);
      if (!musicLocation) continue;
      const market = publicMusicMarket(snapshot, sourceMarket, musicLocation);
      if (!market) continue;
      if (!byCompany.has(musicLocation.id)) byCompany.set(musicLocation.id, { ...musicLocation, markets: [] });
      byCompany.get(musicLocation.id).markets.push(market);
    }
  }
  const bundles = [...byCompany.values()].map(bundle => ({
    ...bundle,
    markets: bundle.markets.sort((left, right) => right.volume - left.volume)
  })).sort((left, right) => Math.max(...right.markets.map(market => market.volume)) - Math.max(...left.markets.map(market => market.volume)));
  return {
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    cache,
    bundleCount: bundles.length,
    marketCount: new Set(bundles.flatMap(bundle => bundle.markets.map(market => market.id))).size,
    horizons: ["All", "United States", "International"],
    bundles
  };
}
