import { SEARCH_LOCATIONS } from "./search-locations.js";
import { politicsMarketUrl } from "./politics-registry.js";
import { canonicalSportsMatchupTitle, canonicalSportsOutcomeName } from "./client/sports-team-names.js";

const GENERIC_WORDS = new Set([
  "a", "about", "all", "any", "are", "around", "at", "bet", "bets", "can", "could", "event", "events",
  "find", "for", "game", "games", "give", "i", "in", "is", "list", "market", "markets", "match", "matches", "me", "of", "on", "odds", "please",
  "price", "prices", "race", "races", "show", "the", "to", "traded", "trading", "what", "whats", "will", "with"
]);

const SORT_WORDS = new Set([
  "big", "biggest", "busy", "busiest", "close", "closest", "competitive", "high", "huge", "liquid", "liquidity",
  "most", "popular", "tight", "tightest", "volume"
]);

const TIME_WORDS = new Set([
  "current", "currently", "day", "days", "live", "next", "now", "this", "today", "tonight", "tomorrow", "week",
  "weekend", "upcoming"
]);

const SPORT_ALIASES = [
  { pattern: /\b(?:mlb|major league baseball|baseball)\b/, tags: ["baseball"] },
  { pattern: /\b(?:nfl|pro football)\b/, tags: ["nfl"] },
  { pattern: /\b(?:college football|cfb|ncaaf)\b/, tags: ["cfb"] },
  { pattern: /\b(?:nba|pro basketball)\b/, tags: ["nba"] },
  { pattern: /\bwnba\b/, tags: ["wnba"] },
  { pattern: /\b(?:nhl|hockey|stanley cup)\b/, tags: ["nhl"] },
  { pattern: /\b(?:major league soccer|mls)\b/, tags: ["soccer", "mls"] },
  { pattern: /\b(?:soccer|futbol|football club|premier league|epl|champions league|ucl|la liga|bundesliga|serie a|ligue 1|liga mx)\b/, tags: ["soccer"] },
  { pattern: /\b(?:tennis|atp|wta)\b/, tags: ["tennis"] },
  { pattern: /\b(?:golf|pga|lpga)\b/, tags: ["golf"] },
  { pattern: /\b(?:formula 1|formula one|f1|grand prix)\b/, tags: ["f1"] },
  { pattern: /\b(?:cricket|ipl|test match|t20)\b/, tags: ["cricket"] },
  { pattern: /\b(?:australian football|aussie rules|afl)\b/, tags: ["afl"] }
];

// Kalshi intentionally shortens several MLB outcome names (for example,
// "Los Angeles D" and "Boston"). Keep the public search vocabulary separate
// from those display labels so familiar team names still find the right event.
const MLB_SEARCH_TEAMS = {
  AZ: ["Arizona Diamondbacks", "Arizona", "Diamondbacks", "D-backs", "Dbacks"],
  ATL: ["Atlanta Braves", "Atlanta", "Braves"],
  BAL: ["Baltimore Orioles", "Baltimore", "Orioles", "O's"],
  BOS: ["Boston Red Sox", "Boston", "Red Sox"],
  CHC: ["Chicago Cubs", "Chicago C", "Cubs"],
  CWS: ["Chicago White Sox", "Chicago WS", "White Sox"],
  CIN: ["Cincinnati Reds", "Cincinnati", "Reds"],
  CLE: ["Cleveland Guardians", "Cleveland", "Guardians"],
  COL: ["Colorado Rockies", "Colorado", "Rockies"],
  DET: ["Detroit Tigers", "Detroit", "Tigers"],
  HOU: ["Houston Astros", "Houston", "Astros"],
  KC: ["Kansas City Royals", "Kansas City", "Royals"],
  LAA: ["Los Angeles Angels", "Los Angeles A", "Angels"],
  LAD: ["Los Angeles Dodgers", "Los Angeles D", "Dodgers"],
  MIA: ["Miami Marlins", "Miami", "Marlins"],
  MIL: ["Milwaukee Brewers", "Milwaukee", "Brewers"],
  MIN: ["Minnesota Twins", "Minnesota", "Twins"],
  NYM: ["New York Mets", "New York M", "Mets"],
  NYY: ["New York Yankees", "New York Y", "Yankees"],
  ATH: ["Athletics", "A's", "A's baseball"],
  PHI: ["Philadelphia Phillies", "Philadelphia", "Phillies"],
  PIT: ["Pittsburgh Pirates", "Pittsburgh", "Pirates"],
  SD: ["San Diego Padres", "San Diego", "Padres"],
  SF: ["San Francisco Giants", "San Francisco", "Giants"],
  SEA: ["Seattle Mariners", "Seattle", "Mariners"],
  STL: ["St. Louis Cardinals", "St Louis", "Cardinals"],
  TB: ["Tampa Bay Rays", "Tampa Bay", "Rays"],
  TEX: ["Texas Rangers", "Texas", "Rangers"],
  TOR: ["Toronto Blue Jays", "Toronto", "Blue Jays", "Jays"],
  WSH: ["Washington Nationals", "Washington", "Nationals", "Nats"]
};

const POLITICS_PATTERN = /\b(?:politics|political|election|elections|president|presidential|senate|senator|house race|congress|congressional|primary|primaries|governor|gubernatorial)\b/;
const SPORTS_PATTERN = /\b(?:sports?|game|games|match|matches|team|teams|playoffs?|championship|title odds|win total)\b/;
const WEATHER_PATTERN = /\b(?:weather|climate|temperature|temperatures|forecast|rain|snow|hurricane|hurricanes|tornado|tornadoes|storm|storms|precipitation|heat|cold)\b/;
const BUSINESS_PATTERN = /\b(?:business|businesses|company|companies|corporate|earnings|revenue|customers|subscribers|deliveries|headcount|sales|production|music|artist|artists|spotify|streaming|concert|concerts|tour|tours|venue|festival|coachella|lollapalooza)\b/;
const LOCATION_ONLY_WORDS = new Set([
  "all", "around", "at", "center", "centre", "city", "find", "for", "go", "in", "location", "map", "market", "markets",
  "me", "near", "of", "on", "open", "place", "political", "politics", "show", "sport", "sports", "take", "the", "to", "weather", "business"
]);

export function normalizeSearchText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function isoInEastern(value = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date(value));
  const fields = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function addDays(iso, amount) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dateWindow(query, now) {
  const today = isoInEastern(now);
  if (/\b(?:today|tonight)\b/.test(query)) return { start: today, end: today, label: /tonight/.test(query) ? "tonight" : "today" };
  if (/\btomorrow\b/.test(query)) {
    const tomorrow = addDays(today, 1);
    return { start: tomorrow, end: tomorrow, label: "tomorrow" };
  }
  const nextDays = query.match(/\bnext\s+(\d{1,2})\s+days?\b/);
  if (nextDays) return { start: today, end: addDays(today, Math.min(31, Number(nextDays[1]))), label: `next ${Number(nextDays[1])} days` };
  if (/\bthis week\b/.test(query)) return { start: today, end: addDays(today, 6), label: "this week" };
  if (/\bnext week\b/.test(query)) return { start: addDays(today, 7), end: addDays(today, 13), label: "next week" };
  if (/\b(?:this )?weekend\b/.test(query)) {
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const saturdayOffset = weekday === 0 ? -1 : (6 - weekday + 7) % 7;
    const saturday = addDays(today, saturdayOffset);
    return { start: saturday < today ? today : saturday, end: addDays(saturday, 1), label: "this weekend" };
  }
  return null;
}

export function interpretMarketQuery(value, now = Date.now()) {
  const query = normalizeSearchText(value).slice(0, 160);
  const requiredTags = new Set();
  for (const alias of SPORT_ALIASES) if (alias.pattern.test(query)) alias.tags.forEach(tag => requiredTags.add(tag));
  const hasSportTag = requiredTags.size > 0;
  if (/\bsenate\b/.test(query)) requiredTags.add("senate");
  if (/\b(?:house race|house races|congressional district)\b/.test(query)) requiredTags.add("house");
  if (/\b(?:president|presidential)\b/.test(query)) requiredTags.add("president");
  if (/\b(?:primary|primaries|nominee)\b/.test(query)) requiredTags.add("primary");
  const politicsIntent = POLITICS_PATTERN.test(query);
  const sportsIntent = SPORTS_PATTERN.test(query) || hasSportTag;
  const weatherIntent = WEATHER_PATTERN.test(query);
  const businessIntent = BUSINESS_PATTERN.test(query);
  const explicitCategory = /\bsports?\b/.test(query) ? "sports"
    : /\bpolitics?\b|\bpolitical\b/.test(query) ? "politics"
      : /\bweather\b/.test(query) ? "weather"
        : /\b(?:business(?:es)?|music|spotify|concerts?|tours?|festival)\b/.test(query) ? "business" : null;
  const inferredCategories = [sportsIntent ? "sports" : null, politicsIntent ? "politics" : null, weatherIntent ? "weather" : null, businessIntent ? "business" : null].filter(Boolean);
  const category = explicitCategory || (new Set(inferredCategories).size === 1 ? inferredCategories[0] : null);
  const sort = /\b(?:close|closest|competitive|tight|tightest|coin flip|toss up)\b/.test(query) ? "close"
    : /\b(?:biggest|busiest|high volume|huge|liquid|liquidity|most traded|popular)\b/.test(query) ? "volume"
      : /\b(?:soon|soonest|next|upcoming)\b/.test(query) ? "soon" : "relevance";
  const timing = dateWindow(query, now);
  const liveOnly = /\b(?:live|happening now|right now|currently)\b/.test(query);
  const yearIntent = query.match(/\b(20\d{2})\b/)?.[1] || (/\bnext year\b/.test(query) ? String(new Date(`${isoInEastern(now)}T12:00:00Z`).getUTCFullYear() + 1) : null);
  const tokens = query.split(" ").filter(token => token.length > 1
    && !GENERIC_WORDS.has(token) && !SORT_WORDS.has(token) && !TIME_WORDS.has(token)
    && !/^20\d{2}$/.test(token));
  const aliasWords = new Set(SPORT_ALIASES.flatMap(alias => normalizeSearchText(alias.pattern.source).split(" ")));
  const terms = [...new Set(tokens.filter(token => !aliasWords.has(token) && !/^(sports?|politics?|political|weather|business(?:es)?)$/.test(token)))];
  return { query, category, requiredTags: [...requiredTags], sort, timing, liveOnly, yearIntent, terms };
}

function sportTags(seriesTicker, title = "") {
  const ticker = String(seriesTicker || "").toUpperCase();
  const text = String(title || "").toLowerCase();
  if (/KXMLB|KXLMB|KXKBO|KXNPB/.test(ticker) || /baseball|beisbol/.test(text)) return ["sports", "baseball", ticker.startsWith("KXMLB") ? "mlb" : "international baseball"];
  if (/KXNFL|KXSB/.test(ticker) || /super bowl|\bnfl\b/.test(text)) return ["sports", "nfl", "football"];
  if (/KXNCAAF/.test(ticker) || /college football|ncaaf/.test(text)) return ["sports", "cfb", "football"];
  if (/KXWNBA/.test(ticker) || /\bwnba\b/.test(text)) return ["sports", "wnba", "basketball"];
  if (/KXNBA/.test(ticker) || /\bnba\b/.test(text)) return ["sports", "nba", "basketball"];
  if (/KXNHL/.test(ticker) || /stanley cup|\bnhl\b/.test(text)) return ["sports", "nhl", "hockey"];
  if (/KXATP|KXWTA/.test(ticker) || /tennis/.test(text)) return ["sports", "tennis", ticker.includes("WTA") ? "wta" : "atp"];
  if (/KXPGA|KXLPGA/.test(ticker) || /golf/.test(text)) return ["sports", "golf"];
  if (/KXF1/.test(ticker) || /formula 1|grand prix/.test(text)) return ["sports", "f1", "racing"];
  if (/KXIPL|KXT20|KXTEST|KXHUNDRED/.test(ticker) || /cricket/.test(text)) return ["sports", "cricket"];
  if (/KXAFL/.test(ticker) || /australian football/.test(text)) return ["sports", "afl", "football"];
  if (/KXEPL|KXUCL|KXLALIGA|KXBUNDESLIGA|KXSERIEA|KXLIGUE1|KXBRASILEIR|KXLIGAMX|KXARG|KXMLS|KXCHNSL|KXKLEAGUE|KXALLSVENSKAN|KXELITESERIEN/.test(ticker)
    || /soccer|major league soccer|\bmls\b|premier league|champions league|la liga|bundesliga|serie a|ligue 1|liga mx/.test(text)) {
    const region = /KXEPL|KXUCL|KXLALIGA|KXBUNDESLIGA|KXSERIEA|KXLIGUE1|KXALLSVENSKAN|KXELITESERIEN/.test(ticker) ? "europe" : "international";
    return ["sports", "soccer", "football", ...(ticker.startsWith("KXMLS") || /major league soccer|\bmls\b/.test(text) ? ["mls"] : []), region];
  }
  return ["sports"];
}

function displayPrice(market) {
  if (market?.price != null) return Number(market.price);
  if (market?.lastPrice != null) return Number(market.lastPrice);
  if (market?.yesBid != null && market?.yesAsk != null) return (Number(market.yesBid) + Number(market.yesAsk)) / 2;
  return market?.yesAsk ?? market?.yesBid ?? null;
}

function mlbAliasesForTicker(seriesTicker, ticker) {
  if (!String(seriesTicker || "").toUpperCase().startsWith("KXMLB")) return [];
  const normalizedTicker = String(ticker || "").toUpperCase();
  const code = normalizedTicker.slice(normalizedTicker.lastIndexOf("-") + 1);
  return MLB_SEARCH_TEAMS[code] ? [code, ...MLB_SEARCH_TEAMS[code]] : [];
}

function mlbAliasesForCandidate(candidate) {
  if (!String(candidate.seriesTicker || "").toUpperCase().startsWith("KXMLB")) return [];
  const displayText = ` ${normalizeSearchText([
    candidate.title, candidate.subtitle,
    ...(candidate.allOutcomes || []).flatMap(market => [market.name, market.label, market.title, market.subtitle])
  ].filter(Boolean).join(" "))} `;
  const aliases = [];
  for (const [code, names] of Object.entries(MLB_SEARCH_TEAMS)) {
    const tickerMatch = (candidate.allOutcomes || []).some(market => mlbAliasesForTicker(candidate.seriesTicker, market.ticker)[0] === code);
    const displayMatch = names.some(name => displayText.includes(` ${normalizeSearchText(name)} `));
    if (tickerMatch || displayMatch) aliases.push(code, ...names);
  }
  return aliases;
}

function outcomePreview(markets, queryTerms, seriesTicker = "") {
  const terms = new Set(queryTerms);
  return (markets || []).map(market => ({
    name: canonicalSportsOutcomeName(market.name || market.label || market.title || market.ticker, { seriesTicker, ticker: market.ticker }),
    ticker: market.ticker,
    price: displayPrice(market),
    volume: Number(market.volume || 0),
    searchAliases: mlbAliasesForTicker(seriesTicker, market.ticker)
  })).sort((left, right) => {
    const leftText = normalizeSearchText([left.name, ...left.searchAliases].join(" ")).split(" ");
    const rightText = normalizeSearchText([right.name, ...right.searchAliases].join(" ")).split(" ");
    const leftMatch = [...terms].some(term => leftText.some(token => token === term || (term.length >= 3 && token.startsWith(term))));
    const rightMatch = [...terms].some(term => rightText.some(token => token === term || (term.length >= 3 && token.startsWith(term))));
    return Number(rightMatch) - Number(leftMatch) || right.volume - left.volume || Number(right.price || 0) - Number(left.price || 0);
  }).slice(0, 3).map(({ searchAliases, ...market }) => market);
}

function sportsCandidates(payload, futures) {
  const snapshots = [...(payload?.events || []), ...Object.values(futures?.sports || {}).flat()];
  const seen = new Set();
  return snapshots.filter(snapshot => snapshot?.eventTicker
    && !/closed|settled|finalized|determined|resolved/.test(String(snapshot.status || "").toLowerCase())
    && (snapshot.markets || []).some(market => !/closed|settled|finalized|determined|resolved/.test(String(market.status || "").toLowerCase()))
    && !seen.has(snapshot.eventTicker) && seen.add(snapshot.eventTicker)).map(snapshot => {
    const tags = sportTags(snapshot.seriesTicker, `${snapshot.title} ${snapshot.subtitle}`);
    const outcomes = outcomePreview(snapshot.markets, [], snapshot.seriesTicker);
    return {
      id: `sports:${snapshot.eventTicker}`,
      category: "sports",
      type: snapshot.futuresKind ? "future" : "event",
      eventTicker: snapshot.eventTicker,
      seriesTicker: snapshot.seriesTicker,
      title: canonicalSportsMatchupTitle(snapshot.title || snapshot.eventTicker, { seriesTicker: snapshot.seriesTicker }),
      subtitle: snapshot.subtitle || "",
      startsAt: snapshot.startsAt || null,
      endsAt: snapshot.endsAt || null,
      status: snapshot.status || "",
      volume: Number(snapshot.volume || 0),
      tags,
      outcomes,
      allOutcomes: snapshot.markets || [],
      url: `https://kalshi.com/markets_by_ticker/${String(outcomes[0]?.ticker || snapshot.eventTicker).toLowerCase()}`
    };
  });
}

function politicsCandidates(payload) {
  const seen = new Set();
  return (payload?.bundles || []).flatMap(bundle => (bundle.markets || []).filter(market => {
    if (!market?.eventTicker || seen.has(market.eventTicker)) return false;
    seen.add(market.eventTicker);
    return true;
  }).map(market => {
    const explicitMarketText = normalizeSearchText(`${market.title || ""} ${market.eventTicker || ""} ${market.seriesTicker || ""}`);
    return ({
    id: `politics:${market.eventTicker}:${bundle.id}`,
    category: "politics",
    type: market.stage === "primary" ? "primary" : "election",
    bundleId: bundle.id,
    eventTicker: market.eventTicker,
    seriesTicker: market.seriesTicker,
    title: market.title || market.eventTicker,
    subtitle: [bundle.jurisdiction, bundle.capital, market.subtitle].filter(Boolean).join(" · "),
    startsAt: bundle.dateKey ? `${bundle.dateKey}T12:00:00Z` : null,
    endsAt: bundle.dateKey ? `${bundle.dateKey}T23:59:59Z` : null,
    status: "active",
    volume: Number(market.volume || 0),
    tags: ["politics", "election",
      /\bsenat(?:e|or)\b/.test(explicitMarketText) ? "senate" : "",
      /\bhouse\b|\bcongressional district\b/.test(explicitMarketText) ? "house" : "",
      /\bpresident(?:ial)?\b/.test(explicitMarketText) ? "president" : "",
      /\bprimary\b|\bnominee\b/.test(explicitMarketText) ? "primary" : ""
    ].filter(Boolean),
    outcomes: outcomePreview(market.outcomes, []),
    allOutcomes: market.outcomes || [],
    url: market.url || politicsMarketUrl(market)
  });
  }));
}

function weatherCandidates(payload) {
  return (payload?.bundles || []).flatMap(bundle => {
    const seen = new Set();
    return (bundle.markets || []).filter(market => {
      if (!market?.eventTicker || seen.has(market.eventTicker)) return false;
      seen.add(market.eventTicker);
      return true;
    }).map(market => ({
      id: `weather:${market.eventTicker}:${bundle.id}`,
      category: "weather",
      type: "weather",
      bundleId: bundle.id,
      eventTicker: market.eventTicker,
      seriesTicker: market.seriesTicker,
      title: market.title || market.eventTicker,
      subtitle: [bundle.name, bundle.location, market.kind, market.horizon].filter(Boolean).join(" · "),
      startsAt: null,
      endsAt: null,
      status: "active",
      volume: Number(market.volume || 0),
      tags: ["weather", String(market.kind || bundle.kind || "").toLowerCase(), String(market.horizon || bundle.horizon || "").toLowerCase()].filter(Boolean),
      outcomes: outcomePreview(market.outcomes, []),
      allOutcomes: market.outcomes || [],
      url: market.url || `https://kalshi.com/markets/${String(market.seriesTicker || "").toLowerCase()}/${String(market.eventTicker || "").toLowerCase()}`
    }));
  });
}

function businessCandidates(payload) {
  return (payload?.bundles || []).flatMap(bundle => (bundle.markets || []).map(market => ({
    id: `business:${market.eventTicker}:${bundle.id}`,
    category: "business",
    type: "business",
    bundleId: bundle.id,
    eventTicker: market.eventTicker,
    seriesTicker: market.seriesTicker,
    title: market.title || market.eventTicker,
    subtitle: [bundle.name, bundle.location, market.kind].filter(Boolean).join(" · "),
    startsAt: null,
    endsAt: market.endsAt || null,
    status: "active",
    volume: Number(market.volume || 0),
    tags: ["business", String(market.kind || bundle.kind || "").toLowerCase() === "music" ? "music" : "company", String(market.kind || bundle.kind || "").toLowerCase(), String(bundle.code || "").toLowerCase()].filter(Boolean),
    outcomes: outcomePreview(market.outcomes, []),
    allOutcomes: market.outcomes || [],
    url: market.url || `https://kalshi.com/markets_by_ticker/${String(market.eventTicker || "").toLowerCase()}`
  })));
}

function navigationLocations(politics, weather, business) {
  const locations = new Map();
  const add = location => {
    const lat = Number(location?.lat);
    const lon = Number(location?.lon);
    if (!location?.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const key = normalizeSearchText(location.name);
    const existing = locations.get(key);
    const aliases = [...new Set([...(existing?.aliases || []), ...(location.aliases || []), location.name, location.region].filter(Boolean).map(normalizeSearchText))];
    locations.set(key, { ...existing, ...location, lat, lon, aliases });
  };
  SEARCH_LOCATIONS.forEach(add);
  for (const bundle of weather?.bundles || []) {
    add({
      id: `place-${bundle.id}`,
      name: bundle.name,
      region: bundle.location,
      lat: bundle.lat,
      lon: bundle.lon,
      aliases: [bundle.name, bundle.location]
    });
  }
  for (const bundle of politics?.bundles || []) {
    add({
      id: `place-${bundle.id}`,
      name: bundle.jurisdiction || bundle.capital,
      region: [bundle.capital, bundle.scope].filter(Boolean).join(" · "),
      lat: bundle.lat,
      lon: bundle.lon,
      aliases: [bundle.jurisdiction, bundle.capital, bundle.code]
    });
  }
  for (const bundle of business?.bundles || []) {
    add({
      id: `place-${bundle.id}`,
      name: bundle.name,
      region: bundle.location,
      lat: bundle.lat,
      lon: bundle.lon,
      aliases: [bundle.name, bundle.code, bundle.location]
    });
  }
  return [...locations.values()];
}

function navigationResults(intent, { politics, weather, business }, activeCategory) {
  const targetCategory = intent.category || (["sports", "politics", "weather", "business"].includes(activeCategory) ? activeCategory : "sports");
  const paddedQuery = ` ${intent.query} `;
  const matches = [];
  for (const location of navigationLocations(politics, weather, business)) {
    const aliases = [...new Set(location.aliases.map(normalizeSearchText))]
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);
    const alias = aliases.find(value => paddedQuery.includes(` ${value} `));
    if (!alias) continue;
    const remainder = normalizeSearchText(intent.query.replace(new RegExp(`(^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`, "i"), " "));
    const remainderTerms = remainder.split(" ").filter(Boolean).filter(term => !LOCATION_ONLY_WORDS.has(term));
    const locationOnly = remainderTerms.length === 0;
    const exact = intent.query === alias;
    const score = (exact ? 500 : 0) + (locationOnly ? 260 : 0) + alias.length * 3;
    matches.push({ location, alias, locationOnly, score });
  }
  matches.sort((left, right) => right.score - left.score || right.alias.length - left.alias.length || left.location.name.localeCompare(right.location.name));
  const seenCoordinates = new Set();
  const uniqueMatches = matches.filter(({ location }) => {
    const key = `${Number(location.lat).toFixed(3)}:${Number(location.lon).toFixed(3)}`;
    if (seenCoordinates.has(key)) return false;
    seenCoordinates.add(key);
    return true;
  });
  return uniqueMatches.slice(0, 3).map(({ location, locationOnly }) => ({
    id: `location:${targetCategory}:${location.id}`,
    category: targetCategory,
    type: "location",
    title: location.name,
    subtitle: location.region || "Map location",
    matchReason: `Center the ${targetCategory[0].toUpperCase() + targetCategory.slice(1)} globe`,
    lat: location.lat,
    lon: location.lon,
    scale: 1050,
    locationOnly,
    volume: null,
    outcomes: []
  }));
}

function candidateDate(candidate) {
  const value = candidate.startsAt || candidate.endsAt;
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? isoInEastern(timestamp) : null;
}

function isLive(candidate, now) {
  const start = new Date(candidate.startsAt || 0).getTime();
  const end = new Date(candidate.endsAt || candidate.startsAt || 0).getTime();
  return Number.isFinite(start) && start <= now && (!Number.isFinite(end) || end >= now)
    && !/closed|settled|finalized|determined/.test(String(candidate.status).toLowerCase());
}

function searchableText(candidate) {
  const marketAliases = mlbAliasesForCandidate(candidate);
  return normalizeSearchText([
    candidate.title, candidate.subtitle, candidate.eventTicker, candidate.seriesTicker, ...candidate.tags,
    ...(candidate.allOutcomes || []).flatMap(market => [market.name, market.label, market.title, market.subtitle, market.ticker]),
    ...marketAliases
  ].filter(Boolean).join(" "));
}

function closeness(candidate) {
  const prices = (candidate.allOutcomes || []).map(displayPrice).filter(price => Number.isFinite(price));
  return prices.length ? Math.min(...prices.map(price => Math.abs(50 - price))) : 50;
}

function relativeDate(candidate, now) {
  const date = candidateDate(candidate);
  if (!date) return null;
  const today = isoInEastern(now);
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const days = Math.round((new Date(`${date}T12:00:00Z`) - new Date(`${today}T12:00:00Z`)) / 86400000);
  if (days > 1 && days < 7) return `in ${days} days`;
  return date;
}

export function searchMarkets(value, { sports = null, politics = null, weather = null, business = null, futures = null } = {}, options = {}) {
  const now = Number(options.now || Date.now());
  const limit = Math.max(1, Math.min(20, Number(options.limit || 12)));
  const intent = interpretMarketQuery(value, now);
  if (intent.query.length < 2) return { query: intent.query, interpretation: intent, total: 0, results: [] };
  const candidates = [...sportsCandidates(sports, futures), ...politicsCandidates(politics), ...weatherCandidates(weather), ...businessCandidates(business)];
  const scored = [];
  for (const candidate of candidates) {
    if (intent.category && candidate.category !== intent.category) continue;
    if (intent.requiredTags.length && !intent.requiredTags.every(tag => candidate.tags.includes(tag))) continue;
    if (intent.liveOnly && !isLive(candidate, now)) continue;
    const date = candidateDate(candidate);
    if (intent.timing && (!date || date < intent.timing.start || date > intent.timing.end)) continue;
    if (intent.yearIntent && (!date || !date.startsWith(intent.yearIntent))) continue;
    const text = searchableText(candidate);
    const compactTicker = normalizeSearchText(`${candidate.eventTicker} ${candidate.seriesTicker}`).replace(/ /g, "");
    const compactQuery = intent.query.replace(/ /g, "");
    let score = compactQuery.length >= 4 && compactTicker.includes(compactQuery) ? 700 : 0;
    const matchedTerms = [];
    for (const term of intent.terms) {
      const tokens = text.split(" ");
      const exact = tokens.includes(term);
      const prefix = !exact && term.length >= 3 && tokens.some(token => token.length >= 3 && (token.startsWith(term) || term.startsWith(token)));
      const phrase = !exact && !prefix && text.includes(term);
      if (exact || prefix || phrase) {
        matchedTerms.push(term);
        score += exact ? 58 : prefix ? 34 : 20;
      }
    }
    const minimumMatches = intent.terms.length <= 2 ? intent.terms.length : Math.ceil(intent.terms.length * 0.6);
    if (matchedTerms.length < minimumMatches) continue;
    if (!intent.terms.length) score += 30;
    if (text.includes(intent.query)) score += 180;
    if (intent.timing) score += 45;
    if (intent.liveOnly) score += 55;
    score += Math.min(40, Math.log10(candidate.volume + 1) * 7);
    const outcomes = outcomePreview(candidate.allOutcomes, matchedTerms, candidate.seriesTicker);
    const matchReason = [
      matchedTerms.length ? `matched ${matchedTerms.slice(0, 3).join(", ")}` : null,
      intent.liveOnly ? "live now" : relativeDate(candidate, now),
      intent.sort === "volume" ? "ranked by volume" : intent.sort === "close" ? "closest price" : null
    ].filter(Boolean).join(" · ");
    scored.push({ ...candidate, outcomes, score, matchReason, date });
  }
  scored.sort((left, right) => intent.sort === "volume" ? right.volume - left.volume || right.score - left.score
    : intent.sort === "close" ? closeness(left) - closeness(right) || right.volume - left.volume
      : intent.sort === "soon" ? new Date(left.startsAt || "9999") - new Date(right.startsAt || "9999") || right.score - left.score
        : right.volume - left.volume || right.score - left.score);
  const marketResults = scored.map(({ allOutcomes, score, tags, ...result }) => result);
  const mapResults = navigationResults(intent, { politics, weather, business }, options.activeCategory);
  const primaryMapResults = mapResults.filter(result => result.locationOnly);
  const secondaryMapResults = mapResults.filter(result => !result.locationOnly);
  const results = [...primaryMapResults, ...marketResults, ...secondaryMapResults].slice(0, limit);
  const context = [intent.category ? intent.category[0].toUpperCase() + intent.category.slice(1) : "All categories", intent.timing?.label,
    intent.liveOnly ? "live" : null, intent.sort === "close" ? "closest prices first" : intent.sort === "soon" ? "soonest first" : "highest volume first"]
    .filter(Boolean).join(" · ");
  return {
    query: intent.query,
    interpretation: { ...intent, context },
    total: scored.length + mapResults.length,
    marketTotal: scored.length,
    locationTotal: mapResults.length,
    results
  };
}
