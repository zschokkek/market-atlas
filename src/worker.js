import { classifyPoliticsLocations, houseRaceRevealScale, MAJOR_SENATE_PRIMARY_VOLUME, politicsMarketUrl, politicsParty, politicsTimeline } from "./politics-registry.js";
import { searchMarkets } from "./market-search.js";
import { buildWeatherPublicSnapshot, resolveWeatherLocations } from "./weather-registry.js";

const API_ORIGIN = "https://external-api.kalshi.com/trade-api/v2";
const STATE_KEY = "kalshi:sports:state:v2";
const PUBLIC_KEY = "kalshi:sports:public:v2";
const MLB_FUTURES_STATE_KEY = "kalshi:team-futures:manifest:v2:MLB";
const TEAM_FUTURES_STATE_KEY = "kalshi:team-futures:manifest:v3";
const FUTURES_PIPELINE_STATE_KEY = "kalshi:team-futures:pipeline:v1";
const TEAM_FUTURES_KEY_PREFIX = "kalshi:team-futures:v2";
const POLITICS_STATE_KEY = "kalshi:politics:state:v1";
const POLITICS_PUBLIC_KEY = "kalshi:politics:public:v1";
const WEATHER_STATE_KEY = "kalshi:weather:state:v1";
const WEATHER_PUBLIC_KEY = "kalshi:weather:public:v1";
const GEOGRAPHIC_DISCOVERY_INTERVAL_MS = 60 * 60 * 1000;
const SCHEDULED_REFRESH_COOLDOWN_MS = 45 * 1000;
export const SCHEDULED_REFRESH_STEPS = ["geographic", "sports", "futures"];

export const DEFAULT_SERIES = [
  "KXMLBGAME", "KXMLBKS", "KXMLBHRR", "KXNFLGAME", "KXNCAAFGAME", "KXNBAGAME", "KXWNBAGAME", "KXNHLGAME", "KXAFLGAME",
  "KXEPLGAME", "KXUCLGAME", "KXLALIGAGAME", "KXBUNDESLIGAGAME", "KXSERIEAGAME", "KXLIGUE1GAME",
  "KXBRASILEIROGAME", "KXLIGAMXGAME", "KXARGPREMDIVGAME",
  "KXCHNSLGAME", "KXKLEAGUEGAME", "KXALLSVENSKANGAME", "KXELITESERIENGAME",
  "KXLMBGAME", "KXKBOGAME", "KXNPBGAME",
  "KXIPLGAME", "KXHUNDREDMATCH", "KXWHUNDREDMATCH", "KXT20MATCH", "KXTESTMATCH",
  "KXATP", "KXWTA", "KXATPMATCH", "KXWTAMATCH", "KXPGATOUR", "KXLPGATOUR", "KXF1RACE"
];

const DISCOVERY_INTERVAL_MS = 60 * 60 * 1000;
const PREGAME_WINDOW_MS = 2 * 60 * 60 * 1000;
const LIVE_WINDOW_MS = 5 * 60 * 60 * 1000;
const LIVE_INTERVAL_MS = 60 * 1000;
const PREGAME_INTERVAL_MS = 5 * 60 * 1000;
const TODAY_INTERVAL_MS = 15 * 60 * 1000;
const BASE_INTERVAL_MS = 60 * 60 * 1000;
const RETAIN_AFTER_START_MS = 7 * 24 * 60 * 60 * 1000;
const MLB_FUTURES_INTERVAL_MS = 24 * 60 * 60 * 1000;
const FUTURES_POLL_LOCK_MS = 20 * 60 * 1000;
const LOCAL_SCHEDULER_INTERVAL_MS = 60 * 1000;
const NEAR_TERM_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;
let localPollPromise = null;
let localPoliticsPollPromise = null;
let localWeatherPollPromise = null;

export const MLB_TEAMS = {
  AZ: ["Arizona Diamondbacks", "Arizona", "Diamondbacks"], ATL: ["Atlanta Braves", "Atlanta", "Braves"],
  BAL: ["Baltimore Orioles", "Baltimore", "Orioles"], BOS: ["Boston Red Sox", "Boston", "Red Sox"],
  CHC: ["Chicago Cubs", "Chicago C", "Cubs"], CWS: ["Chicago White Sox", "Chicago WS", "White Sox"],
  CIN: ["Cincinnati Reds", "Cincinnati", "Reds"], CLE: ["Cleveland Guardians", "Cleveland", "Guardians"],
  COL: ["Colorado Rockies", "Colorado", "Rockies"], DET: ["Detroit Tigers", "Detroit", "Tigers"],
  HOU: ["Houston Astros", "Houston", "Astros"], KC: ["Kansas City Royals", "Kansas City", "Royals"],
  LAA: ["Los Angeles Angels", "Los Angeles A", "Angels"], LAD: ["Los Angeles Dodgers", "Los Angeles D", "Dodgers"],
  MIA: ["Miami Marlins", "Miami", "Marlins"], MIL: ["Milwaukee Brewers", "Milwaukee", "Brewers"],
  MIN: ["Minnesota Twins", "Minnesota", "Twins"], NYM: ["New York Mets", "New York M", "Mets"],
  NYY: ["New York Yankees", "New York Y", "Yankees"], ATH: ["Athletics", "A's", "Athletics"],
  PHI: ["Philadelphia Phillies", "Philadelphia", "Phillies"], PIT: ["Pittsburgh Pirates", "Pittsburgh", "Pirates"],
  SD: ["San Diego Padres", "San Diego", "Padres"], SF: ["San Francisco Giants", "San Francisco", "Giants"],
  SEA: ["Seattle Mariners", "Seattle", "Mariners"], STL: ["St. Louis Cardinals", "St Louis", "Cardinals"],
  TB: ["Tampa Bay Rays", "Tampa Bay", "Rays"], TEX: ["Texas Rangers", "Texas", "Rangers"],
  TOR: ["Toronto Blue Jays", "Toronto", "Blue Jays"], WSH: ["Washington Nationals", "Washington", "Nationals"]
};

const MLB_SHARED_FUTURES_SERIES = {
  KXMLB: "World Series title",
  KXMLBPLAYOFFS: "Make the playoffs",
  KXMLBALEAST: "AL East winner",
  KXMLBALCENT: "AL Central winner",
  KXMLBALWEST: "AL West winner",
  KXMLBNLEAST: "NL East winner",
  KXMLBNLCENT: "NL Central winner",
  KXMLBNLWEST: "NL West winner"
};

const MLB_TEAM_DIVISION_SERIES = {
  BAL: "KXMLBALEAST", BOS: "KXMLBALEAST", NYY: "KXMLBALEAST", TB: "KXMLBALEAST", TOR: "KXMLBALEAST",
  CWS: "KXMLBALCENT", CLE: "KXMLBALCENT", DET: "KXMLBALCENT", KC: "KXMLBALCENT", MIN: "KXMLBALCENT",
  ATH: "KXMLBALWEST", HOU: "KXMLBALWEST", LAA: "KXMLBALWEST", SEA: "KXMLBALWEST", TEX: "KXMLBALWEST",
  ATL: "KXMLBNLEAST", MIA: "KXMLBNLEAST", NYM: "KXMLBNLEAST", PHI: "KXMLBNLEAST", WSH: "KXMLBNLEAST",
  CHC: "KXMLBNLCENT", CIN: "KXMLBNLCENT", MIL: "KXMLBNLCENT", PIT: "KXMLBNLCENT", STL: "KXMLBNLCENT",
  AZ: "KXMLBNLWEST", COL: "KXMLBNLWEST", LAD: "KXMLBNLWEST", SD: "KXMLBNLWEST", SF: "KXMLBNLWEST"
};

const MLB_PLAYER_PROP_SERIES = new Set(["KXMLBKS", "KXMLBHRR"]);

export const SUPPORTED_TEAM_FUTURES_SPORTS = new Set([
  "MLB", "NFL", "CFB", "NBA", "WNBA", "NHL",
  "EPL", "UCL", "LALIGA", "BUNDESLIGA", "SERIEA", "LIGUE1",
  "BRASILEIRAO", "LIGAMX", "ARGPRIMERA"
]);

const TEAM_FUTURES_FALLBACK_SERIES = [
  { ticker: "KXSB", sport: "NFL", kind: "title", title: "NFL champion" },
  { ticker: "KXNFLNFCCHAMP", sport: "NFL", kind: "conference", title: "NFC champion" },
  { ticker: "KXNFLAFCCHAMP", sport: "NFL", kind: "conference", title: "AFC champion" },
  { ticker: "KXNFLPLAYOFF", sport: "NFL", kind: "playoffs", title: "NFL playoff qualifier" },
  { ticker: "KXNFLWINS", sport: "NFL", kind: "regularSeasonWins", title: "NFL win totals" },
  { ticker: "KXNFL1SEED", sport: "NFL", kind: "seed", title: "NFL No. 1 seed" },
  { ticker: "KXNFLAFCWEST", sport: "NFL", kind: "division", title: "AFC West winner" },
  { ticker: "KXNFLAFCNORTH", sport: "NFL", kind: "division", title: "AFC North winner" },
  { ticker: "KXNFLAFCSOUTH", sport: "NFL", kind: "division", title: "AFC South winner" },
  { ticker: "KXNFLAFCEAST", sport: "NFL", kind: "division", title: "AFC East winner" },
  { ticker: "KXNFLNFCWEST", sport: "NFL", kind: "division", title: "NFC West winner" },
  { ticker: "KXNFLNFCNORTH", sport: "NFL", kind: "division", title: "NFC North winner" },
  { ticker: "KXNFLNFCSOUTH", sport: "NFL", kind: "division", title: "NFC South winner" },
  { ticker: "KXNFLNFCEAST", sport: "NFL", kind: "division", title: "NFC East winner" },
  { ticker: "KXNBA", sport: "NBA", kind: "title", title: "NBA champion" },
  { ticker: "KXNBAEAST", sport: "NBA", kind: "conference", title: "Eastern Conference champion" },
  { ticker: "KXNBAWEST", sport: "NBA", kind: "conference", title: "Western Conference champion" },
  { ticker: "KXNBAPLAYOFF", sport: "NBA", kind: "playoffs", title: "NBA playoff qualifier" },
  { ticker: "KXNBAWINS", sport: "NBA", kind: "regularSeasonWins", title: "NBA win totals" },
  { ticker: "KXNBAEAST1SEED", sport: "NBA", kind: "seed", title: "NBA East No. 1 seed" },
  { ticker: "KXNBAWEST1SEED", sport: "NBA", kind: "seed", title: "NBA West No. 1 seed" },
  { ticker: "KXNBACUP", sport: "NBA", kind: "cup", title: "NBA Cup champion" },
  { ticker: "KXNBASOUTHEAST", sport: "NBA", kind: "division", title: "NBA Southeast winner" },
  { ticker: "KXNBAPACIFIC", sport: "NBA", kind: "division", title: "NBA Pacific winner" },
  { ticker: "KXNBAATLANTIC", sport: "NBA", kind: "division", title: "NBA Atlantic winner" },
  { ticker: "KXNBASOUTHWEST", sport: "NBA", kind: "division", title: "NBA Southwest winner" },
  { ticker: "KXNBANORTHWEST", sport: "NBA", kind: "division", title: "NBA Northwest winner" },
  { ticker: "KXNBACENTRAL", sport: "NBA", kind: "division", title: "NBA Central winner" },
  { ticker: "KXWNBA", sport: "WNBA", kind: "title", title: "WNBA champion" },
  { ticker: "KXWNBAPLAYOFF", sport: "WNBA", kind: "playoffs", title: "WNBA playoff qualifier" },
  { ticker: "KXWNBAWINS", sport: "WNBA", kind: "regularSeasonWins", title: "WNBA win totals" },
  { ticker: "KXWNBA1SEED", sport: "WNBA", kind: "seed", title: "WNBA No. 1 seed" },
  { ticker: "KXWNBACCUP", sport: "WNBA", kind: "cup", title: "Commissioner's Cup winner" },
  { ticker: "KXNHL", sport: "NHL", kind: "title", title: "Stanley Cup winner" },
  { ticker: "KXNHLEAST", sport: "NHL", kind: "conference", title: "Eastern Conference winner" },
  { ticker: "KXNHLWEST", sport: "NHL", kind: "conference", title: "Western Conference winner" },
  { ticker: "KXNHLPLAYOFF", sport: "NHL", kind: "playoffs", title: "NHL playoff qualifier" },
  { ticker: "KXNHLPACIFIC", sport: "NHL", kind: "division", title: "NHL Pacific winner" },
  { ticker: "KXNHLATLANTIC", sport: "NHL", kind: "division", title: "NHL Atlantic winner" },
  { ticker: "KXNHLCENTRAL", sport: "NHL", kind: "division", title: "NHL Central winner" },
  { ticker: "KXNHLMETROPOLITAN", sport: "NHL", kind: "division", title: "NHL Metropolitan winner" },
  { ticker: "KXNHLPRES", sport: "NHL", kind: "bestRecord", title: "Presidents' Trophy winner" },
  { ticker: "KXNCAAF", sport: "CFB", kind: "title", title: "College football champion" },
  { ticker: "KXNCAAFPLAYOFF", sport: "CFB", kind: "playoffs", title: "College Football Playoff qualifier" },
  { ticker: "KXNCAAFWINS", sport: "CFB", kind: "regularSeasonWins", title: "College football win totals" },
  { ticker: "KXNCAAFTOPSEED", sport: "CFB", kind: "seed", title: "College Football Playoff top seed" },
  { ticker: "KXPREMIERLEAGUE", sport: "EPL", kind: "title", title: "Premier League champion" },
  { ticker: "KXEPLTOP2", sport: "EPL", kind: "top2", title: "EPL top two" },
  { ticker: "KXEPLTOP4", sport: "EPL", kind: "top4", title: "EPL top four" },
  { ticker: "KXEPLTOPHALF", sport: "EPL", kind: "topHalf", title: "EPL top half" },
  { ticker: "KXEPLRELEGATION", sport: "EPL", kind: "relegation", title: "EPL relegation" },
  { ticker: "KXUCL", sport: "UCL", kind: "title", title: "Champions League winner" },
  { ticker: "KXUCLADVANCE", sport: "UCL", kind: "advance", title: "Champions League advance" },
  { ticker: "KXUCLTOP8", sport: "UCL", kind: "top8", title: "Champions League top eight" },
  { ticker: "KXLALIGA", sport: "LALIGA", kind: "title", title: "La Liga champion" },
  { ticker: "KXLALIGATOP4", sport: "LALIGA", kind: "top4", title: "La Liga top four" },
  { ticker: "KXLALIGARELEGATION", sport: "LALIGA", kind: "relegation", title: "La Liga relegation" },
  { ticker: "KXBUNDESLIGA", sport: "BUNDESLIGA", kind: "title", title: "Bundesliga champion" },
  { ticker: "KXBUNDESLIGATOP4", sport: "BUNDESLIGA", kind: "top4", title: "Bundesliga top four" },
  { ticker: "KXBUNDESLIGARELEGATION", sport: "BUNDESLIGA", kind: "relegation", title: "Bundesliga relegation" },
  { ticker: "KXSERIEA", sport: "SERIEA", kind: "title", title: "Serie A champion" },
  { ticker: "KXSERIEATOP4", sport: "SERIEA", kind: "top4", title: "Serie A top four" },
  { ticker: "KXSERIEARELEGATION", sport: "SERIEA", kind: "relegation", title: "Serie A relegation" },
  { ticker: "KXLIGUE1", sport: "LIGUE1", kind: "title", title: "Ligue 1 champion" },
  { ticker: "KXLIGUE1TOP4", sport: "LIGUE1", kind: "top4", title: "Ligue 1 top four" },
  { ticker: "KXLIGUE1RELEGATION", sport: "LIGUE1", kind: "relegation", title: "Ligue 1 relegation" },
  { ticker: "KXBRASILEIRO", sport: "BRASILEIRAO", kind: "title", title: "Brasileirão champion" },
  { ticker: "KXBRASILEIRORELEGATION", sport: "BRASILEIRAO", kind: "relegation", title: "Brasileirão relegation" },
  { ticker: "KXLIGAMX", sport: "LIGAMX", kind: "title", title: "Liga MX champion" }
];

const FUTURES_KIND_ORDER = new Map([
  ["title", 0], ["conference", 1], ["division", 2], ["playoffs", 3], ["regularSeasonWins", 4],
  ["finalist", 5], ["advance", 6], ["top2", 7], ["top4", 8], ["top8", 9], ["topHalf", 10],
  ["relegation", 11], ["seed", 12], ["cup", 13], ["bestRecord", 14], ["worstRecord", 15]
]);

function futuresSportForSeries(series) {
  const ticker = String(series?.ticker || "").toUpperCase();
  const text = `${series?.title || ""} ${(series?.tags || []).join(" ")}`.toLowerCase();
  if (ticker === "KXSB" || ticker.startsWith("KXNFL") || /\bnfl\b|pro football|super bowl/.test(text)) return "NFL";
  if (ticker.startsWith("KXNCAAF") || /college football|\bncaaf\b/.test(text)) return "CFB";
  if (ticker.startsWith("KXWNBA") || /\bwnba\b/.test(text)) return "WNBA";
  if (ticker.startsWith("KXNBA") || /\bnba\b|pro basketball/.test(text)) return "NBA";
  if (ticker.startsWith("KXNHL") || /\bnhl\b|stanley cup/.test(text)) return "NHL";
  if (ticker.startsWith("KXPREMIERLEAGUE") || ticker.startsWith("KXEPL") || /english premier league|\bepl\b/.test(text)) return "EPL";
  if (ticker.startsWith("KXUCL") || ticker.startsWith("KXUEFACL") || /uefa champions league/.test(text)) return "UCL";
  if (ticker.startsWith("KXLALIGA") || /la liga/.test(text)) return "LALIGA";
  if (ticker.startsWith("KXBUNDESLIGA") || /bundesliga/.test(text)) return "BUNDESLIGA";
  if (ticker.startsWith("KXSERIEA") || /serie a/.test(text)) return "SERIEA";
  if (ticker.startsWith("KXLIGUE1") || /ligue 1/.test(text)) return "LIGUE1";
  if (ticker.startsWith("KXBRASILEIR") || /brasileir[aã]o/.test(text)) return "BRASILEIRAO";
  if (ticker.startsWith("KXLIGAMX") || /liga mx/.test(text)) return "LIGAMX";
  if (ticker.startsWith("KXARG") || /argentin|primera divisi[oó]n/.test(text)) return "ARGPRIMERA";
  return null;
}

function futuresKindForSeries(series) {
  const ticker = String(series?.ticker || "").toUpperCase();
  const title = String(series?.title || "").toLowerCase().trim();
  const text = `${title} ${(series?.tags || []).join(" ")}`.toLowerCase();
  if (/next team|next club|award|coach|manager|draft|head[- ]to[- ]head|stage of elimination|first opponent/.test(text)) return null;
  if (/\b(?:game|spread|total (?:goals|points)|player|mvp|exact score|first half|second half|1st half|2nd half|quarter|touchdown|goalscorer|corners|both teams to score|btts|song|guest|headline|host)\b/.test(title)) return null;
  if (/highest win total|division total wins|playoff wins|series total wins/.test(title)) return null;
  if (/total wins|win totals?|wins this season|^(?:pro |college )?(?:football|basketball|hockey) wins\b|^wnba wins\b|^nhl wins\b/.test(title)) return "regularSeasonWins";
  if (/division winner/.test(title) || /conference (?:east|west|north|south) winner/.test(title)) return "division";
  if (/conference.*(?:champion|championship)$|(?:afc|nfc).*champion$/.test(title)) return "conference";
  if (/^kxncaa(?:f|fb)(?:b12|acc|sec|b10|aac|pac1?2|pac10|mwc|mac|sbelt|cusa|ivy)$/.test(ticker.toLowerCase())) return "conference";
  if (/playoff (?:qualifier|qualification)|make(?:s| the)? playoffs|playoff berth/.test(text)) return "playoffs";
  if (/finals? qualifiers?|teams in (?:the )?(?:super bowl|nba finals|stanley cup|champions league final)/.test(title)) return "finalist";
  if (/\bto advance\b|champions league advance|playoff (?:semi|quarter)finals qualifiers?/.test(title)) return "advance";
  if (/top 2 finish/.test(text)) return "top2";
  if (/top 4 (?:finish|team)/.test(text)) return "top4";
  if (/top 8 (?:finish|team)|league phase top 8/.test(text)) return "top8";
  if (/top half finish/.test(text)) return "topHalf";
  if (/relegat/.test(text)) return "relegation";
  if (/(?:#|number )?1 seed|top seed/.test(text)) return "seed";
  if (/best regular season record|president'?s trophy/.test(text)) return "bestRecord";
  if (/worst regular season record/.test(text)) return "worstRecord";
  if (/\bcup (?:champion|winner|finals qualifier)|commissioner'?s cup winner/.test(text)) return "cup";
  if (/^(?:super bowl|ncaaf championship|college football champion|pro basketball champion|wnba championship|stanley cup|premier league|la liga|serie a|ligue 1|uefa champions league)$/.test(title)) return "title";
  if (/^(?:brasileir[aã]o|liga mx) winner$/.test(title)) return "title";
  return null;
}

export function classifyTeamFuturesSeries(series) {
  const sport = futuresSportForSeries(series);
  const kind = futuresKindForSeries(series);
  if (!sport || !kind || !SUPPORTED_TEAM_FUTURES_SPORTS.has(sport)) return null;
  return {
    ticker: String(series.ticker || "").toUpperCase(),
    title: series.title || series.ticker,
    sport,
    kind,
    volume: number(series.volume_fp ?? series.volume, 0)
  };
}

export function teamFuturesCacheKey(sport, teamCode) {
  return `${TEAM_FUTURES_KEY_PREFIX}:${String(sport || "").toUpperCase()}:${String(teamCode || "").toUpperCase()}`;
}

export function mlbFuturesSeries() {
  return [
    ...Object.keys(MLB_SHARED_FUTURES_SERIES),
    ...Object.keys(MLB_TEAMS).map(teamCode => `KXMLBWINS-${teamCode}`)
  ];
}

function json(value, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value), { ...init, headers });
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function centsFromDollars(value) {
  if (value == null || value === "") return null;
  return number(value, NaN) * 100;
}

function priceInCents(market, dollarField, legacyField) {
  const fixedPoint = centsFromDollars(market[dollarField]);
  if (fixedPoint != null && Number.isFinite(fixedPoint)) return fixedPoint;
  const legacy = number(market[legacyField], NaN);
  return Number.isFinite(legacy) ? legacy : null;
}

function marketVolume(market) {
  return number(market.volume_fp ?? market.volume, 0);
}

function eventStart(event, markets) {
  const occurrenceCandidates = [event?.occurrence_datetime, ...markets.map(market => market.occurrence_datetime)]
    .filter(Boolean).map(value => new Date(value)).filter(value => Number.isFinite(value.getTime()));
  const fallbackCandidates = [
    event?.strike_date, event?.expected_expiration_time, event?.close_time,
    ...markets.flatMap(market => [market.expected_expiration_time, market.close_time, market.expiration_time])
  ].filter(Boolean).map(value => new Date(value)).filter(value => Number.isFinite(value.getTime()));
  const candidates = occurrenceCandidates.length ? occurrenceCandidates : fallbackCandidates;
  return candidates.length ? new Date(Math.min(...candidates.map(value => value.getTime()))).toISOString() : null;
}

function eventEnd(event, markets) {
  const candidates = [
    event?.latest_expiration_time, event?.expected_expiration_time, event?.expiration_time, event?.close_time,
    ...markets.flatMap(market => [market.latest_expiration_time, market.expected_expiration_time, market.expiration_time, market.close_time])
  ].filter(Boolean).map(value => new Date(value)).filter(value => Number.isFinite(value.getTime()));
  return candidates.length ? new Date(Math.max(...candidates.map(value => value.getTime()))).toISOString() : null;
}

function seriesFromTicker(eventTicker) {
  return String(eventTicker || "").split("-")[0];
}

export function normalizeEvent(event, markets, now = Date.now()) {
  const cleanMarkets = (markets || []).map(market => ({
    ticker: market.ticker,
    title: market.title || "",
    subtitle: market.subtitle || "",
    label: market.yes_sub_title || market.yes_subtitle || market.subtitle || market.title || market.ticker,
    status: market.status || "",
    lastPrice: priceInCents(market, "last_price_dollars", "last_price"),
    yesBid: priceInCents(market, "yes_bid_dollars", "yes_bid"),
    yesAsk: priceInCents(market, "yes_ask_dollars", "yes_ask"),
    volume: marketVolume(market),
    openInterest: number(market.open_interest_fp ?? market.open_interest, 0),
    primaryParticipantKey: market.primary_participant_key || ""
  }));
  const eventTicker = event?.event_ticker || event?.ticker || markets?.[0]?.event_ticker;
  const eventStatus = String(event?.status || "").toLowerCase();
  const marketStatuses = cleanMarkets.map(market => String(market.status || "").toLowerCase()).filter(Boolean);
  // Multi-contract outrights finalize eliminated players one at a time. Treat
  // the event as active while any player contract remains tradeable instead of
  // inheriting a terminal status from the first nested market.
  const status = marketStatuses.some(value => value === "active" || value === "open")
    ? "active"
    : eventStatus || marketStatuses[0] || "open";
  return {
    eventTicker,
    seriesTicker: event?.series_ticker || markets?.[0]?.series_ticker || seriesFromTicker(eventTicker),
    title: event?.title || markets?.[0]?.title || eventTicker,
    subtitle: event?.sub_title || event?.subtitle || markets?.[0]?.subtitle || "",
    status,
    startsAt: eventStart(event, markets || []),
    endsAt: eventEnd(event, markets || []),
    updatedAt: new Date(now).toISOString(),
    volume: cleanMarkets.reduce((sum, market) => sum + market.volume, 0),
    markets: cleanMarkets
  };
}

export function pollInterval(snapshot, now = Date.now()) {
  const start = new Date(snapshot.startsAt || 0).getTime();
  const suppliedEnd = new Date(snapshot.endsAt || 0).getTime();
  const liveEnd = Number.isFinite(suppliedEnd) && suppliedEnd > start
    ? Math.min(suppliedEnd, start + 14 * 24 * 60 * 60 * 1000)
    : start + LIVE_WINDOW_MS;
  const terminal = new Set(["closed", "determined", "settled", "finalized"]).has(snapshot.status);
  if (!Number.isFinite(start) || start <= 0) return BASE_INTERVAL_MS;
  if (now >= start && now <= liveEnd && !terminal) return LIVE_INTERVAL_MS;
  if (now >= start - PREGAME_WINDOW_MS && now < start) return PREGAME_INTERVAL_MS;
  if (now >= start - 24 * 60 * 60 * 1000 && now < start) return TODAY_INTERVAL_MS;
  return BASE_INTERVAL_MS;
}

function shouldRetain(snapshot, now) {
  const start = new Date(snapshot.startsAt || 0).getTime();
  return !Number.isFinite(start) || start <= 0 || now - start < RETAIN_AFTER_START_MS;
}

export function parseSeries(env) {
  const configured = String(env.KALSHI_SPORTS_SERIES || "")
    .split(",").map(value => value.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_SERIES, ...configured])];
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
}

async function authHeaders(env, method, url) {
  if (!env.KALSHI_API_KEY_ID || !env.KALSHI_PRIVATE_KEY) return {};
  const timestamp = String(Date.now());
  const pathname = new URL(url).pathname;
  const payload = new TextEncoder().encode(`${timestamp}${method.toUpperCase()}${pathname}`);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.KALSHI_PRIVATE_KEY),
    { name: "RSA-PSS", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign({ name: "RSA-PSS", saltLength: 32 }, key, payload);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return {
    "KALSHI-ACCESS-KEY": env.KALSHI_API_KEY_ID,
    "KALSHI-ACCESS-TIMESTAMP": timestamp,
    "KALSHI-ACCESS-SIGNATURE": base64
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createRateGate(requestsPerSecond) {
  const spacing = Math.ceil(1000 / Math.max(0.2, requestsPerSecond));
  let nextAt = 0;
  return async () => {
    const wait = Math.max(0, nextAt - Date.now());
    nextAt = Math.max(nextAt, Date.now()) + spacing;
    if (wait) await sleep(wait);
  };
}

export function nextScheduledRefreshStep(step) {
  const index = SCHEDULED_REFRESH_STEPS.indexOf(step);
  return SCHEDULED_REFRESH_STEPS[(index + 1) % SCHEDULED_REFRESH_STEPS.length];
}

export function scheduledRefreshStepForTime(now = Date.now()) {
  return SCHEDULED_REFRESH_STEPS[Math.floor(now / 60_000) % SCHEDULED_REFRESH_STEPS.length];
}

async function kalshiFetch(env, pathname, gate, attempt = 0) {
  await gate();
  const url = `${env.KALSHI_API_ORIGIN || API_ORIGIN}${pathname}`;
  const headers = await authHeaders(env, "GET", url);
  const response = await fetch(url, { headers });
  const retryLimit = Math.max(0, number(env.KALSHI_MAX_RETRY_ATTEMPTS, 2));
  if ((response.status === 429 || response.status >= 500) && attempt < retryLimit) {
    const base = response.status === 429
      ? Math.max(1000, number(env.KALSHI_429_BACKOFF_BASE_MS, 5000))
      : 750;
    const backoff = Math.min(60_000, base * (2 ** attempt)) + Math.floor(Math.random() * 500);
    await sleep(backoff);
    return kalshiFetch(env, pathname, gate, attempt + 1);
  }
  if (response.status === 429) {
    const error = new Error(`Kalshi 429 for ${pathname}`);
    error.code = "KALSHI_RATE_LIMITED";
    throw error;
  }
  if (!response.ok) throw new Error(`Kalshi ${response.status} for ${pathname}`);
  return response.json();
}

async function discoverSeries(env, seriesTicker, gate, now) {
  const snapshots = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({
      limit: "200", status: "open", series_ticker: seriesTicker, with_nested_markets: "true"
    });
    if (cursor) query.set("cursor", cursor);
    const payload = await kalshiFetch(env, `/events?${query}`, gate);
    for (const event of payload.events || []) {
      const snapshot = normalizeEvent(event, event.markets || [], now);
      if (snapshot.eventTicker) snapshots.push(snapshot);
    }
    cursor = payload.cursor || "";
  } while (cursor);
  return snapshots;
}

async function discoverOpenEventsForSeries(env, seriesTickers, gate, now) {
  const targets = new Set([...seriesTickers].map(ticker => String(ticker).toUpperCase()));
  const bySeries = new Map([...targets].map(ticker => [ticker, []]));
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200", status: "open", with_nested_markets: "true" });
    if (cursor) query.set("cursor", cursor);
    const payload = await kalshiFetch(env, `/events?${query}`, gate);
    for (const event of payload.events || []) {
      const ticker = String(event.series_ticker || "").toUpperCase();
      if (!targets.has(ticker)) continue;
      const snapshot = normalizeEvent(event, event.markets || [], now);
      if (snapshot.eventTicker) bySeries.get(ticker).push(snapshot);
    }
    cursor = payload.cursor || "";
  } while (cursor);
  return bySeries;
}

async function refreshEvent(env, ticker, gate, now) {
  const payload = await kalshiFetch(env, `/events/${encodeURIComponent(ticker)}?with_nested_markets=true`, gate);
  return normalizeEvent(payload.event, payload.event?.markets || payload.markets || [], now);
}

async function discoverPoliticsEvents(env, gate, now) {
  const events = {};
  const unmapped = [];
  const seriesQuery = new URLSearchParams({ category: "Politics", tags: "International", include_volume: "true" });
  const seriesPayload = await kalshiFetch(env, `/series?${seriesQuery}`, gate);
  const internationalSeries = new Map((seriesPayload.series || []).map(series => [String(series.ticker || "").toUpperCase(), series]));
  let cursor = "";
  let requestCount = 1;
  do {
    const query = new URLSearchParams({ limit: "200", status: "open", with_nested_markets: "true" });
    if (cursor) query.set("cursor", cursor);
    const payload = await kalshiFetch(env, `/events?${query}`, gate);
    requestCount += 1;
    for (const event of payload.events || []) {
      const normalized = normalizeEvent(event, event.markets || [], now);
      const series = internationalSeries.get(String(normalized.seriesTicker || "").toUpperCase());
      const snapshot = series ? {
        ...normalized,
        seriesTitle: series.title || "",
        politicsTags: ["International", ...(series.tags || [])],
        isInternationalPolitics: true
      } : normalized;
      const classifications = classifyPoliticsLocations(snapshot);
      if (classifications.length && snapshot.eventTicker) events[snapshot.eventTicker] = {
        ...snapshot,
        politics: classifications[0],
        politicsLocations: classifications
      };
      else if (series && snapshot.eventTicker) unmapped.push({
        eventTicker: snapshot.eventTicker,
        seriesTicker: snapshot.seriesTicker,
        title: snapshot.title,
        seriesTitle: snapshot.seriesTitle,
        volume: snapshot.volume
      });
    }
    cursor = payload.cursor || "";
    if (requestCount >= 100) throw new Error("Politics discovery exceeded the pagination safety limit");
  } while (cursor);
  unmapped.sort((left, right) => right.volume - left.volume);
  return { events, unmapped: unmapped.slice(0, 80), requestCount };
}

async function discoverWeatherEvents(env, gate, now) {
  const seriesQuery = new URLSearchParams({ category: "Climate and Weather", include_volume: "true" });
  const seriesPayload = await kalshiFetch(env, `/series?${seriesQuery}`, gate);
  const climateSeries = new Map((seriesPayload.series || []).map(series => [String(series.ticker || "").toUpperCase(), series]));
  const events = {};
  let cursor = "";
  let requestCount = 1;
  do {
    const query = new URLSearchParams({ limit: "200", status: "open", with_nested_markets: "true" });
    if (cursor) query.set("cursor", cursor);
    const payload = await kalshiFetch(env, `/events?${query}`, gate);
    requestCount += 1;
    for (const event of payload.events || []) {
      const series = climateSeries.get(String(event.series_ticker || "").toUpperCase());
      if (!series) continue;
      const snapshot = normalizeEvent(event, event.markets || [], now);
      if (!snapshot.eventTicker) continue;
      events[snapshot.eventTicker] = {
        ...snapshot,
        seriesTitle: series.title || "",
        seriesTags: series.tags || [],
        seriesFrequency: series.frequency || ""
      };
    }
    cursor = payload.cursor || "";
    if (requestCount >= 100) throw new Error("Weather discovery exceeded the pagination safety limit");
  } while (cursor);
  return { events, seriesCount: climateSeries.size, requestCount };
}

async function discoverGeographicEvents(env, gate, now) {
  const politicsQuery = new URLSearchParams({ category: "Politics", tags: "International", include_volume: "true" });
  const weatherQuery = new URLSearchParams({ category: "Climate and Weather", include_volume: "true" });
  const politicsSeriesPayload = await kalshiFetch(env, `/series?${politicsQuery}`, gate);
  const weatherSeriesPayload = await kalshiFetch(env, `/series?${weatherQuery}`, gate);
  const internationalSeries = new Map((politicsSeriesPayload.series || [])
    .map(series => [String(series.ticker || "").toUpperCase(), series]));
  const climateSeries = new Map((weatherSeriesPayload.series || [])
    .map(series => [String(series.ticker || "").toUpperCase(), series]));
  const politicsEvents = {};
  const weatherEvents = {};
  const politicsUnmapped = [];
  let cursor = "";
  let requestCount = 2;
  do {
    const query = new URLSearchParams({ limit: "200", status: "open", with_nested_markets: "true" });
    if (cursor) query.set("cursor", cursor);
    const payload = await kalshiFetch(env, `/events?${query}`, gate);
    requestCount += 1;
    for (const event of payload.events || []) {
      const normalized = normalizeEvent(event, event.markets || [], now);
      if (!normalized.eventTicker) continue;
      const seriesTicker = String(normalized.seriesTicker || "").toUpperCase();
      const politicsSeries = internationalSeries.get(seriesTicker);
      const politicsSnapshot = politicsSeries ? {
        ...normalized,
        seriesTitle: politicsSeries.title || "",
        politicsTags: ["International", ...(politicsSeries.tags || [])],
        isInternationalPolitics: true
      } : normalized;
      const classifications = classifyPoliticsLocations(politicsSnapshot);
      if (classifications.length) {
        politicsEvents[politicsSnapshot.eventTicker] = {
          ...politicsSnapshot,
          politics: classifications[0],
          politicsLocations: classifications
        };
      } else if (politicsSeries) {
        politicsUnmapped.push({
          eventTicker: politicsSnapshot.eventTicker,
          seriesTicker: politicsSnapshot.seriesTicker,
          title: politicsSnapshot.title,
          seriesTitle: politicsSnapshot.seriesTitle,
          volume: politicsSnapshot.volume
        });
      }

      const weatherSeries = climateSeries.get(seriesTicker);
      if (weatherSeries) {
        weatherEvents[normalized.eventTicker] = {
          ...normalized,
          seriesTitle: weatherSeries.title || "",
          seriesTags: weatherSeries.tags || [],
          seriesFrequency: weatherSeries.frequency || ""
        };
      }
    }
    cursor = payload.cursor || "";
    if (requestCount >= 100) throw new Error("Geographic discovery exceeded the pagination safety limit");
  } while (cursor);
  politicsUnmapped.sort((left, right) => right.volume - left.volume);
  return {
    politicsEvents,
    politicsUnmapped: politicsUnmapped.slice(0, 80),
    weatherEvents,
    weatherSeriesCount: climateSeries.size,
    requestCount
  };
}

export function weatherPollInterval(snapshot, now = Date.now()) {
  const frequency = String(snapshot.seriesFrequency || "").toLowerCase();
  const endsAt = new Date(snapshot.endsAt || 0).getTime();
  const remaining = endsAt - now;
  if (Number.isFinite(remaining) && remaining >= -60 * 60 * 1000 && remaining <= 6 * 60 * 60 * 1000) return 60 * 1000;
  if (frequency === "hourly") return 60 * 1000;
  if (frequency === "daily") return 2 * 60 * 1000;
  if (frequency === "weekly" || frequency === "monthly" || frequency === "custom") return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}

export async function runWeatherPoll(env, now = Date.now(), options = {}) {
  const prior = await env.MARKET_ATLAS_CACHE.get(WEATHER_STATE_KEY, "json") || { lastDiscoveryAt: 0, events: {} };
  prior.events ||= {};
  const discoveryDue = now - number(prior.lastDiscoveryAt, 0) >= 60 * 60 * 1000 || !Object.keys(prior.events).length;
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const requestsPerSecond = Math.min(
    number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10),
    number(env.KALSHI_WEATHER_READ_REQUESTS_PER_SECOND, Math.min(1.25, tokenBudget / requestCost))
  );
  const gate = options.gate || createRateGate(requestsPerSecond);
  let requestCount = 0;
  let successCount = 0;
  try {
    if (discoveryDue) {
      const discovery = await discoverWeatherEvents(env, gate, now);
      prior.events = discovery.events;
      prior.seriesCount = discovery.seriesCount;
      prior.lastDiscoveryAt = now;
      requestCount = discovery.requestCount;
      successCount = discovery.requestCount;
    } else {
      const due = Object.values(prior.events)
        .filter(snapshot => now - new Date(snapshot.updatedAt || 0).getTime() >= weatherPollInterval(snapshot, now))
        .sort((left, right) => weatherPollInterval(left, now) - weatherPollInterval(right, now)
          || new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime())
        .slice(0, Math.max(1, number(env.KALSHI_MAX_WEATHER_REFRESHES_PER_RUN, 30)));
      requestCount = due.length;
      const refreshed = await mapWithConcurrency(due, Math.min(3, number(env.KALSHI_POLL_CONCURRENCY, 3)), async snapshot => ({
        ...(await refreshEvent(env, snapshot.eventTicker, gate, now)),
        seriesTitle: snapshot.seriesTitle || "",
        seriesTags: snapshot.seriesTags || [],
        seriesFrequency: snapshot.seriesFrequency || ""
      }));
      for (const snapshot of refreshed) prior.events[snapshot.eventTicker] = snapshot;
      successCount = refreshed.length;
    }
    const unmapped = Object.values(prior.events).filter(snapshot => !resolveWeatherLocations(
      `${snapshot.seriesTitle || ""} ${snapshot.title || ""} ${snapshot.subtitle || ""} ${(snapshot.markets || []).map(market => `${market.label || ""} ${market.title || ""}`).join(" ")}`
    ).length).sort((left, right) => right.volume - left.volume).slice(0, 80).map(snapshot => ({
      eventTicker: snapshot.eventTicker,
      seriesTicker: snapshot.seriesTicker,
      title: snapshot.title,
      seriesTitle: snapshot.seriesTitle,
      volume: snapshot.volume
    }));
    prior.lastRunAt = now;
    prior.lastSuccessfulPollAt = now;
    prior.lastRequestCount = requestCount;
    prior.lastRequestSuccessCount = successCount;
    prior.lastError = null;
    const publicData = buildWeatherPublicSnapshot(Object.values(prior.events), now, {
      lastPollAt: new Date(now).toISOString(),
      lastDiscoveryAt: prior.lastDiscoveryAt ? new Date(prior.lastDiscoveryAt).toISOString() : null,
      discoveryIntervalMinutes: 60,
      hourlyRefreshSeconds: 60,
      dailyRefreshSeconds: 120,
      seasonalRefreshMinutes: 15,
      source: "Kalshi public trade API"
    }, unmapped);
    await Promise.all([
      env.MARKET_ATLAS_CACHE.put(WEATHER_STATE_KEY, JSON.stringify(prior)),
      env.MARKET_ATLAS_CACHE.put(WEATHER_PUBLIC_KEY, JSON.stringify(publicData))
    ]);
    return { discoveryDue, requestCount, seriesCount: prior.seriesCount || 0, bundleCount: publicData.bundleCount, marketCount: publicData.marketCount };
  } catch (error) {
    prior.lastRunAt = now;
    prior.lastErrorAt = now;
    prior.lastError = error?.message || String(error);
    await env.MARKET_ATLAS_CACHE.put(WEATHER_STATE_KEY, JSON.stringify(prior));
    throw error;
  }
}

function politicsPrice(market) {
  if (market.lastPrice != null) return market.lastPrice;
  if (market.yesBid != null && market.yesAsk != null) return (market.yesBid + market.yesAsk) / 2;
  return market.yesAsk ?? market.yesBid ?? null;
}

function politicsPollInterval(snapshot, now = Date.now()) {
  const target = new Date(snapshot.endsAt || snapshot.startsAt || 0).getTime();
  if (!Number.isFinite(target) || target <= 0) return 60 * 60 * 1000;
  const remaining = target - now;
  if (remaining <= 12 * 60 * 60 * 1000 && remaining >= -12 * 60 * 60 * 1000) return 60 * 1000;
  if (remaining <= 24 * 60 * 60 * 1000 && remaining > 0) return 5 * 60 * 1000;
  if (remaining <= 7 * 24 * 60 * 60 * 1000 && remaining > 0) return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}

const POLITICS_COMPLETED_STATUSES = new Set(["closed", "settled", "finalized", "determined", "resolved"]);

function politicsMarket(snapshot) {
  const outcomes = (snapshot.markets || []).filter(market => !POLITICS_COMPLETED_STATUSES.has(String(market.status || "").toLowerCase())).map(market => ({
    name: market.label || market.title || market.ticker,
    ticker: market.ticker,
    price: politicsPrice(market),
    lastPrice: market.lastPrice,
    yesBid: market.yesBid,
    yesAsk: market.yesAsk,
    volume: market.volume,
    party: politicsParty(
      `${snapshot.title || ""} ${market.subtitle || ""} ${market.title || ""} ${market.label || ""}`,
      market.ticker
    )
  })).sort((left, right) => (right.volume || 0) - (left.volume || 0));
  return {
    id: snapshot.eventTicker,
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    title: snapshot.title,
    subtitle: snapshot.subtitle,
    url: politicsMarketUrl(snapshot.eventTicker, snapshot.seriesTicker),
    office: snapshot.politics.office,
    stage: snapshot.politics.stage || "general",
    importance: snapshot.politics.importance,
    volume: snapshot.volume,
    updatedAt: snapshot.updatedAt,
    outcomes
  };
}

export function buildPoliticsPublicSnapshot(snapshots, now = Date.now(), cache = {}, unmapped = []) {
  const byJurisdiction = new Map();
  const classifiedSnapshots = snapshots.map(snapshot => {
    const currentClassifications = classifyPoliticsLocations(snapshot);
    const classifications = currentClassifications.length
      ? currentClassifications
      : snapshot.politicsLocations || [];
    return { snapshot, classifications };
  });
  const senatePrimaryVolumeByJurisdiction = new Map();
  for (const { snapshot, classifications } of classifiedSnapshots) {
    for (const classification of classifications) {
      if (classification.stage !== "primary") continue;
      senatePrimaryVolumeByJurisdiction.set(
        classification.jurisdictionId,
        (senatePrimaryVolumeByJurisdiction.get(classification.jurisdictionId) || 0)
          + (snapshot.markets || []).filter(market => !POLITICS_COMPLETED_STATUSES.has(String(market.status || "").toLowerCase()))
            .reduce((sum, market) => sum + number(market.volume, 0), 0)
      );
    }
  }
  for (const { snapshot, classifications } of classifiedSnapshots) {
    for (const classification of classifications) {
      if (classification.stage === "primary"
        && (senatePrimaryVolumeByJurisdiction.get(classification.jurisdictionId) || 0) < MAJOR_SENATE_PRIMARY_VOLUME) continue;
      const enriched = { ...snapshot, politics: classification };
      if (!byJurisdiction.has(classification.jurisdictionId)) {
        byJurisdiction.set(classification.jurisdictionId, {
          id: classification.jurisdictionId,
          geography: classification.geography,
          jurisdiction: classification.jurisdiction,
          code: classification.code,
          capital: classification.capital,
          lon: classification.lon,
          lat: classification.lat,
          dateKey: classification.dateKey,
          dateLabel: classification.dateLabel,
          confidence: classification.confidence,
          scope: classification.scope,
          minZoomScale: classification.minZoomScale || 0,
          markets: []
        });
      }
      const bundle = byJurisdiction.get(classification.jurisdictionId);
      if (!bundle.markets.some(market => market.id === snapshot.eventTicker)) bundle.markets.push(politicsMarket(enriched));
    }
  }
  const bundles = [...byJurisdiction.values()].map(bundle => {
    bundle.markets.sort((left, right) => right.importance - left.importance || right.volume - left.volume);
    const partyPrices = { D: [], R: [] };
    const partyCoverage = market => new Set(
      market.outcomes.map(outcome => outcome.party).filter(party => party === "D" || party === "R")
    ).size;
    const representativeMarket = bundle.markets.filter(market => market.stage !== "primary").sort((left, right) =>
      partyCoverage(right) - partyCoverage(left) || right.volume - left.volume
    )[0] || bundle.markets.slice().sort((left, right) =>
      partyCoverage(right) - partyCoverage(left) || right.volume - left.volume
    )[0];
    for (const outcome of representativeMarket?.outcomes || []) {
      if ((outcome.party === "D" || outcome.party === "R") && outcome.price != null) partyPrices[outcome.party].push(outcome.price);
    }
    const dem = partyPrices.D.length ? Math.max(...partyPrices.D) : null;
    const rep = partyPrices.R.length ? Math.max(...partyPrices.R) : null;
    bundle.leaderParty = dem != null && rep == null ? "D"
      : rep != null && dem == null ? "R"
        : dem == null || rep == null || Math.abs(dem - rep) < 2 ? "N"
          : dem > rep ? "D" : "R";
    bundle.leaderPrice = bundle.leaderParty === "D" ? dem : bundle.leaderParty === "R" ? rep : Math.max(dem || 0, rep || 0) || null;
    return bundle;
  }).sort((left, right) => Math.max(...right.markets.map(market => market.volume)) - Math.max(...left.markets.map(market => market.volume)));
  applyHouseRaceRevealScales(bundles);
  return {
    schemaVersion: 1,
    generatedAt: new Date(now).toISOString(),
    cache,
    bundleCount: bundles.length,
    marketCount: new Set(bundles.flatMap(bundle => bundle.markets.map(market => market.id))).size,
    unmappedCount: unmapped.length,
    unmapped,
    periods: politicsTimeline(bundles),
    bundles
  };
}

export function applyHouseRaceRevealScales(bundles = []) {
  const houseBundles = bundles.filter(bundle => bundle.scope === "Congressional district");
  houseBundles.forEach((bundle, rank) => {
    bundle.minZoomScale = houseRaceRevealScale(rank, houseBundles.length);
  });
  return bundles;
}

function weatherUnmappedEvents(events) {
  return Object.values(events).filter(snapshot => !resolveWeatherLocations(
    `${snapshot.seriesTitle || ""} ${snapshot.title || ""} ${snapshot.subtitle || ""} ${(snapshot.markets || []).map(market => `${market.label || ""} ${market.title || ""}`).join(" ")}`
  ).length).sort((left, right) => right.volume - left.volume).slice(0, 80).map(snapshot => ({
    eventTicker: snapshot.eventTicker,
    seriesTicker: snapshot.seriesTicker,
    title: snapshot.title,
    seriesTitle: snapshot.seriesTitle,
    volume: snapshot.volume
  }));
}

function geographicRequestsPerSecond(env) {
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const categoryCeiling = Math.max(
    number(env.KALSHI_UNAUTHENTICATED_GAME_READ_REQUESTS_PER_SECOND, 1.5),
    number(env.KALSHI_POLITICS_READ_REQUESTS_PER_SECOND, 1.25),
    number(env.KALSHI_WEATHER_READ_REQUESTS_PER_SECOND, 1.25)
  );
  return Math.max(0.2, Math.min(
    number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10),
    number(env.KALSHI_SCHEDULED_READ_REQUESTS_PER_SECOND, Math.min(categoryCeiling, tokenBudget / requestCost))
  ));
}

export async function runGeographicPoll(env, now = Date.now(), options = {}) {
  const [politicsPriorValue, weatherPriorValue] = await Promise.all([
    env.MARKET_ATLAS_CACHE.get(POLITICS_STATE_KEY, "json"),
    env.MARKET_ATLAS_CACHE.get(WEATHER_STATE_KEY, "json")
  ]);
  const politicsPrior = politicsPriorValue || { lastDiscoveryAt: 0, events: {} };
  const weatherPrior = weatherPriorValue || { lastDiscoveryAt: 0, events: {} };
  politicsPrior.events ||= {};
  weatherPrior.events ||= {};
  const discoveryDue = Boolean(options.forceDiscovery)
    || now - number(politicsPrior.lastDiscoveryAt, 0) >= GEOGRAPHIC_DISCOVERY_INTERVAL_MS
    || now - number(weatherPrior.lastDiscoveryAt, 0) >= GEOGRAPHIC_DISCOVERY_INTERVAL_MS
    || !Object.keys(politicsPrior.events).length
    || !Object.keys(weatherPrior.events).length;
  const gate = options.gate || createRateGate(geographicRequestsPerSecond(env));

  if (!discoveryDue) {
    const politics = await runPoliticsPoll(env, now, { gate });
    const weather = await runWeatherPoll(env, now, { gate });
    return { discoveryDue: false, requestCount: politics.requestCount + weather.requestCount, politics, weather };
  }

  try {
    const discovery = await discoverGeographicEvents(env, gate, now);
    const politicsState = {
      ...politicsPrior,
      events: discovery.politicsEvents,
      unmapped: discovery.politicsUnmapped,
      lastDiscoveryAt: now,
      lastRunAt: now,
      lastSuccessfulPollAt: now,
      lastRequestCount: discovery.requestCount,
      lastRequestSuccessCount: discovery.requestCount,
      lastError: null
    };
    const weatherState = {
      ...weatherPrior,
      events: discovery.weatherEvents,
      seriesCount: discovery.weatherSeriesCount,
      lastDiscoveryAt: now,
      lastRunAt: now,
      lastSuccessfulPollAt: now,
      lastRequestCount: discovery.requestCount,
      lastRequestSuccessCount: discovery.requestCount,
      lastError: null
    };
    const sharedCache = {
      lastPollAt: new Date(now).toISOString(),
      lastDiscoveryAt: new Date(now).toISOString(),
      discoveryIntervalMinutes: 60,
      combinedDiscovery: true,
      requestCount: discovery.requestCount,
      source: "Kalshi public trade API"
    };
    const politicsPublic = buildPoliticsPublicSnapshot(
      Object.values(politicsState.events), now, sharedCache, politicsState.unmapped
    );
    const weatherPublic = buildWeatherPublicSnapshot(
      Object.values(weatherState.events), now, {
        ...sharedCache,
        hourlyRefreshSeconds: 60,
        dailyRefreshSeconds: 120,
        seasonalRefreshMinutes: 15
      }, weatherUnmappedEvents(weatherState.events)
    );
    await Promise.all([
      env.MARKET_ATLAS_CACHE.put(POLITICS_STATE_KEY, JSON.stringify(politicsState)),
      env.MARKET_ATLAS_CACHE.put(POLITICS_PUBLIC_KEY, JSON.stringify(politicsPublic)),
      env.MARKET_ATLAS_CACHE.put(WEATHER_STATE_KEY, JSON.stringify(weatherState)),
      env.MARKET_ATLAS_CACHE.put(WEATHER_PUBLIC_KEY, JSON.stringify(weatherPublic))
    ]);
    return {
      discoveryDue: true,
      requestCount: discovery.requestCount,
      politics: { bundleCount: politicsPublic.bundleCount, marketCount: politicsPublic.marketCount },
      weather: { seriesCount: weatherState.seriesCount, bundleCount: weatherPublic.bundleCount, marketCount: weatherPublic.marketCount }
    };
  } catch (error) {
    const message = error?.message || String(error);
    const failedPolitics = { ...politicsPrior, lastRunAt: now, lastErrorAt: now, lastError: message };
    const failedWeather = { ...weatherPrior, lastRunAt: now, lastErrorAt: now, lastError: message };
    await Promise.all([
      env.MARKET_ATLAS_CACHE.put(POLITICS_STATE_KEY, JSON.stringify(failedPolitics)),
      env.MARKET_ATLAS_CACHE.put(WEATHER_STATE_KEY, JSON.stringify(failedWeather))
    ]);
    throw error;
  }
}

export async function runPoliticsPoll(env, now = Date.now(), options = {}) {
  const prior = await env.MARKET_ATLAS_CACHE.get(POLITICS_STATE_KEY, "json") || { lastDiscoveryAt: 0, events: {} };
  prior.events ||= {};
  const discoveryDue = now - number(prior.lastDiscoveryAt, 0) >= GEOGRAPHIC_DISCOVERY_INTERVAL_MS
    || !Object.keys(prior.events).length;
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const requestsPerSecond = Math.min(
    number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10),
    number(env.KALSHI_POLITICS_READ_REQUESTS_PER_SECOND, Math.min(1.25, tokenBudget / requestCost))
  );
  const gate = options.gate || createRateGate(requestsPerSecond);
  let requestCount = 0;
  let successCount = 0;
  try {
    if (discoveryDue) {
      const discovery = await discoverPoliticsEvents(env, gate, now);
      prior.events = discovery.events;
      prior.unmapped = discovery.unmapped;
      prior.lastDiscoveryAt = now;
      requestCount = discovery.requestCount;
      successCount = discovery.requestCount;
    } else {
      const due = Object.values(prior.events)
        .filter(snapshot => now - new Date(snapshot.updatedAt || 0).getTime() >= politicsPollInterval(snapshot, now))
        .sort((left, right) => new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime())
        .slice(0, Math.max(1, number(env.KALSHI_MAX_POLITICS_REFRESHES_PER_RUN, 12)));
      requestCount = due.length;
      const refreshed = await mapWithConcurrency(due, Math.min(3, number(env.KALSHI_POLL_CONCURRENCY, 3)), async snapshot => {
        const next = await refreshEvent(env, snapshot.eventTicker, gate, now);
        const enriched = {
          ...next,
          seriesTitle: snapshot.seriesTitle || "",
          politicsTags: snapshot.politicsTags || [],
          isInternationalPolitics: Boolean(snapshot.isInternationalPolitics)
        };
        const politicsLocations = classifyPoliticsLocations(enriched);
        return politicsLocations.length ? { ...enriched, politics: politicsLocations[0], politicsLocations } : null;
      });
      for (const snapshot of refreshed.filter(Boolean)) prior.events[snapshot.eventTicker] = snapshot;
      successCount = refreshed.length;
    }
    prior.lastRunAt = now;
    prior.lastSuccessfulPollAt = now;
    prior.lastRequestCount = requestCount;
    prior.lastRequestSuccessCount = successCount;
    prior.lastError = null;
    const publicData = buildPoliticsPublicSnapshot(Object.values(prior.events), now, {
      lastPollAt: new Date(now).toISOString(),
      lastDiscoveryAt: prior.lastDiscoveryAt ? new Date(prior.lastDiscoveryAt).toISOString() : null,
      discoveryIntervalMinutes: 60,
      source: "Kalshi public trade API"
    }, prior.unmapped || []);
    await Promise.all([
      env.MARKET_ATLAS_CACHE.put(POLITICS_STATE_KEY, JSON.stringify(prior)),
      env.MARKET_ATLAS_CACHE.put(POLITICS_PUBLIC_KEY, JSON.stringify(publicData))
    ]);
    return { discoveryDue, requestCount, bundleCount: publicData.bundleCount, marketCount: publicData.marketCount };
  } catch (error) {
    prior.lastRunAt = now;
    prior.lastErrorAt = now;
    prior.lastError = error?.message || String(error);
    await env.MARKET_ATLAS_CACHE.put(POLITICS_STATE_KEY, JSON.stringify(prior));
    throw error;
  }
}

async function mapWithConcurrency(items, concurrency, operation) {
  const queue = items.slice();
  const results = [];
  let rateLimited = false;
  let attempted = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length && !rateLimited) {
      const item = queue.shift();
      attempted += 1;
      try {
        results.push(await operation(item));
      } catch (error) {
        console.warn("Kalshi poll failed", item, error?.message || error);
        if (error?.code === "KALSHI_RATE_LIMITED") {
          rateLimited = true;
          queue.length = 0;
        }
      }
    }
  });
  await Promise.all(workers);
  results.rateLimited = rateLimited;
  results.attempted = attempted;
  return results;
}

function marketForTeam(snapshot, teamCode) {
  const expectedSuffix = String(teamCode || "").toUpperCase();
  return snapshot.markets.find(market => String(market.ticker || "").toUpperCase().split("-").at(-1) === expectedSuffix) || null;
}

function futureCard(snapshot, market, heading, teamCode, marketKind) {
  if (!snapshot || !market) return null;
  return {
    sport: "MLB",
    teamCode,
    marketKind,
    heading,
    seriesTicker: snapshot.seriesTicker,
    eventTicker: snapshot.eventTicker,
    eventTitle: snapshot.title,
    label: market.label,
    ticker: market.ticker,
    lastPrice: market.lastPrice,
    yesBid: market.yesBid,
    yesAsk: market.yesAsk,
    marketVolume: market.volume,
    eventVolume: snapshot.volume,
    updatedAt: snapshot.updatedAt
  };
}

function displayedProbability(card) {
  if (!card) return null;
  if (card.lastPrice != null) return card.lastPrice;
  if (card.yesBid != null && card.yesAsk != null) return (card.yesBid + card.yesAsk) / 2;
  return card.yesAsk ?? card.yesBid ?? null;
}

export function buildMlbFuturesSnapshot(snapshots, now = Date.now()) {
  const bySeries = new Map();
  for (const snapshot of snapshots.flat()) {
    const existing = bySeries.get(snapshot.seriesTicker) || [];
    existing.push(snapshot);
    bySeries.set(snapshot.seriesTicker, existing);
  }
  const teams = {};
  for (const [teamCode, aliases] of Object.entries(MLB_TEAMS)) {
    const titleCandidates = bySeries.get("KXMLB") || [];
    let title = null;
    for (const snapshot of titleCandidates) {
      const market = marketForTeam(snapshot, teamCode);
      if (market && (!title || snapshot.volume > title.eventVolume)) {
        title = futureCard(snapshot, market, "World Series title", teamCode, "title");
      }
    }

    let playoffs = null;
    for (const snapshot of bySeries.get("KXMLBPLAYOFFS") || []) {
      const market = marketForTeam(snapshot, teamCode);
      if (market && (!playoffs || snapshot.volume > playoffs.eventVolume)) {
        playoffs = futureCard(snapshot, market, "Make the playoffs", teamCode, "playoffs");
      }
    }
    let seasonWins = null;
    for (const snapshot of bySeries.get(`KXMLBWINS-${teamCode}`) || []) {
      const market = snapshot.markets.slice().sort((left, right) => right.volume - left.volume)[0];
      const candidate = market ? futureCard(snapshot, market, "Regular-season wins", teamCode, "regularSeasonWins") : null;
      if (candidate && (!seasonWins || candidate.marketVolume > seasonWins.marketVolume)) seasonWins = candidate;
    }
    let division = null;
    const divisionSeries = MLB_TEAM_DIVISION_SERIES[teamCode];
    for (const snapshot of bySeries.get(divisionSeries) || []) {
      const market = marketForTeam(snapshot, teamCode);
      if (market && (!division || snapshot.volume > division.eventVolume)) {
        division = futureCard(snapshot, market, MLB_SHARED_FUTURES_SERIES[divisionSeries] || "Division winner", teamCode, "division");
      }
    }
    const primaryKey = displayedProbability(title) != null && displayedProbability(title) < 2 && playoffs ? "playoffs" : title ? "title" : playoffs ? "playoffs" : null;
    const primary = primaryKey === "playoffs" ? playoffs : primaryKey === "title" ? title : null;
    teams[teamCode] = {
      schemaVersion: 2,
      sport: "MLB",
      generatedAt: new Date(now).toISOString(),
      teamCode,
      teamName: aliases[0],
      primaryKey,
      primary,
      futures: { title, playoffs, regularSeasonWins: seasonWins, division },
      title,
      playoffs,
      seasonWins,
      division,
      playerProps: []
    };
  }
  return { generatedAt: new Date(now).toISOString(), teamCount: Object.keys(teams).length, teams };
}

export function validateTeamFuturesRecord(record) {
  const teamCode = String(record?.teamCode || "").toUpperCase();
  if (!MLB_TEAMS[teamCode] || record?.sport !== "MLB" || record?.schemaVersion !== 2) return false;
  const futures = record.futures || {};
  for (const [kind, card] of Object.entries(futures)) {
    if (!card) continue;
    if (card.teamCode !== teamCode || card.sport !== "MLB" || card.marketKind !== kind) return false;
    const ticker = String(card.ticker || "").toUpperCase();
    if (kind === "regularSeasonWins") {
      if (!ticker.startsWith(`KXMLBWINS-${teamCode}-`)) return false;
    } else if (ticker.split("-").at(-1) !== teamCode) {
      return false;
    }
  }
  return true;
}

function mergeTeamFuturesRecord(current, prior, refreshedSeries) {
  if (!prior || !validateTeamFuturesRecord(prior)) return current;
  const sourceSeries = {
    title: "KXMLB",
    playoffs: "KXMLBPLAYOFFS",
    regularSeasonWins: `KXMLBWINS-${current.teamCode}`,
    division: MLB_TEAM_DIVISION_SERIES[current.teamCode]
  };
  const futures = {};
  for (const kind of ["title", "playoffs", "regularSeasonWins", "division"]) {
    futures[kind] = refreshedSeries.has(sourceSeries[kind])
      ? current.futures?.[kind] || null
      : prior.futures?.[kind] || null;
  }
  const primaryKey = displayedProbability(futures.title) != null && displayedProbability(futures.title) < 2 && futures.playoffs
    ? "playoffs"
    : futures.title ? "title" : futures.playoffs ? "playoffs" : null;
  return {
    ...current,
    primaryKey,
    primary: primaryKey ? futures[primaryKey] : null,
    futures,
    title: futures.title,
    playoffs: futures.playoffs,
    seasonWins: futures.regularSeasonWins,
    division: futures.division
  };
}

function eventSuffix(ticker) {
  return String(ticker || "").split("-").slice(1).join("-");
}

export function buildMlbPlayerProps(payload, teamCode, gameEventTicker = "") {
  const requestedGame = eventSuffix(gameEventTicker);
  const props = [];
  for (const snapshot of payload?.events || []) {
    if (!MLB_PLAYER_PROP_SERIES.has(snapshot.seriesTicker)) continue;
    if (requestedGame && eventSuffix(snapshot.eventTicker) !== requestedGame) continue;
    for (const market of snapshot.markets || []) {
      const marketTicker = String(market.ticker || "");
      const participant = marketTicker.startsWith(`${snapshot.eventTicker}-`)
        ? marketTicker.slice(String(snapshot.eventTicker).length + 1)
        : marketTicker.split("-").at(-1);
      if (!participant.startsWith(teamCode)) continue;
      props.push({
        heading: market.label || market.title || "Player prop",
        eventTitle: snapshot.title,
        label: snapshot.title,
        ticker: market.ticker,
        lastPrice: market.lastPrice,
        yesBid: market.yesBid,
        yesAsk: market.yesAsk,
        marketVolume: market.volume,
        eventVolume: snapshot.volume,
        startsAt: snapshot.startsAt
      });
    }
  }
  return props
    .sort((left, right) => right.marketVolume - left.marketVolume)
    .slice(0, 12);
}

export async function runMlbFuturesPoll(env, now = Date.now(), preloadedBySeries = null) {
  const prior = await env.MARKET_ATLAS_CACHE.get(MLB_FUTURES_STATE_KEY, "json") || {};
  if (now - number(prior.lastRunAt, 0) < MLB_FUTURES_INTERVAL_MS) return { refreshed: false };
  if (now - number(prior.pollStartedAt, 0) < FUTURES_POLL_LOCK_MS) return { refreshed: false, inProgress: true };
  await env.MARKET_ATLAS_CACHE.put(MLB_FUTURES_STATE_KEY, JSON.stringify({ ...prior, pollStartedAt: now, lastAttemptAt: now }));
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const requestsPerSecond = Math.min(number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10), tokenBudget / requestCost);
  const gate = createRateGate(requestsPerSecond);
  const series = mlbFuturesSeries();
  try {
    const bySeries = preloadedBySeries || await discoverOpenEventsForSeries(env, series, gate, now);
    const refreshedSeries = new Set(series);
    const publicData = buildMlbFuturesSnapshot([...bySeries.values()], now);
    const priorRecords = await Promise.all(Object.keys(MLB_TEAMS).map(teamCode =>
      env.MARKET_ATLAS_CACHE.get(teamFuturesCacheKey("MLB", teamCode), "json")));
    const records = Object.keys(MLB_TEAMS).map((teamCode, index) =>
      mergeTeamFuturesRecord(publicData.teams[teamCode], priorRecords[index], refreshedSeries));
    for (const record of records) {
      if (!validateTeamFuturesRecord(record)) throw new Error(`Refusing to cache invalid MLB futures for ${record.teamCode}`);
    }
    await Promise.all([
      ...records.map(record => env.MARKET_ATLAS_CACHE.put(teamFuturesCacheKey("MLB", record.teamCode), JSON.stringify(record))),
      env.MARKET_ATLAS_CACHE.put(MLB_FUTURES_STATE_KEY, JSON.stringify({
        schemaVersion: 2,
        sport: "MLB",
        lastRunAt: now,
        lastAttemptAt: now,
        pollStartedAt: null,
        lastError: null,
        teamCount: records.length,
        seriesRequested: series.length,
        eventCount: [...bySeries.values()].reduce((total, snapshots) => total + snapshots.length, 0)
      }))
    ]);
    return { refreshed: true, teamCount: records.length, seriesRefreshed: series.length };
  } catch (error) {
    await env.MARKET_ATLAS_CACHE.put(MLB_FUTURES_STATE_KEY, JSON.stringify({
      ...prior, pollStartedAt: null, lastAttemptAt: now, lastErrorAt: now, lastError: error?.message || String(error)
    }));
    throw error;
  }
}

function normalizedTeamValue(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function teamTokens(value) {
  const ignored = new Set(["the", "team", "club", "football", "basketball", "hockey", "baseball", "fc", "cf"]);
  return new Set(normalizedTeamValue(value).split(" ").filter(token => token.length >= 2 && !ignored.has(token)));
}

function tickerSegments(value) {
  return new Set(String(value || "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean));
}

function textTeamScore(candidate, teamName) {
  const normalizedCandidate = normalizedTeamValue(candidate);
  const normalizedName = normalizedTeamValue(teamName);
  if (!normalizedCandidate || !normalizedName) return 0;
  if (normalizedCandidate === normalizedName) return 90;
  if (normalizedCandidate.includes(normalizedName) || normalizedName.includes(normalizedCandidate)) return 80;
  const candidateTokens = teamTokens(candidate);
  const nameTokens = teamTokens(teamName);
  const overlap = [...nameTokens].filter(token => candidateTokens.has(token));
  if (!overlap.length) return 0;
  const ratio = overlap.length / Math.max(1, Math.min(candidateTokens.size, nameTokens.size));
  const distinctive = overlap.some(token => token.length >= 4);
  return distinctive && ratio >= 0.5 ? 50 + Math.round(ratio * 20) : 0;
}

function marketTeamScore(market, teamCode, teamName) {
  const code = String(teamCode || "").toUpperCase();
  const participant = String(market?.primaryParticipantKey || "").toUpperCase();
  if (code && (participant === code || tickerSegments(market?.ticker).has(code))) return 100;
  return Math.max(textTeamScore(market?.label, teamName), textTeamScore(`${market?.title || ""} ${market?.subtitle || ""}`, teamName));
}

function snapshotTeamScore(snapshot, teamCode, teamName) {
  const code = String(teamCode || "").toUpperCase();
  if (code && (tickerSegments(snapshot?.eventTicker).has(code) || tickerSegments(snapshot?.seriesTicker).has(code))) return 100;
  return textTeamScore(`${snapshot?.title || ""} ${snapshot?.subtitle || ""}`, teamName);
}

function teamMarketForSnapshot(snapshot, teamCode, teamName) {
  const scored = (snapshot.markets || []).map(market => ({ market, score: marketTeamScore(market, teamCode, teamName) }))
    .sort((left, right) => right.score - left.score || right.market.volume - left.market.volume);
  if (scored[0]?.score >= 50) return scored[0].market;
  if (snapshotTeamScore(snapshot, teamCode, teamName) >= 50) {
    return (snapshot.markets || []).slice().sort((left, right) => right.volume - left.volume)[0] || null;
  }
  return null;
}

function futuresHeading(kind, sport) {
  const leagueTitles = {
    NFL: "NFL champion", CFB: "National champion", NBA: "NBA champion", WNBA: "WNBA champion", NHL: "Stanley Cup winner",
    EPL: "Premier League champion", UCL: "Champions League winner", LALIGA: "La Liga champion", BUNDESLIGA: "Bundesliga champion",
    SERIEA: "Serie A champion", LIGUE1: "Ligue 1 champion", BRASILEIRAO: "Brasileirão champion",
    LIGAMX: "Liga MX champion", ARGPRIMERA: "Argentine Primera champion"
  };
  return {
    title: leagueTitles[sport] || "League champion",
    conference: "Conference champion",
    division: "Division winner",
    playoffs: "Make the playoffs",
    regularSeasonWins: "Regular-season wins",
    top2: "Top-two finish",
    top4: "Top-four finish",
    top8: "Top-eight finish",
    topHalf: "Top-half finish",
    finalist: "Reach the final",
    advance: "Advance",
    relegation: "Relegated",
    seed: "No. 1 seed",
    cup: "Cup result",
    bestRecord: "Best regular-season record",
    worstRecord: "Worst regular-season record"
  }[kind] || "Team future";
}

export function buildTeamFuturesFromManifest(manifest, sport, teamCode, teamName) {
  const normalizedSport = String(sport || "").toUpperCase();
  const normalizedCode = String(teamCode || "").toUpperCase();
  const candidates = [];
  for (const snapshot of manifest?.sports?.[normalizedSport] || []) {
    const market = teamMarketForSnapshot(snapshot, normalizedCode, teamName);
    if (!market) continue;
    const kind = snapshot.futuresKind;
    candidates.push({
      sport: normalizedSport,
      teamCode: normalizedCode,
      marketKind: kind,
      heading: futuresHeading(kind, normalizedSport),
      seriesTicker: snapshot.seriesTicker,
      eventTicker: snapshot.eventTicker,
      eventTitle: snapshot.title,
      label: market.label,
      ticker: market.ticker,
      lastPrice: market.lastPrice,
      yesBid: market.yesBid,
      yesAsk: market.yesAsk,
      marketVolume: market.volume,
      eventVolume: snapshot.volume,
      updatedAt: snapshot.updatedAt
    });
  }
  const byKind = new Map();
  for (const card of candidates) {
    const existing = byKind.get(card.marketKind);
    if (!existing || card.eventVolume > existing.eventVolume
      || (card.eventVolume === existing.eventVolume && card.marketVolume > existing.marketVolume)) {
      byKind.set(card.marketKind, card);
    }
  }
  const cards = [...byKind.values()].sort((left, right) =>
    (FUTURES_KIND_ORDER.get(left.marketKind) ?? 99) - (FUTURES_KIND_ORDER.get(right.marketKind) ?? 99)
    || right.eventVolume - left.eventVolume);
  return {
    schemaVersion: 3,
    sport: normalizedSport,
    generatedAt: manifest?.generatedAt || null,
    teamCode: normalizedCode,
    teamName,
    cards,
    futures: Object.fromEntries(cards.map(card => [card.marketKind, card])),
    playerProps: [],
    supportsPlayerProps: false
  };
}

async function discoverTeamFuturesDescriptors(env, gate) {
  const byTicker = new Map(TEAM_FUTURES_FALLBACK_SERIES.map(descriptor => [descriptor.ticker, { ...descriptor, volume: 0 }]));
  try {
    const payload = await kalshiFetch(env, "/series?category=Sports&include_volume=true", gate);
    for (const series of payload.series || []) {
      const descriptor = classifyTeamFuturesSeries(series);
      if (descriptor?.ticker) byTicker.set(descriptor.ticker, descriptor);
    }
  } catch (error) {
    console.warn("Could not discover Kalshi sports futures series; using the verified fallback set", error?.message || error);
  }
  return [...byTicker.values()].sort((left, right) => right.volume - left.volume
    || (FUTURES_KIND_ORDER.get(left.kind) ?? 99) - (FUTURES_KIND_ORDER.get(right.kind) ?? 99));
}

async function currentTeamFuturesDescriptors(env, gate, prior) {
  const discoveredDescriptors = await discoverTeamFuturesDescriptors(env, gate);
  const priorDescriptors = Array.isArray(prior?.descriptors) ? prior.descriptors : [];
  const descriptorMap = new Map([...priorDescriptors, ...discoveredDescriptors].map(descriptor => [descriptor.ticker, descriptor]));
  return [...descriptorMap.values()]
    .sort((left, right) => number(right.volume, 0) - number(left.volume, 0)
      || (FUTURES_KIND_ORDER.get(left.kind) ?? 99) - (FUTURES_KIND_ORDER.get(right.kind) ?? 99))
    .slice(0, Math.max(20, number(env.KALSHI_MAX_FUTURES_SERIES, 180)));
}

export async function runTeamFuturesPoll(env, now = Date.now(), preloaded = null) {
  const prior = await env.MARKET_ATLAS_CACHE.get(TEAM_FUTURES_STATE_KEY, "json") || {};
  if (now - number(prior.lastRunAt, 0) < MLB_FUTURES_INTERVAL_MS) return { refreshed: false };
  if (now - number(prior.pollStartedAt, 0) < FUTURES_POLL_LOCK_MS) return { refreshed: false, inProgress: true };
  await env.MARKET_ATLAS_CACHE.put(TEAM_FUTURES_STATE_KEY, JSON.stringify({ ...prior, pollStartedAt: now, lastAttemptAt: now }));
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const requestsPerSecond = Math.min(number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10), tokenBudget / requestCost);
  const gate = createRateGate(requestsPerSecond);
  const descriptors = preloaded?.descriptors || await currentTeamFuturesDescriptors(env, gate, prior);
  try {
    const bySeries = preloaded?.bySeries
      || await discoverOpenEventsForSeries(env, descriptors.map(descriptor => descriptor.ticker), gate, now);
    const sports = {};
    for (const descriptor of descriptors) {
      sports[descriptor.sport] ||= [];
      sports[descriptor.sport].push(...(bySeries.get(descriptor.ticker) || []).map(snapshot => ({
        ...snapshot,
        futuresKind: descriptor.kind,
        futuresSeriesTitle: descriptor.title
      })));
    }
    const manifest = {
      schemaVersion: 3,
      generatedAt: new Date(now).toISOString(),
      lastRunAt: now,
      lastAttemptAt: now,
      pollStartedAt: null,
      lastError: null,
      descriptors,
      seriesRequested: descriptors.length,
      eventCount: Object.values(sports).reduce((total, snapshots) => total + snapshots.length, 0),
      sports
    };
    await env.MARKET_ATLAS_CACHE.put(TEAM_FUTURES_STATE_KEY, JSON.stringify(manifest));
    return { refreshed: true, seriesRequested: descriptors.length, eventCount: manifest.eventCount };
  } catch (error) {
    await env.MARKET_ATLAS_CACHE.put(TEAM_FUTURES_STATE_KEY, JSON.stringify({
      ...prior, pollStartedAt: null, lastAttemptAt: now, lastErrorAt: now, lastError: error?.message || String(error)
    }));
    throw error;
  }
}

export async function runFuturesMaintenance(env, now = Date.now(), options = {}) {
  const pipeline = await env.MARKET_ATLAS_CACHE.get(FUTURES_PIPELINE_STATE_KEY, "json") || {};
  if (now - number(pipeline.pollStartedAt, 0) < FUTURES_POLL_LOCK_MS) return { refreshed: false, inProgress: true };
  const [teamPrior, mlbPrior] = await Promise.all([
    env.MARKET_ATLAS_CACHE.get(TEAM_FUTURES_STATE_KEY, "json"),
    env.MARKET_ATLAS_CACHE.get(MLB_FUTURES_STATE_KEY, "json")
  ]);
  const teamDue = now - number(teamPrior?.lastRunAt, 0) >= MLB_FUTURES_INTERVAL_MS;
  const mlbDue = now - number(mlbPrior?.lastRunAt, 0) >= MLB_FUTURES_INTERVAL_MS;
  if (!teamDue && !mlbDue) return { refreshed: false };
  await env.MARKET_ATLAS_CACHE.put(FUTURES_PIPELINE_STATE_KEY, JSON.stringify({
    ...pipeline, pollStartedAt: now, lastAttemptAt: now
  }));
  try {
    const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
    const tokenBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
    const requestsPerSecond = Math.min(
      number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10),
      number(env.KALSHI_FUTURES_READ_REQUESTS_PER_SECOND, Math.min(0.5, tokenBudget / requestCost))
    );
    const gate = options.gate || createRateGate(requestsPerSecond);
    const descriptors = teamDue ? await currentTeamFuturesDescriptors(env, gate, teamPrior || {}) : [];
    const requestedSeries = new Set([
      ...(teamDue ? descriptors.map(descriptor => descriptor.ticker) : []),
      ...(mlbDue ? mlbFuturesSeries() : [])
    ]);
    const bySeries = await discoverOpenEventsForSeries(env, requestedSeries, gate, now);
    const results = {};
    if (teamDue) results.team = await runTeamFuturesPoll(env, now, { descriptors, bySeries });
    if (mlbDue) results.mlb = await runMlbFuturesPoll(env, now, bySeries);
    await env.MARKET_ATLAS_CACHE.put(FUTURES_PIPELINE_STATE_KEY, JSON.stringify({
      pollStartedAt: null,
      lastAttemptAt: now,
      lastRunAt: now,
      lastError: null,
      requestedSeries: requestedSeries.size,
      eventCount: [...bySeries.values()].reduce((total, snapshots) => total + snapshots.length, 0)
    }));
    return { refreshed: true, ...results };
  } catch (error) {
    await env.MARKET_ATLAS_CACHE.put(FUTURES_PIPELINE_STATE_KEY, JSON.stringify({
      ...pipeline, pollStartedAt: null, lastAttemptAt: now, lastErrorAt: now, lastError: error?.message || String(error)
    }));
    throw error;
  }
}

function publicSnapshot(state, now) {
  const events = Object.values(state.events).filter(snapshot => shouldRetain(snapshot, now));
  return {
    generatedAt: new Date(now).toISOString(),
    nextBaselineAt: new Date(state.lastDiscoveryAt + DISCOVERY_INTERVAL_MS).toISOString(),
    cache: {
      lastPollAt: state.lastRunAt ? new Date(state.lastRunAt).toISOString() : null,
      lastSuccessfulPollAt: state.lastSuccessfulPollAt ? new Date(state.lastSuccessfulPollAt).toISOString() : null,
      lastError: state.lastError || null
    },
    eventCount: events.length,
    events
  };
}

export async function runPoll(env, now = Date.now(), options = {}) {
  const state = await env.MARKET_ATLAS_CACHE.get(STATE_KEY, "json") || { lastDiscoveryAt: 0, events: {} };
  state.events ||= {};
  const requestCost = number(env.KALSHI_READ_REQUEST_COST, 10);
  const configuredSeries = parseSeries(env);
  const previouslyDiscovered = new Set((state.discoveredSeries || []).map(ticker => String(ticker).toUpperCase()));
  const lastDiscoveryAt = number(state.lastDiscoveryAt, 0);
  const baselineDiscoveryDue = lastDiscoveryAt > 0 && now - lastDiscoveryAt >= DISCOVERY_INTERVAL_MS;
  const missingSeries = configuredSeries.filter(ticker => !previouslyDiscovered.has(ticker));
  const discoveryDue = !lastDiscoveryAt || baselineDiscoveryDue || missingSeries.length > 0;
  const explicitBudget = number(env.KALSHI_READ_TOKENS_PER_SECOND, NaN);
  const fallbackBudget = number(env.KALSHI_UNAUTHENTICATED_READ_TOKENS_PER_SECOND, 20);
  const budgetFraction = Math.max(0.05, Math.min(1, number(env.KALSHI_RATE_BUDGET_FRACTION, 0.25)));
  const detectedBudget = number(state.accountReadRefillRate, NaN);
  const effectiveBudget = Number.isFinite(explicitBudget)
    ? explicitBudget
    : Number.isFinite(detectedBudget) ? detectedBudget * budgetFraction : fallbackBudget;
  const maximumRps = number(env.KALSHI_MAX_READ_REQUESTS_PER_SECOND, 10);
  let requestsPerSecond = Math.min(maximumRps, number(env.KALSHI_READ_REQUESTS_PER_SECOND, effectiveBudget / requestCost));
  if (!Number.isFinite(explicitBudget) && !env.KALSHI_API_KEY_ID) {
    requestsPerSecond = Math.min(requestsPerSecond, number(env.KALSHI_UNAUTHENTICATED_GAME_READ_REQUESTS_PER_SECOND, 1.5));
  }
  let gate = options.gate || createRateGate(requestsPerSecond);

  if (discoveryDue && env.KALSHI_API_KEY_ID && env.KALSHI_PRIVATE_KEY && !Number.isFinite(explicitBudget)) {
    try {
      const limits = await kalshiFetch(env, "/account/limits", gate);
      const refillRate = number(limits.read?.refill_rate ?? limits.limits?.read?.refill_rate, NaN);
      if (Number.isFinite(refillRate)) {
        state.accountReadRefillRate = refillRate;
        state.accountLimitsCheckedAt = now;
        requestsPerSecond = Math.min(maximumRps, refillRate * budgetFraction / requestCost);
        if (!options.gate) gate = createRateGate(requestsPerSecond);
      }
    } catch (error) {
      console.warn("Could not read Kalshi account limits; using cached or conservative budget", error?.message || error);
    }
  }

  if (discoveryDue) {
    const targets = baselineDiscoveryDue || !previouslyDiscovered.size ? configuredSeries : missingSeries;
    const discovered = await mapWithConcurrency(targets, Math.min(4, number(env.KALSHI_POLL_CONCURRENCY, 4)),
      async ticker => ({ ticker, snapshots: await discoverSeries(env, ticker, gate, now) }));
    for (const result of discovered) {
      previouslyDiscovered.add(result.ticker);
      for (const snapshot of result.snapshots) state.events[snapshot.eventTicker] = snapshot;
    }
    state.discoveredSeries = configuredSeries.filter(ticker => previouslyDiscovered.has(ticker));
    const remainingSeries = configuredSeries.filter(ticker => !previouslyDiscovered.has(ticker));
    if (!remainingSeries.length) {
      state.lastDiscoveryAt = now;
      state.lastSuccessfulPollAt = now;
      state.lastError = null;
    } else {
      state.lastErrorAt = now;
      state.lastError = `Discovery added ${discovered.length}/${targets.length} series; ${remainingSeries.length} remaining`;
      console.warn(`Kalshi ${state.lastError}; retrying on the next scheduled run`);
    }
    state.lastRequestCount = discovered.attempted;
    state.lastRequestSuccessCount = discovered.length;
  } else {
    const due = Object.values(state.events)
      .filter(snapshot => shouldRetain(snapshot, now))
      .filter(snapshot => now - new Date(snapshot.updatedAt || 0).getTime() >= pollInterval(snapshot, now))
      .sort((left, right) => pollInterval(left, now) - pollInterval(right, now)
        || new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime())
      .slice(0, Math.max(1, number(env.KALSHI_MAX_EVENT_REFRESHES_PER_RUN, 40)));
    const refreshed = await mapWithConcurrency(due, Math.min(4, number(env.KALSHI_POLL_CONCURRENCY, 4)),
      snapshot => refreshEvent(env, snapshot.eventTicker, gate, now));
    for (const snapshot of refreshed) state.events[snapshot.eventTicker] = snapshot;
    state.lastRequestCount = refreshed.attempted;
    state.lastRequestSuccessCount = refreshed.length;
    if (refreshed.length === due.length) {
      state.lastSuccessfulPollAt = now;
      state.lastError = null;
    } else {
      state.lastErrorAt = now;
      state.lastError = `Event refresh completed ${refreshed.length}/${due.length} events`;
    }
  }

  state.events = Object.fromEntries(Object.entries(state.events).filter(([, snapshot]) => shouldRetain(snapshot, now)));
  state.lastRunAt = now;
  const publicData = publicSnapshot(state, now);
  publicData.upstreamPolicy = {
    requestsPerSecond,
    requestCost,
    authenticatedTierRefillRate: state.accountReadRefillRate || null
  };
  await Promise.all([
    env.MARKET_ATLAS_CACHE.put(STATE_KEY, JSON.stringify(state)),
    env.MARKET_ATLAS_CACHE.put(PUBLIC_KEY, JSON.stringify(publicData))
  ]);
  return { discoveryDue, eventCount: publicData.eventCount };
}

export async function runScheduledRefresh(env, now = Date.now(), options = {}) {
  const requestedStep = String(options.step || "geographic").toLowerCase();
  const step = SCHEDULED_REFRESH_STEPS.includes(requestedStep) ? requestedStep : "geographic";
  const gate = options.gate || createRateGate(geographicRequestsPerSecond(env));
  const results = {};
  const errors = {};
  const runStep = async (name, operation) => {
    try {
      results[name] = await operation();
    } catch (error) {
      errors[name] = error?.message || String(error);
      console.error(JSON.stringify({
        level: "error",
        message: "Market Atlas scheduled refresh step failed",
        environment: env.ENVIRONMENT || "unknown",
        step: name,
        error: errors[name]
      }));
    }
  };

  const operations = {
    // Politics and Weather share one event-catalog pass and lead every cold
    // start so the global map becomes useful before the larger sports sweep.
    geographic: () => runGeographicPoll(env, now, { gate }),
    sports: () => runPoll(env, now, { gate }),
    futures: () => runFuturesMaintenance(env, now, { gate })
  };
  await runStep(step, operations[step]);

  const summary = {
    environment: env.ENVIRONMENT || "unknown",
    step,
    nextStep: nextScheduledRefreshStep(step),
    scheduledAt: new Date(now).toISOString(),
    completedAt: new Date().toISOString(),
    ok: Object.keys(errors).length === 0,
    results,
    errors
  };
  console.log(JSON.stringify({ level: summary.ok ? "info" : "warn", message: "Market Atlas scheduled refresh completed", ...summary }));
  return summary;
}

export class RefreshCoordinator {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.refreshPromise = null;
  }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });
    const payload = await request.json().catch(() => ({}));
    const result = await this.refresh(number(payload.scheduledTime, Date.now()));
    return json(result);
  }

  async refresh(scheduledTime = Date.now()) {
    if (this.refreshPromise) return { skipped: true, reason: "refresh-in-progress" };
    this.refreshPromise = this.performRefresh(scheduledTime);
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  async performRefresh(scheduledTime) {
    const lastRun = await this.ctx.storage.get("last-run");
    const now = Date.now();
    if (now - number(lastRun?.completedAt, 0) < SCHEDULED_REFRESH_COOLDOWN_MS) {
      return { skipped: true, reason: "refresh-cooldown", completedAt: lastRun.completedAt };
    }
    const storedStep = await this.ctx.storage.get("next-step");
    const step = SCHEDULED_REFRESH_STEPS.includes(storedStep) ? storedStep : "geographic";
    const nextStep = nextScheduledRefreshStep(step);
    const runId = crypto.randomUUID();
    await this.ctx.storage.put("last-run", { runId, step, startedAt: now, completedAt: null, ok: null });
    try {
      const result = await runScheduledRefresh(this.env, scheduledTime, { step });
      await Promise.all([
        this.ctx.storage.put("next-step", nextStep),
        this.ctx.storage.put("last-run", {
          runId,
          step,
          nextStep,
          startedAt: now,
          completedAt: Date.now(),
          ok: result.ok,
          errors: result.errors
        })
      ]);
      return result;
    } catch (error) {
      await Promise.all([
        this.ctx.storage.put("next-step", nextStep),
        this.ctx.storage.put("last-run", {
          runId,
          step,
          nextStep,
          startedAt: now,
          completedAt: Date.now(),
          ok: false,
          errors: { coordinator: error?.message || String(error) }
        })
      ]);
      throw error;
    }
  }
}

function requestCoordinatedRefresh(env, now = Date.now()) {
  if (!env.REFRESH_COORDINATOR) return runScheduledRefresh(env, now, { step: scheduledRefreshStepForTime(now) });
  return env.REFRESH_COORDINATOR.getByName(`scheduled:${env.ENVIRONMENT || "default"}`)
    .fetch("https://refresh.internal/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledTime: now })
    }).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Refresh coordinator returned ${response.status}`);
      return payload;
    });
}

function warmHostedCache(env, ctx, category) {
  if (!ctx) return;
  ctx.waitUntil(requestCoordinatedRefresh(env, Date.now()).catch(error => {
    console.error(JSON.stringify({
      level: "error",
      message: "Market Atlas on-demand cache warm failed",
      environment: env.ENVIRONMENT || "unknown",
      category,
      error: error?.message || String(error)
    }));
  }));
}

function startLocalPoll(env, now = Date.now()) {
  if (!localPollPromise) {
    localPollPromise = runPoll(env, now).finally(() => {
      localPollPromise = null;
    });
  }
  return localPollPromise;
}

function startLocalPoliticsPoll(env, now = Date.now()) {
  if (!localPoliticsPollPromise) {
    localPoliticsPollPromise = runPoliticsPoll(env, now).finally(() => {
      localPoliticsPollPromise = null;
    });
  }
  return localPoliticsPollPromise;
}

function startLocalWeatherPoll(env, now = Date.now()) {
  if (!localWeatherPollPromise) {
    localWeatherPollPromise = runWeatherPoll(env, now).finally(() => {
      localWeatherPollPromise = null;
    });
  }
  return localWeatherPollPromise;
}

const ALWAYS_INCLUDE_FOR_SCHEDULE_JOIN = new Set(["KXATP", "KXWTA"]);

export function filterForDate(payload, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return payload;
  const target = new Date(`${date}T12:00:00Z`).getTime();
  const events = payload.events.filter(event => {
    // Tournament outrights are joined to the app's own date/location schedule.
    // Keep every open ATP/WTA outright in the compact response so a market whose
    // Kalshi occurrence time is the final does not disappear earlier in the week.
    if (ALWAYS_INCLUDE_FOR_SCHEDULE_JOIN.has(event.seriesTicker)) return true;
    const start = new Date(event.startsAt || 0).getTime();
    const end = new Date(event.endsAt || event.startsAt || 0).getTime();
    // The browser validates both today and tomorrow across global time zones.
    // Interval overlap also retains an ongoing multi-day golf, F1, or cricket event.
    return Number.isFinite(start) && Number.isFinite(end)
      && start <= target + NEAR_TERM_RESPONSE_WINDOW_MS
      && end >= target - NEAR_TERM_RESPONSE_WINDOW_MS;
  });
  return { ...payload, eventCount: events.length, events };
}

function removeStaleEvents(payload, now = Date.now()) {
  const fresh = [];
  const stale = [];
  for (const cachedSnapshot of payload.events || []) {
    const marketStatuses = (cachedSnapshot.markets || []).map(market => String(market.status || "").toLowerCase());
    const snapshot = marketStatuses.some(value => value === "active" || value === "open")
      ? { ...cachedSnapshot, status: "active" }
      : cachedSnapshot;
    const updatedAt = new Date(snapshot.updatedAt || 0).getTime();
    const maximumAge = Math.max(5 * 60 * 1000, 3 * pollInterval(snapshot, now));
    if (Number.isFinite(updatedAt) && now - updatedAt <= maximumAge) fresh.push(snapshot);
    else stale.push(snapshot);
  }
  return {
    ...payload,
    eventCount: fresh.length,
    events: fresh,
    cache: {
      ...(payload.cache || {}),
      updating: stale.length > 0,
      staleEventCount: stale.length,
      staleSeries: [...new Set(stale.map(event => event.seriesTicker).filter(Boolean))]
    }
  };
}

async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method === "HEAD") return env.ASSETS?.fetch(request) || new Response(null, { status: 404 });
  if (request.method !== "GET") return json({ error: "Method not allowed" }, { status: 405 });

  const legacyRoute = new Map([
    ["/integrated-test", "/"],
    ["/integrated-test/", "/"],
    ["/politics-test", "/categories/politics/"],
    ["/politics-test/", "/categories/politics/"],
    ["/weather-test", "/categories/weather/"],
    ["/weather-test/", "/categories/weather/"]
  ]).get(url.pathname);
  if (legacyRoute) {
    const destination = new URL(legacyRoute, url);
    destination.search = url.search;
    return Response.redirect(destination, 308);
  }

  if (url.pathname === "/api/health") {
    const state = await env.MARKET_ATLAS_CACHE.get(STATE_KEY, "json");
    const publicData = await env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json");
    const futures = await env.MARKET_ATLAS_CACHE.get(MLB_FUTURES_STATE_KEY, "json");
    const teamFutures = await env.MARKET_ATLAS_CACHE.get(TEAM_FUTURES_STATE_KEY, "json");
    const futuresPipeline = await env.MARKET_ATLAS_CACHE.get(FUTURES_PIPELINE_STATE_KEY, "json");
    const politicsState = await env.MARKET_ATLAS_CACHE.get(POLITICS_STATE_KEY, "json");
    const politicsPublic = await env.MARKET_ATLAS_CACHE.get(POLITICS_PUBLIC_KEY, "json");
    const weatherState = await env.MARKET_ATLAS_CACHE.get(WEATHER_STATE_KEY, "json");
    const weatherPublic = await env.MARKET_ATLAS_CACHE.get(WEATHER_PUBLIC_KEY, "json");
    const now = Date.now();
    const events = Object.values(state?.events || {}).filter(snapshot => shouldRetain(snapshot, now));
    const overdueEvents = events.filter(snapshot => {
      const updatedAt = new Date(snapshot.updatedAt || 0).getTime();
      return !Number.isFinite(updatedAt) || now - updatedAt > Math.max(2 * pollInterval(snapshot, now), 2 * 60 * 1000);
    });
    const eventTimes = events.map(event => new Date(event.updatedAt || 0).getTime()).filter(Number.isFinite);
    const sportsReady = Boolean(state && publicData) && !state?.lastError;
    const politicsReady = Boolean(politicsState && politicsPublic) && !politicsState?.lastError;
    const weatherReady = Boolean(weatherState && weatherPublic) && !weatherState?.lastError;
    return json({
      environment: env.ENVIRONMENT || "unknown",
      ok: sportsReady && politicsReady && weatherReady,
      ready: { sports: sportsReady, politics: politicsReady, weather: weatherReady },
      refreshCoordinator: env.REFRESH_COORDINATOR ? "durable-object" : "in-process",
      lastRunAt: state?.lastRunAt ? new Date(state.lastRunAt).toISOString() : null,
      lastSuccessfulPollAt: state?.lastSuccessfulPollAt ? new Date(state.lastSuccessfulPollAt).toISOString() : null,
      publicCacheGeneratedAt: publicData?.generatedAt || null,
      newestEventUpdatedAt: eventTimes.length ? new Date(Math.max(...eventTimes)).toISOString() : null,
      oldestEventUpdatedAt: eventTimes.length ? new Date(Math.min(...eventTimes)).toISOString() : null,
      cachedEventCount: events.length,
      overdueEventCount: overdueEvents.length,
      lastRequestCount: state?.lastRequestCount || 0,
      lastRequestSuccessCount: state?.lastRequestSuccessCount || 0,
      lastError: state?.lastError || null,
      mlbFuturesLastRunAt: futures?.lastRunAt ? new Date(futures.lastRunAt).toISOString() : null,
      mlbFuturesLastError: futures?.lastError || null,
      teamFuturesLastRunAt: teamFutures?.lastRunAt ? new Date(teamFutures.lastRunAt).toISOString() : null,
      teamFuturesLastError: teamFutures?.lastError || null,
      teamFuturesSeries: teamFutures?.seriesRequested || 0,
      teamFuturesEvents: teamFutures?.eventCount || 0,
      futuresPipelineInProgress: Boolean(futuresPipeline?.pollStartedAt),
      futuresPipelineLastRunAt: futuresPipeline?.lastRunAt ? new Date(futuresPipeline.lastRunAt).toISOString() : null,
      futuresPipelineLastError: futuresPipeline?.lastError || null,
      politicsLastRunAt: politicsState?.lastRunAt ? new Date(politicsState.lastRunAt).toISOString() : null,
      politicsLastSuccessfulPollAt: politicsState?.lastSuccessfulPollAt ? new Date(politicsState.lastSuccessfulPollAt).toISOString() : null,
      politicsLastError: politicsState?.lastError || null,
      politicsBundles: politicsPublic?.bundleCount || 0,
      politicsMarkets: politicsPublic?.marketCount || 0,
      weatherLastRunAt: weatherState?.lastRunAt ? new Date(weatherState.lastRunAt).toISOString() : null,
      weatherLastSuccessfulPollAt: weatherState?.lastSuccessfulPollAt ? new Date(weatherState.lastSuccessfulPollAt).toISOString() : null,
      weatherLastError: weatherState?.lastError || null,
      weatherSeries: weatherState?.seriesCount || 0,
      weatherBundles: weatherPublic?.bundleCount || 0,
      weatherMarkets: weatherPublic?.marketCount || 0
    });
  }
  if (url.pathname === "/api/politics") {
    const localRequest = new Set(["localhost", "127.0.0.1"]).has(url.hostname);
    let payload = await env.MARKET_ATLAS_CACHE.get(POLITICS_PUBLIC_KEY, "json");
    if (localRequest) {
      const state = await env.MARKET_ATLAS_CACHE.get(POLITICS_STATE_KEY, "json");
      const pollDue = Date.now() - number(state?.lastRunAt, 0) >= LOCAL_SCHEDULER_INTERVAL_MS;
      if (pollDue) {
        const poll = startLocalPoliticsPoll(env, Date.now());
        if (!payload) {
          try {
            await poll;
            payload = await env.MARKET_ATLAS_CACHE.get(POLITICS_PUBLIC_KEY, "json");
          } catch (error) {
            console.warn("Initial local Politics poll failed", error?.message || error);
          }
        } else if (ctx) {
          ctx.waitUntil(poll.catch(error => console.warn("Local Politics poll failed", error?.message || error)));
        }
      }
    }
    if (!payload) {
      warmHostedCache(env, ctx, "politics");
      return json({ schemaVersion: 1, generatedAt: null, bundleCount: 0, marketCount: 0, periods: [], bundles: [], warming: true }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "15" }
      });
    }
    applyHouseRaceRevealScales(payload.bundles || []);
    const etag = `W/\"politics-${Date.parse(payload.generatedAt).toString(36)}-${payload.marketCount}\"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
    return json(payload, {
      headers: {
        etag,
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
        "access-control-allow-origin": "*"
      }
    });
  }
  if (url.pathname === "/api/weather") {
    const localRequest = new Set(["localhost", "127.0.0.1", "market-atlas.local"]).has(url.hostname);
    let payload = await env.MARKET_ATLAS_CACHE.get(WEATHER_PUBLIC_KEY, "json");
    if (localRequest) {
      const state = await env.MARKET_ATLAS_CACHE.get(WEATHER_STATE_KEY, "json");
      const pollDue = Date.now() - number(state?.lastRunAt, 0) >= LOCAL_SCHEDULER_INTERVAL_MS;
      if (pollDue) {
        const poll = startLocalWeatherPoll(env, Date.now());
        if (!payload) {
          try {
            await poll;
            payload = await env.MARKET_ATLAS_CACHE.get(WEATHER_PUBLIC_KEY, "json");
          } catch (error) {
            console.warn("Initial local Weather poll failed", error?.message || error);
          }
        } else if (ctx) {
          ctx.waitUntil(poll.catch(error => console.warn("Local Weather poll failed", error?.message || error)));
        }
      }
    }
    if (!payload) {
      warmHostedCache(env, ctx, "weather");
      return json({ schemaVersion: 1, generatedAt: null, bundleCount: 0, marketCount: 0, horizons: [], bundles: [], warming: true }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "15" }
      });
    }
    const etag = `W/"weather-${Date.parse(payload.generatedAt).toString(36)}-${payload.marketCount}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
    return json(payload, {
      headers: {
        etag,
        "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=180",
        "access-control-allow-origin": "*"
      }
    });
  }
  if (url.pathname === "/api/search") {
    const query = String(url.searchParams.get("q") || "").trim().slice(0, 160);
    const limit = Math.max(1, Math.min(20, number(url.searchParams.get("limit"), 12)));
    const activeCategory = ["sports", "politics", "weather"].includes(url.searchParams.get("active")) ? url.searchParams.get("active") : "sports";
    if (query.length < 2) return json({ query, total: 0, results: [], interpretation: { context: "Type at least two characters" } }, {
      headers: { "cache-control": "no-store", "access-control-allow-origin": "*" }
    });
    const canonical = new URLSearchParams({ q: query.toLowerCase(), limit: String(limit), active: activeCategory });
    const cacheRequest = new Request(`${url.origin}/api/search?${canonical}`, request);
    const edgeCache = globalThis.caches?.default;
    const cached = await edgeCache?.match(cacheRequest);
    if (cached) return cached;
    const [sports, politics, weather, futures] = await Promise.all([
      env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json"),
      env.MARKET_ATLAS_CACHE.get(POLITICS_PUBLIC_KEY, "json"),
      env.MARKET_ATLAS_CACHE.get(WEATHER_PUBLIC_KEY, "json"),
      env.MARKET_ATLAS_CACHE.get(TEAM_FUTURES_STATE_KEY, "json")
    ]);
    if (!sports && !politics && !weather && !futures) return json({ query, total: 0, results: [], warming: true }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "15", "access-control-allow-origin": "*" }
    });
    const payload = searchMarkets(query, { sports, politics, weather, futures }, { limit, activeCategory });
    const etagSeed = [sports?.generatedAt, politics?.generatedAt, weather?.generatedAt, futures?.generatedAt, activeCategory, payload.total].filter(Boolean).join("|");
    const etag = `W/\"search-${stableHash(etagSeed || query)}\"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
    const response = json(payload, {
      headers: {
        etag,
        "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
        "access-control-allow-origin": "*"
      }
    });
    if (edgeCache && ctx) ctx.waitUntil(edgeCache.put(cacheRequest, response.clone()));
    return response;
  }
  if (url.pathname === "/api/team-markets") {
    const sport = String(url.searchParams.get("sport") || "").toUpperCase();
    const team = String(url.searchParams.get("team") || "").toUpperCase();
    const teamName = String(url.searchParams.get("name") || "").trim().slice(0, 120);
    const eventTicker = String(url.searchParams.get("event") || "").toUpperCase();
    if (!SUPPORTED_TEAM_FUTURES_SPORTS.has(sport)) return json({ error: "Team futures are not supported for this league" }, { status: 400 });
    if (!/^[A-Z0-9]{1,16}$/.test(team)) return json({ error: "Invalid team code" }, { status: 400 });
    const canonicalQuery = new URLSearchParams({ sport, team, name: teamName, event: eventTicker });
    const cacheRequest = new Request(`${url.origin}/api/team-markets?${canonicalQuery}`, request);
    const edgeCache = globalThis.caches?.default;
    const cached = await edgeCache?.match(cacheRequest);
    if (cached) return cached;

    let payload;
    if (sport === "MLB") {
      if (!MLB_TEAMS[team]) return json({ error: "Unknown MLB team" }, { status: 400 });
      const [teamData, oddsPayload] = await Promise.all([
        env.MARKET_ATLAS_CACHE.get(teamFuturesCacheKey("MLB", team), "json"),
        env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json")
      ]);
      if (!teamData) return json({ error: "MLB team cache is warming" }, {
        status: 503,
        headers: { "cache-control": "no-store", "retry-after": "30" }
      });
      if (!validateTeamFuturesRecord(teamData) || teamData.teamCode !== team) {
        return json({ error: "Invalid team futures cache record" }, { status: 503, headers: { "cache-control": "no-store" } });
      }
      payload = { ...teamData, playerProps: buildMlbPlayerProps(oddsPayload, team, eventTicker), supportsPlayerProps: true };
    } else {
      const manifest = await env.MARKET_ATLAS_CACHE.get(TEAM_FUTURES_STATE_KEY, "json");
      if (!manifest) return json({ error: "Team futures cache is warming" }, {
        status: 503,
        headers: { "cache-control": "no-store", "retry-after": "30" }
      });
      payload = buildTeamFuturesFromManifest(manifest, sport, team, teamName || team);
    }

    const response = json(payload, {
      headers: {
        "cache-control": sport === "MLB"
          ? "public, max-age=30, s-maxage=60, stale-while-revalidate=300"
          : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "access-control-allow-origin": "*"
      }
    });
    if (edgeCache && ctx) ctx.waitUntil(edgeCache.put(cacheRequest, response.clone()));
    return response;
  }
  if (url.pathname === "/api/mlb-team-markets") {
    const team = String(url.searchParams.get("team") || "").toUpperCase();
    const eventTicker = String(url.searchParams.get("event") || "").toUpperCase();
    if (!MLB_TEAMS[team]) return json({ error: "Unknown MLB team" }, { status: 400 });
    const cacheRequest = new Request(`${url.origin}/api/mlb-team-markets?team=${team}&event=${encodeURIComponent(eventTicker)}`, request);
    const edgeCache = globalThis.caches?.default;
    const cached = await edgeCache?.match(cacheRequest);
    if (cached) return cached;
    const [teamData, oddsPayload] = await Promise.all([
      env.MARKET_ATLAS_CACHE.get(teamFuturesCacheKey("MLB", team), "json"),
      env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json")
    ]);
    if (!teamData) return json({ error: "MLB team cache is warming" }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "30" }
    });
    if (!validateTeamFuturesRecord(teamData) || teamData.teamCode !== team) {
      return json({ error: "Invalid team futures cache record" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    const response = json({
      ...teamData,
      playerProps: buildMlbPlayerProps(oddsPayload, team, eventTicker)
    }, {
      headers: {
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
        "access-control-allow-origin": "*"
      }
    });
    if (edgeCache && ctx) ctx.waitUntil(edgeCache.put(cacheRequest, response.clone()));
    return response;
  }
  if (url.pathname === "/api/mlb-futures") {
    const team = String(url.searchParams.get("team") || "").toUpperCase();
    if (!MLB_TEAMS[team]) return json({ error: "Unknown MLB team" }, { status: 400 });
    const cacheRequest = new Request(`${url.origin}/api/mlb-futures?team=${team}`, request);
    const edgeCache = globalThis.caches?.default;
    const cached = await edgeCache?.match(cacheRequest);
    if (cached) return cached;
    const teamData = await env.MARKET_ATLAS_CACHE.get(teamFuturesCacheKey("MLB", team), "json");
    if (!teamData) return json({ error: "MLB futures cache is warming" }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "30" }
    });
    if (!validateTeamFuturesRecord(teamData) || teamData.teamCode !== team) {
      return json({ error: "Invalid team futures cache record" }, { status: 503, headers: { "cache-control": "no-store" } });
    }
    const response = json(teamData, {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "access-control-allow-origin": "*"
      }
    });
    if (edgeCache && ctx) ctx.waitUntil(edgeCache.put(cacheRequest, response.clone()));
    return response;
  }
  if (url.pathname !== "/api/odds") return env.ASSETS?.fetch(request) || new Response("Not found", { status: 404 });

  const date = url.searchParams.get("date") || "";
  const localRequest = new Set(["localhost", "127.0.0.1"]).has(url.hostname);
  let payload = await env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json");
  if (localRequest) {
    const state = await env.MARKET_ATLAS_CACHE.get(STATE_KEY, "json");
    const pollDue = Date.now() - number(state?.lastRunAt, 0) >= LOCAL_SCHEDULER_INTERVAL_MS;
    if (pollDue) {
      const poll = startLocalPoll(env, Date.now());
      if (!payload) {
        try {
          await poll;
          payload = await env.MARKET_ATLAS_CACHE.get(PUBLIC_KEY, "json");
        } catch (error) {
          console.warn("Initial local Kalshi poll failed", error?.message || error);
        }
      } else if (ctx) {
        ctx.waitUntil(poll.catch(error => console.warn("Local Kalshi poll failed", error?.message || error)));
      }
    }
  }
  const cacheRequest = new Request(`${url.origin}/api/odds${date ? `?date=${encodeURIComponent(date)}` : ""}`, request);
  const edgeCache = localRequest ? null : globalThis.caches?.default;
  const cached = await edgeCache?.match(cacheRequest);
  if (cached) return cached;

  if (!payload) {
    warmHostedCache(env, ctx, "sports");
    return json({ generatedAt: null, eventCount: 0, events: [], warming: true }, {
      status: 503,
      headers: { "cache-control": "no-store", "retry-after": "30" }
    });
  }
  const filtered = removeStaleEvents(filterForDate(payload, date));
  const etag = `W/\"${Date.parse(payload.generatedAt).toString(36)}-${filtered.eventCount}-${filtered.cache?.staleEventCount || 0}\"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
  const response = json(filtered, {
    headers: {
      etag,
      "cache-control": "public, max-age=15, s-maxage=30, stale-while-revalidate=120",
      "access-control-allow-origin": "*"
    }
  });
  if (edgeCache && ctx) ctx.waitUntil(edgeCache.put(cacheRequest, response.clone()));
  return response;
}

export default {
  fetch: handleRequest,
  async scheduled(controller, env, ctx) {
    const now = controller.scheduledTime || Date.now();
    const refresh = requestCoordinatedRefresh(env, now);
    ctx.waitUntil(refresh.catch(error => {
      console.error(JSON.stringify({
        level: "error",
        message: "Market Atlas scheduled refresh coordinator failed",
        environment: env.ENVIRONMENT || "unknown",
        error: error?.message || String(error)
      }));
      throw error;
    }));
  }
};
