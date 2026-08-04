const MLB_TEAMS = {
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
  ATH: ["Athletics", "A's", "Oakland Athletics"],
  PHI: ["Philadelphia Phillies", "Philadelphia", "Phillies"],
  PIT: ["Pittsburgh Pirates", "Pittsburgh", "Pirates"],
  SD: ["San Diego Padres", "San Diego", "Padres"],
  SF: ["San Francisco Giants", "San Francisco", "Giants"],
  SEA: ["Seattle Mariners", "Seattle", "Mariners"],
  STL: ["St. Louis Cardinals", "St Louis", "St. Louis", "Cardinals"],
  TB: ["Tampa Bay Rays", "Tampa Bay", "Rays"],
  TEX: ["Texas Rangers", "Texas", "Rangers"],
  TOR: ["Toronto Blue Jays", "Toronto", "Blue Jays", "Jays"],
  WSH: ["Washington Nationals", "Washington", "Nationals", "Nats"]
};

const NFL_TEAMS = {
  ARI: ["Arizona Cardinals", "Arizona", "Cardinals"], ATL: ["Atlanta Falcons", "Atlanta", "Falcons"],
  BAL: ["Baltimore Ravens", "Baltimore", "Ravens"], BUF: ["Buffalo Bills", "Buffalo", "Bills"],
  CAR: ["Carolina Panthers", "Carolina", "Panthers"], CHI: ["Chicago Bears", "Chicago", "Bears"],
  CIN: ["Cincinnati Bengals", "Cincinnati", "Bengals"], CLE: ["Cleveland Browns", "Cleveland", "Browns"],
  DAL: ["Dallas Cowboys", "Dallas", "Cowboys"], DEN: ["Denver Broncos", "Denver", "Broncos"],
  DET: ["Detroit Lions", "Detroit", "Lions"], GB: ["Green Bay Packers", "Green Bay", "Packers"],
  HOU: ["Houston Texans", "Houston", "Texans"], IND: ["Indianapolis Colts", "Indianapolis", "Colts"],
  JAX: ["Jacksonville Jaguars", "Jacksonville", "Jaguars"], KC: ["Kansas City Chiefs", "Kansas City", "Chiefs"],
  LAC: ["Los Angeles Chargers", "LA Chargers", "Chargers"], LAR: ["Los Angeles Rams", "LA Rams", "Rams"],
  LV: ["Las Vegas Raiders", "Las Vegas", "Raiders"], MIA: ["Miami Dolphins", "Miami", "Dolphins"],
  MIN: ["Minnesota Vikings", "Minnesota", "Vikings"], NE: ["New England Patriots", "New England", "Patriots"],
  NO: ["New Orleans Saints", "New Orleans", "Saints"], NYG: ["New York Giants", "NY Giants", "Giants"],
  NYJ: ["New York Jets", "NY Jets", "Jets"], PHI: ["Philadelphia Eagles", "Philadelphia", "Eagles"],
  PIT: ["Pittsburgh Steelers", "Pittsburgh", "Steelers"], SEA: ["Seattle Seahawks", "Seattle", "Seahawks"],
  SF: ["San Francisco 49ers", "San Francisco", "49ers", "Niners"], TB: ["Tampa Bay Buccaneers", "Tampa Bay", "Buccaneers", "Bucs"],
  TEN: ["Tennessee Titans", "Tennessee", "Titans"], WSH: ["Washington Commanders", "Washington", "Commanders"]
};

const NBA_TEAMS = {
  ATL: ["Atlanta Hawks", "Atlanta", "Hawks"], BOS: ["Boston Celtics", "Boston", "Celtics"],
  BKN: ["Brooklyn Nets", "Brooklyn", "Nets"], CHA: ["Charlotte Hornets", "Charlotte", "Hornets"],
  CHI: ["Chicago Bulls", "Chicago", "Bulls"], CLE: ["Cleveland Cavaliers", "Cleveland", "Cavaliers", "Cavs"],
  DAL: ["Dallas Mavericks", "Dallas", "Mavericks", "Mavs"], DEN: ["Denver Nuggets", "Denver", "Nuggets"],
  DET: ["Detroit Pistons", "Detroit", "Pistons"], GSW: ["Golden State Warriors", "Golden State", "Warriors"],
  HOU: ["Houston Rockets", "Houston", "Rockets"], IND: ["Indiana Pacers", "Indiana", "Pacers"],
  LAC: ["LA Clippers", "Los Angeles Clippers", "Los Angeles C", "Clippers"],
  LAL: ["Los Angeles Lakers", "Los Angeles L", "LA Lakers", "Lakers"],
  MEM: ["Memphis Grizzlies", "Memphis", "Grizzlies"], MIA: ["Miami Heat", "Miami", "Heat"],
  MIL: ["Milwaukee Bucks", "Milwaukee", "Bucks"], MIN: ["Minnesota Timberwolves", "Minnesota", "Timberwolves", "Wolves"],
  NOP: ["New Orleans Pelicans", "New Orleans", "Pelicans"], NYK: ["New York Knicks", "New York K", "Knicks"],
  OKC: ["Oklahoma City Thunder", "Oklahoma City", "Thunder"], ORL: ["Orlando Magic", "Orlando", "Magic"],
  PHI: ["Philadelphia 76ers", "Philadelphia", "76ers", "Sixers"], PHX: ["Phoenix Suns", "Phoenix", "Suns"],
  POR: ["Portland Trail Blazers", "Portland", "Trail Blazers", "Blazers"], SAC: ["Sacramento Kings", "Sacramento", "Kings"],
  SAS: ["San Antonio Spurs", "San Antonio", "Spurs"], TOR: ["Toronto Raptors", "Toronto", "Raptors"],
  UTA: ["Utah Jazz", "Utah", "Jazz"], WSH: ["Washington Wizards", "Washington", "Wizards"]
};

const WNBA_TEAMS = {
  ATL: ["Atlanta Dream", "Atlanta", "Dream"], CHI: ["Chicago Sky", "Chicago", "Sky"],
  CON: ["Connecticut Sun", "Connecticut", "Sun"], DAL: ["Dallas Wings", "Dallas", "Wings"],
  GS: ["Golden State Valkyries", "Golden State", "Valkyries"], IND: ["Indiana Fever", "Indiana", "Fever"],
  LA: ["Los Angeles Sparks", "Los Angeles", "Sparks"], LV: ["Las Vegas Aces", "Las Vegas", "Aces"],
  MIN: ["Minnesota Lynx", "Minnesota", "Lynx"], NY: ["New York Liberty", "New York", "Liberty"],
  PHX: ["Phoenix Mercury", "Phoenix", "Mercury"], POR: ["Portland Fire", "Portland", "Fire"],
  SEA: ["Seattle Storm", "Seattle", "Storm"], TOR: ["Toronto Tempo", "Toronto", "Tempo"],
  WSH: ["Washington Mystics", "Washington", "Mystics"]
};

const NHL_TEAMS = {
  ANA: ["Anaheim Ducks", "Anaheim", "Ducks"], BOS: ["Boston Bruins", "Boston", "Bruins"],
  BUF: ["Buffalo Sabres", "Buffalo", "Sabres"], CAR: ["Carolina Hurricanes", "Carolina", "Hurricanes", "Canes"],
  CBJ: ["Columbus Blue Jackets", "Columbus", "Blue Jackets"], CGY: ["Calgary Flames", "Calgary", "Flames"],
  CHI: ["Chicago Blackhawks", "Chicago", "Blackhawks"], COL: ["Colorado Avalanche", "Colorado", "Avalanche", "Avs"],
  DAL: ["Dallas Stars", "Dallas", "Stars"], DET: ["Detroit Red Wings", "Detroit", "Red Wings"],
  EDM: ["Edmonton Oilers", "Edmonton", "Oilers"], FLA: ["Florida Panthers", "Florida", "Panthers"],
  LAK: ["Los Angeles Kings", "Los Angeles", "LA Kings"], MIN: ["Minnesota Wild", "Minnesota", "Wild"],
  MTL: ["Montréal Canadiens", "Montreal Canadiens", "Montreal", "Canadiens", "Habs"],
  NJD: ["New Jersey Devils", "New Jersey", "Devils"], NSH: ["Nashville Predators", "Nashville", "Predators", "Preds"],
  NYI: ["New York Islanders", "New York I", "Islanders"], NYR: ["New York Rangers", "New York R", "Rangers"],
  OTT: ["Ottawa Senators", "Ottawa", "Senators", "Sens"], PHI: ["Philadelphia Flyers", "Philadelphia", "Flyers"],
  PIT: ["Pittsburgh Penguins", "Pittsburgh", "Penguins", "Pens"], SEA: ["Seattle Kraken", "Seattle", "Kraken"],
  SJS: ["San Jose Sharks", "San Jose", "Sharks"], STL: ["St. Louis Blues", "St Louis", "Blues"],
  TBL: ["Tampa Bay Lightning", "Tampa Bay", "Lightning"], TOR: ["Toronto Maple Leafs", "Toronto", "Maple Leafs", "Leafs"],
  UTA: ["Utah Mammoth", "Utah", "Mammoth"], VAN: ["Vancouver Canucks", "Vancouver", "Canucks"],
  VGK: ["Vegas Golden Knights", "Las Vegas", "Vegas", "Golden Knights"], WPG: ["Winnipeg Jets", "Winnipeg", "Jets"],
  WSH: ["Washington Capitals", "Washington", "Capitals", "Caps"]
};

const IPL_TEAMS = {
  CSK: ["Chennai Super Kings", "Chennai", "Super Kings"], DC: ["Delhi Capitals", "Delhi", "Capitals"],
  GT: ["Gujarat Titans", "Gujarat", "Titans"], KKR: ["Kolkata Knight Riders", "Kolkata", "Knight Riders"],
  LSG: ["Lucknow Super Giants", "Lucknow", "Super Giants"], MI: ["Mumbai Indians", "Mumbai", "Indians"],
  PBKS: ["Punjab Kings", "Punjab"], RCB: ["Royal Challengers Bengaluru", "Bengaluru", "Royal Challengers Bangalore"],
  RR: ["Rajasthan Royals", "Rajasthan", "Royals"], SRH: ["Sunrisers Hyderabad", "Hyderabad", "Sunrisers"]
};

const COLLEGE_NAMES = new Map(Object.entries({
  "Arizona St": "Arizona State", "Florida St": "Florida State", "Kansas St": "Kansas State",
  "Michigan St": "Michigan State", "Mississippi St": "Mississippi State", "Oklahoma St": "Oklahoma State",
  Pitt: "Pittsburgh"
}));

const normalized = value => String(value || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function aliasIndex(teams) {
  const aliases = new Map();
  Object.entries(teams).forEach(([code, names]) => {
    aliases.set(normalized(code), names[0]);
    names.forEach(name => aliases.set(normalized(name), names[0]));
  });
  return aliases;
}

const MLB_ALIASES = aliasIndex(MLB_TEAMS);
const NFL_ALIASES = aliasIndex(NFL_TEAMS);
const NBA_ALIASES = aliasIndex(NBA_TEAMS);
const WNBA_ALIASES = aliasIndex(WNBA_TEAMS);
const NHL_ALIASES = aliasIndex(NHL_TEAMS);
const IPL_ALIASES = aliasIndex(IPL_TEAMS);

function leagueFor({ sport = "", seriesTicker = "" } = {}) {
  const sportName = String(sport).toUpperCase();
  const ticker = String(seriesTicker).toUpperCase();
  if (sportName === "MLB" || ticker.startsWith("KXMLB")) return "MLB";
  if (sportName === "NFL" || ticker.startsWith("KXNFL") || ticker.startsWith("KXSB")) return "NFL";
  if (sportName === "CFB" || sportName === "COLLEGE FOOTBALL" || ticker.startsWith("KXNCAAF")) return "CFB";
  if (sportName === "NBA" || ticker.startsWith("KXNBA")) return "NBA";
  if (sportName === "WNBA" || ticker.startsWith("KXWNBA")) return "WNBA";
  if (sportName === "NHL" || ticker.startsWith("KXNHL")) return "NHL";
  if (sportName === "IPL" || ticker.startsWith("KXIPL")) return "IPL";
  return "";
}

function tickerTeamCode(ticker, teams) {
  const code = String(ticker || "").toUpperCase().split("-").at(-1);
  return teams[code] ? code : "";
}

export function sportsTeamName(value, context = {}) {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  const league = leagueFor(context);
  if (league === "MLB") {
    const code = tickerTeamCode(context.ticker, MLB_TEAMS);
    return code ? MLB_TEAMS[code][0] : MLB_ALIASES.get(normalized(raw)) || raw;
  }
  if (league === "NFL") {
    const code = tickerTeamCode(context.ticker, NFL_TEAMS);
    return code ? NFL_TEAMS[code][0] : NFL_ALIASES.get(normalized(raw)) || raw;
  }
  const leagueTeams = { NBA: NBA_TEAMS, WNBA: WNBA_TEAMS, NHL: NHL_TEAMS, IPL: IPL_TEAMS }[league];
  const leagueAliases = { NBA: NBA_ALIASES, WNBA: WNBA_ALIASES, NHL: NHL_ALIASES, IPL: IPL_ALIASES }[league];
  if (leagueTeams) {
    const code = tickerTeamCode(context.ticker, leagueTeams);
    return code ? leagueTeams[code][0] : leagueAliases.get(normalized(raw)) || raw;
  }
  if (league === "CFB") return COLLEGE_NAMES.get(raw) || raw;
  return raw;
}

export function canonicalSportsMatchupTitle(value, context = {}) {
  const raw = String(value || "").trim();
  if (!raw || !leagueFor(context)) return raw;
  const separator = raw.match(/\s+(at|vs\.?|versus)\s+/i);
  if (!separator) return sportsTeamName(raw, context);
  const before = raw.slice(0, separator.index);
  const after = raw.slice(separator.index + separator[0].length);
  const prefixMatch = before.match(/^(.*?\s·\s)(.+)$/);
  const prefix = prefixMatch?.[1] || "";
  const away = prefixMatch?.[2] || before;
  const suffixIndex = after.indexOf(":");
  const home = suffixIndex >= 0 ? after.slice(0, suffixIndex) : after;
  const suffix = suffixIndex >= 0 ? after.slice(suffixIndex) : "";
  const separatorLabel = separator[1].toLowerCase().startsWith("at") ? "at" : "vs";
  return `${prefix}${sportsTeamName(away, context)} ${separatorLabel} ${sportsTeamName(home, context)}${suffix}`;
}

export function canonicalSportsOutcomeName(value, context = {}) {
  const ticker = String(context.seriesTicker || "").toUpperCase();
  const isTeamGame = ticker.includes("GAME") || ticker === "KXMLB" || ticker === "KXNFL" || ticker === "KXNCAAF";
  return isTeamGame ? sportsTeamName(value, context) : String(value || "");
}

export { MLB_TEAMS, NFL_TEAMS, NBA_TEAMS, WNBA_TEAMS, NHL_TEAMS, IPL_TEAMS };
