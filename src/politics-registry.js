import { HOUSE_DISTRICT_CENTROIDS } from "./congressional-district-centroids.js";

const US_ELECTION_DATE = "2026-11-03";
export const HOUSE_RACE_PREVIEW_MIN_SCALE = 1600;
export const HOUSE_RACE_MIN_SCALE = 4000;
export const MAJOR_SENATE_PRIMARY_VOLUME = 40_000;

export function houseRaceRevealScale(rank, total) {
  const percentile = Math.max(0, Number(rank) || 0) / Math.max(1, Number(total) || 1);
  if (percentile < 0.20) return HOUSE_RACE_PREVIEW_MIN_SCALE;
  if (percentile < 0.50) return 2200;
  if (percentile < 0.80) return 3000;
  return HOUSE_RACE_MIN_SCALE;
}

const stateRows = [
  ["Alabama", "AL", "Montgomery", -86.3000, 32.3777], ["Alaska", "AK", "Juneau", -134.4197, 58.3019],
  ["Arizona", "AZ", "Phoenix", -112.0740, 33.4484], ["Arkansas", "AR", "Little Rock", -92.2896, 34.7465],
  ["California", "CA", "Sacramento", -121.4944, 38.5816], ["Colorado", "CO", "Denver", -104.9903, 39.7392],
  ["Connecticut", "CT", "Hartford", -72.6734, 41.7658], ["Delaware", "DE", "Dover", -75.5244, 39.1582],
  ["Florida", "FL", "Tallahassee", -84.2807, 30.4383], ["Georgia", "GA", "Atlanta", -84.3880, 33.7490],
  ["Hawaii", "HI", "Honolulu", -157.8583, 21.3069], ["Idaho", "ID", "Boise", -116.2023, 43.6150],
  ["Illinois", "IL", "Springfield", -89.6501, 39.7817], ["Indiana", "IN", "Indianapolis", -86.1581, 39.7684],
  ["Iowa", "IA", "Des Moines", -93.6091, 41.5868], ["Kansas", "KS", "Topeka", -95.6752, 39.0473],
  ["Kentucky", "KY", "Frankfort", -84.8733, 38.2009], ["Louisiana", "LA", "Baton Rouge", -91.1403, 30.4515],
  ["Maine", "ME", "Augusta", -69.7795, 44.3106], ["Maryland", "MD", "Annapolis", -76.4922, 38.9784],
  ["Massachusetts", "MA", "Boston", -71.0589, 42.3601], ["Michigan", "MI", "Lansing", -84.5555, 42.7325],
  ["Minnesota", "MN", "Saint Paul", -93.0900, 44.9537], ["Mississippi", "MS", "Jackson", -90.1848, 32.2988],
  ["Missouri", "MO", "Jefferson City", -92.1735, 38.5767], ["Montana", "MT", "Helena", -112.0391, 46.5891],
  ["Nebraska", "NE", "Lincoln", -96.6852, 40.8136], ["Nevada", "NV", "Carson City", -119.7674, 39.1638],
  ["New Hampshire", "NH", "Concord", -71.5376, 43.2081], ["New Jersey", "NJ", "Trenton", -74.7429, 40.2171],
  ["New Mexico", "NM", "Santa Fe", -105.9378, 35.6870], ["New York", "NY", "Albany", -73.7562, 42.6526],
  ["North Carolina", "NC", "Raleigh", -78.6382, 35.7796], ["North Dakota", "ND", "Bismarck", -100.7837, 46.8083],
  ["Ohio", "OH", "Columbus", -82.9988, 39.9612], ["Oklahoma", "OK", "Oklahoma City", -97.5164, 35.4676],
  ["Oregon", "OR", "Salem", -123.0351, 44.9429], ["Pennsylvania", "PA", "Harrisburg", -76.8867, 40.2732],
  ["Rhode Island", "RI", "Providence", -71.4128, 41.8240], ["South Carolina", "SC", "Columbia", -81.0348, 34.0007],
  ["South Dakota", "SD", "Pierre", -100.3510, 44.3683], ["Tennessee", "TN", "Nashville", -86.7816, 36.1627],
  ["Texas", "TX", "Austin", -97.7431, 30.2672], ["Utah", "UT", "Salt Lake City", -111.8910, 40.7608],
  ["Vermont", "VT", "Montpelier", -72.5754, 44.2601], ["Virginia", "VA", "Richmond", -77.4360, 37.5407],
  ["Washington", "WA", "Olympia", -122.9007, 47.0379], ["West Virginia", "WV", "Charleston", -81.6326, 38.3498],
  ["Wisconsin", "WI", "Madison", -89.4012, 43.0731], ["Wyoming", "WY", "Cheyenne", -104.8202, 41.1400]
];

export const US_STATE_CAPITALS = Object.fromEntries(stateRows.map(([name, code, capital, lon, lat]) => [name, { name, code, capital, lon, lat }]));
const stateByCode = new Map(Object.values(US_STATE_CAPITALS).map(state => [state.code, state]));

const NATIONAL_SERIES = {
  CONTROLH: { office: "Congress", title: "U.S. House control", importance: 100 },
  CONTROLS: { office: "Senate", title: "U.S. Senate control", importance: 100 },
  KXBALANCEPOWERCOMBO: { office: "Congress", title: "Balance of power", importance: 92 },
  KXRHOUSESEATS: { office: "Congress", title: "Republican House seats", importance: 68 },
  KXDHOUSESEATS: { office: "Congress", title: "Democratic House seats", importance: 68 },
  KXDSENATESEATS: { office: "Senate", title: "Democratic Senate seats", importance: 68 },
  RSENATESEATS: { office: "Senate", title: "Republican Senate seats", importance: 68 },
  KXPRESPERSON: { office: "President", title: "U.S. presidential winner", importance: 100, cycle: "2028" },
  KXPRESPARTY: { office: "President", title: "U.S. presidential party", importance: 96, cycle: "2028" }
};

const GLOBAL_SERIES = {
  KXBRPRES: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "President", 100],
  KXBRPRES1R: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "President", 84],
  KXBRPRESADVANCE: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "President", 78],
  KXBRAZILPRES1R: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "President", 74],
  KXBRAZILSENATE: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "Senate", 70],
  KXBRSENMOSTSEATS: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "Senate", 66],
  KXBRGOVMOSTSEATS: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "Governor", 62],
  KXBRDEP: ["Brazil", "BRA", "Brasília", -47.8825, -15.7942, "2026-10-04", "October 4, 2026", "Congress", 64],
  KXFRENCHPRES: ["France", "FRA", "Paris", 2.3522, 48.8566, "france-2027", "2027 presidential election", "President", 100],
  KXFRPRESBALLOT: ["France", "FRA", "Paris", 2.3522, 48.8566, "france-2027", "2027 presidential election", "President", 72],
  KXPRESNIGERIA: ["Nigeria", "NGA", "Abuja", 7.3986, 9.0765, "2027-02-20", "February 20, 2027", "President", 100],
  KXNIGERIASENATE: ["Nigeria", "NGA", "Abuja", 7.3986, 9.0765, "2027-02-20", "February 20, 2027", "Senate", 70],
  KXARGENTINAPRES: ["Argentina", "ARG", "Buenos Aires", -58.3816, -34.6037, "argentina-2027", "2027 election", "President", 100],
  KXISRAELPM: ["Israel", "ISR", "Jerusalem", 35.2137, 31.7683, "israel-2026", "2026 election", "President", 96],
  KXISRAELKNESSET: ["Israel", "ISR", "Jerusalem", 35.2137, 31.7683, "israel-2026", "2026 election", "Congress", 92],
  KXUKPARTY: ["United Kingdom", "GBR", "London", -0.1276, 51.5072, "uk-next", "Next general election", "Congress", 100],
  KXUKCOALITION: ["United Kingdom", "GBR", "London", -0.1276, 51.5072, "uk-next", "Next general election", "Congress", 76],
  KXGERELECTION: ["Germany", "DEU", "Berlin", 13.4050, 52.5200, "germany-2029", "2029 federal election", "Congress", 100]
};

const politicalLocations = [
  [/\bstrait of hormuz\b|\bhormuz\b/i, "Strait of Hormuz", "HRM", "Strait of Hormuz", 56.2500, 26.5667],
  [/\bgreenland\b/i, "Greenland", "GRL", "Nuuk", -51.7216, 64.1814],
  [/\btaiwan\b/i, "Taiwan", "TWN", "Taipei", 121.5654, 25.0330],
  [/\bpanama(?: canal)?\b/i, "Panama", "PAN", "Panama City", -79.5199, 8.9824],
  [/\bukraine\b|\bukrainian\b/i, "Ukraine", "UKR", "Kyiv", 30.5234, 50.4501],
  [/\brussia\b|\brussian\b|\bmoscow\b/i, "Russia", "RUS", "Moscow", 37.6173, 55.7558],
  [/\bchina\b|\bchinese\b|\bprc\b/i, "China", "CHN", "Beijing", 116.4074, 39.9042],
  [/\biran\b|\biranian\b/i, "Iran", "IRN", "Tehran", 51.3890, 35.6892],
  [/\bvenezuela\b|\bvenezuelan\b/i, "Venezuela", "VEN", "Caracas", -66.9036, 10.4806],
  [/\bsaudi arabia\b|\bsaudi\b/i, "Saudi Arabia", "SAU", "Riyadh", 46.6753, 24.7136],
  [/\bisrael\b|\bisraeli\b|\bknesset\b/i, "Israel", "ISR", "Jerusalem", 35.2137, 31.7683],
  [/\bsyria\b|\bsyrian\b/i, "Syria", "SYR", "Damascus", 36.2765, 33.5138],
  [/\bpalestine\b|\bpalestinian\b/i, "Palestine", "PSE", "Ramallah", 35.2034, 31.9038],
  [/\bpakistan\b|\bpakistani\b/i, "Pakistan", "PAK", "Islamabad", 73.0479, 33.6844],
  [/\bunited kingdom\b|\bbritain\b|\bbritish\b|\bu\.k\.\b|\bthe uk\b/i, "United Kingdom", "GBR", "London", -0.1276, 51.5072],
  [/\bindia\b|\bindian\b/i, "India", "IND", "New Delhi", 77.2090, 28.6139],
  [/\bontario\b/i, "Ontario", "ON", "Toronto", -79.3832, 43.6532],
  [/\balberta\b/i, "Alberta", "AB", "Edmonton", -113.4909, 53.5461],
  [/\bcanada\b|\bcanadian\b/i, "Canada", "CAN", "Ottawa", -75.6972, 45.4215],
  [/\bbrazil\b|\bbrazilian\b/i, "Brazil", "BRA", "Brasília", -47.8825, -15.7942],
  [/\bhungary\b|\bhungarian\b/i, "Hungary", "HUN", "Budapest", 19.0402, 47.4979],
  [/\baustria\b|\baustrian\b/i, "Austria", "AUT", "Vienna", 16.3738, 48.2082],
  [/\bsomaliland\b/i, "Somaliland", "SOM", "Hargeisa", 44.0640, 9.5624],
  [/\bsouth korea\b|\bkorean\b/i, "South Korea", "KOR", "Seoul", 126.9780, 37.5665],
  [/\bphilippines\b|\bphilippine\b|\bfilipino\b/i, "Philippines", "PHL", "Manila", 120.9842, 14.5995],
  [/\bpapua new guinea\b|\bbougainville\b/i, "Papua New Guinea", "PNG", "Port Moresby", 147.1803, -9.4438],
  [/\bqatar\b|\bqatari\b/i, "Qatar", "QAT", "Doha", 51.5310, 25.2854],
  [/\blebanon\b|\blebanese\b/i, "Lebanon", "LBN", "Beirut", 35.5018, 33.8938],
  [/\bgermany\b|\bgerman\b/i, "Germany", "DEU", "Berlin", 13.4050, 52.5200],
  [/\bfrance\b|\bfrench\b/i, "France", "FRA", "Paris", 2.3522, 48.8566],
  [/\bspain\b|\bspanish\b/i, "Spain", "ESP", "Madrid", -3.7038, 40.4168],
  [/\bnew zealand\b/i, "New Zealand", "NZL", "Wellington", 174.7787, -41.2924],
  [/\baustralia\b|\baustralian\b/i, "Australia", "AUS", "Canberra", 149.1300, -35.2809],
  [/\bserbia\b|\bserbian\b/i, "Serbia", "SRB", "Belgrade", 20.4489, 44.7866],
  [/\bjapan\b|\bjapanese\b/i, "Japan", "JPN", "Tokyo", 139.6917, 35.6895],
  [/\bromania\b|\bromanian\b/i, "Romania", "ROU", "Bucharest", 26.1025, 44.4268],
  [/\bperu\b|\bperuvian\b/i, "Peru", "PER", "Lima", -77.0428, -12.0464],
  [/\bmexico\b|\bmexican\b/i, "Mexico", "MEX", "Mexico City", -99.1332, 19.4326],
  [/\bpoland\b|\bpolish\b/i, "Poland", "POL", "Warsaw", 21.0122, 52.2297],
  [/\bturkey\b|\bturkish\b|\btürkiye\b/i, "Türkiye", "TUR", "Ankara", 32.8597, 39.9334],
  [/\bunited states\b|\bu\.s\.(?:\s|$)|\bus\b|\busa\b|\bamerica\b/i, "United States", "USA", "Washington, D.C.", -77.0369, 38.9072]
];

const manualLocation = (id, jurisdiction, code, capital, lon, lat) => ({ id, jurisdiction, code, capital, lon, lat });

const MANUAL_LOCATIONS = {
  oslo: manualLocation("intl-nor", "Norway", "NOR", "Oslo", 10.7522, 59.9139),
  brussels: manualLocation("intl-eu", "European Union", "EU", "Brussels", 4.3517, 50.8503),
  vienna: manualLocation("intl-opec", "OPEC", "OPEC", "Vienna", 16.3738, 48.2082),
  london: manualLocation("intl-gbr", "United Kingdom", "GBR", "London", -0.1276, 51.5072),
  austin: manualLocation("intl-austin", "Austin", "ATX", "Austin, Texas", -97.7431, 30.2672),
  shanghai: manualLocation("intl-shanghai", "Shanghai", "SHA", "Shanghai", 121.4737, 31.2304),
  washington: manualLocation("intl-usa", "United States", "USA", "Washington, D.C.", -77.0369, 38.9072),
  tehran: manualLocation("intl-irn", "Iran", "IRN", "Tehran", 51.3890, 35.6892),
  lubmin: manualLocation("intl-nord-stream-2", "Nord Stream 2", "NS2", "Lubmin, Germany", 13.6167, 54.1333),
  telAviv: manualLocation("intl-tel-aviv", "Israel", "ISR", "Tel Aviv", 34.7818, 32.0853),
  vatican: manualLocation("intl-vatican", "Vatican City", "VAT", "Vatican City", 12.4534, 41.9029),
  moscow: manualLocation("intl-rus", "Russia", "RUS", "Moscow", 37.6173, 55.7558),
  kyiv: manualLocation("intl-ukr", "Ukraine", "UKR", "Kyiv", 30.5234, 50.4501),
  riyadh: manualLocation("intl-sau", "Saudi Arabia", "SAU", "Riyadh", 46.6753, 24.7136),
  doha: manualLocation("intl-qat", "Qatar", "QAT", "Doha", 51.5310, 25.2854),
  ottawa: manualLocation("intl-can", "Canada", "CAN", "Ottawa", -75.6972, 45.4215),
  paris: manualLocation("intl-fra", "France", "FRA", "Paris", 2.3522, 48.8566),
  berlin: manualLocation("intl-deu", "Germany", "DEU", "Berlin", 13.4050, 52.5200),
  rome: manualLocation("intl-ita", "Italy", "ITA", "Rome", 12.4964, 41.9028),
  tokyo: manualLocation("intl-jpn", "Japan", "JPN", "Tokyo", 139.6917, 35.6895),
  bogota: manualLocation("intl-col", "Colombia", "COL", "Bogotá", -74.0721, 4.7110),
  belgrade: manualLocation("intl-srb", "Serbia", "SRB", "Belgrade", 20.4489, 44.7866),
  wellington: manualLocation("intl-nzl", "New Zealand", "NZL", "Wellington", 174.7787, -41.2924),
  jerusalem: manualLocation("intl-isr", "Israel", "ISR", "Jerusalem", 35.2137, 31.7683),
  buenosAires: manualLocation("intl-arg", "Argentina", "ARG", "Buenos Aires", -58.3816, -34.6037),
  pretoria: manualLocation("intl-zaf", "South Africa", "ZAF", "Pretoria", 28.2293, -25.7479),
  ankara: manualLocation("intl-tur", "Türkiye", "TUR", "Ankara", 32.8597, 39.9334),
  beijing: manualLocation("intl-chn", "China", "CHN", "Beijing", 116.4074, 39.9042),
  riyadhCapital: manualLocation("intl-sau", "Saudi Arabia", "SAU", "Riyadh", 46.6753, 24.7136),
  newDelhi: manualLocation("intl-ind", "India", "IND", "New Delhi", 77.2090, 28.6139),
  pyongyang: manualLocation("intl-prk", "North Korea", "PRK", "Pyongyang", 125.7625, 39.0392),
  damascus: manualLocation("intl-syr", "Syria", "SYR", "Damascus", 36.2765, 33.5138),
  quito: manualLocation("intl-ecu", "Ecuador", "ECU", "Quito", -78.4678, -0.1807),
  mexicoCity: manualLocation("intl-mex", "Mexico", "MEX", "Mexico City", -99.1332, 19.4326),
  laPaz: manualLocation("intl-bol", "Bolivia", "BOL", "La Paz", -68.1193, -16.4897),
  sanSalvador: manualLocation("intl-slv", "El Salvador", "SLV", "San Salvador", -89.2182, 13.6929),
  seoul: manualLocation("intl-kor", "South Korea", "KOR", "Seoul", 126.9780, 37.5665),
  brazzaville: manualLocation("intl-cog", "Republic of the Congo", "COG", "Brazzaville", 15.2663, -4.2634),
  kinshasa: manualLocation("intl-cod", "DR Congo", "COD", "Kinshasa", 15.2663, -4.4419),
  havana: manualLocation("intl-cub", "Cuba", "CUB", "Havana", -82.3666, 23.1136),
  madrid: manualLocation("intl-esp", "Spain", "ESP", "Madrid", -3.7038, 40.4168),
  georgetown: manualLocation("intl-guy", "Guyana", "GUY", "Georgetown", -58.1551, 6.8013),
  copenhagen: manualLocation("intl-dnk", "Denmark", "DNK", "Copenhagen", 12.5683, 55.6761),
  nuuk: manualLocation("intl-grl", "Greenland", "GRL", "Nuuk", -51.7216, 64.1814),
  caracas: manualLocation("intl-ven", "Venezuela", "VEN", "Caracas", -66.9036, 10.4806),
  grozny: manualLocation("intl-che", "Chechnya", "CHE", "Grozny", 45.6986, 43.3181)
};

const MANUAL_SERIES_LOCATIONS = {
  KXNOBELPEACE: [MANUAL_LOCATIONS.oslo],
  KXEUEXIT: [MANUAL_LOCATIONS.brussels],
  KXEUEXPANSION: [MANUAL_LOCATIONS.brussels],
  KXEUEXITCOUNTRY: [MANUAL_LOCATIONS.brussels],
  KXTARIFFRATEEU: [MANUAL_LOCATIONS.brussels],
  KXLEAVEOPEC: [MANUAL_LOCATIONS.vienna],
  KXUKRENEWOB: [MANUAL_LOCATIONS.london],
  KXELONMARS: [MANUAL_LOCATIONS.austin],
  KXBRICS: [MANUAL_LOCATIONS.shanghai],
  KXSUPERBOWLWHITEHOUSE: [MANUAL_LOCATIONS.washington],
  KXTRUMPMOJTABA: [MANUAL_LOCATIONS.tehran],
  KXNORDSTREAM2: [MANUAL_LOCATIONS.lubmin],
  KXNETANYAHUPARDON: [MANUAL_LOCATIONS.telAviv],
  KXBURNHAMOUT: [MANUAL_LOCATIONS.london],
  KXPOPEVISIT: [MANUAL_LOCATIONS.vatican],
  KXZELENSKYPUTIN: [MANUAL_LOCATIONS.moscow, MANUAL_LOCATIONS.kyiv],
  KXABRAHAMSA: [MANUAL_LOCATIONS.telAviv, MANUAL_LOCATIONS.riyadh],
  KXABRAHAMQ: [MANUAL_LOCATIONS.telAviv, MANUAL_LOCATIONS.doha],
  KXG7LEADEROUT: [
    MANUAL_LOCATIONS.ottawa, MANUAL_LOCATIONS.paris, MANUAL_LOCATIONS.berlin, MANUAL_LOCATIONS.rome,
    MANUAL_LOCATIONS.tokyo, MANUAL_LOCATIONS.london, MANUAL_LOCATIONS.washington
  ]
};

const LEADER_LOCATIONS = new Map(Object.entries({
  "benjamin netanyahu": MANUAL_LOCATIONS.jerusalem,
  "volodymyr zelenskyy": MANUAL_LOCATIONS.kyiv,
  "javier milei": MANUAL_LOCATIONS.buenosAires,
  "mark carney": MANUAL_LOCATIONS.ottawa,
  "cyril ramaphosa": MANUAL_LOCATIONS.pretoria,
  "giorgia meloni": MANUAL_LOCATIONS.rome,
  "luiz inacio lula da silva": manualLocation("intl-bra", "Brazil", "BRA", "Brasília", -47.8825, -15.7942),
  "recep tayyip erdogan": MANUAL_LOCATIONS.ankara,
  "keir starmer": MANUAL_LOCATIONS.london,
  "xi jinping": MANUAL_LOCATIONS.beijing,
  "vladimir putin": MANUAL_LOCATIONS.moscow,
  "mohammed bin salman": MANUAL_LOCATIONS.riyadhCapital,
  "narendra modi": MANUAL_LOCATIONS.newDelhi,
  "emmanuel macron": MANUAL_LOCATIONS.paris,
  "sanae takaichi": MANUAL_LOCATIONS.tokyo,
  "kim jong un": MANUAL_LOCATIONS.pyongyang,
  "ahmad al sharaa": MANUAL_LOCATIONS.damascus,
  "aleksandar vucic": MANUAL_LOCATIONS.belgrade,
  "daniel noboa": MANUAL_LOCATIONS.quito,
  "claudia sheinbaum": MANUAL_LOCATIONS.mexicoCity,
  "rodrigo paz pereira": MANUAL_LOCATIONS.laPaz,
  "nayib bukele": MANUAL_LOCATIONS.sanSalvador,
  "lee jae myung": MANUAL_LOCATIONS.seoul,
  "gustavo petro": MANUAL_LOCATIONS.bogota,
  "christopher luxon": MANUAL_LOCATIONS.wellington,
  "denis sassou nguesso": MANUAL_LOCATIONS.brazzaville,
  "felix tshisekedi": MANUAL_LOCATIONS.kinshasa,
  "friedrich merz": MANUAL_LOCATIONS.berlin,
  "miguel diaz canel": MANUAL_LOCATIONS.havana,
  "pedro sanchez": MANUAL_LOCATIONS.madrid,
  "irfaan ali": MANUAL_LOCATIONS.georgetown,
  "frederik x": MANUAL_LOCATIONS.copenhagen,
  "jens frederik nielsen": MANUAL_LOCATIONS.nuuk,
  "mette frederiksen": MANUAL_LOCATIONS.copenhagen,
  "delcy rodriguez": MANUAL_LOCATIONS.caracas,
  "ramzan kadyrov": MANUAL_LOCATIONS.grozny,
  "sebastien lecornu": MANUAL_LOCATIONS.paris
}).map(([name, location]) => [name, location]));

function normalizedName(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function marketProbability(market) {
  if (market?.lastPrice != null) return Number(market.lastPrice);
  if (market?.yesBid != null && market?.yesAsk != null) return (Number(market.yesBid) + Number(market.yesAsk)) / 2;
  return Number(market?.yesAsk ?? market?.yesBid ?? -1);
}

function likelyLeaderLocations(snapshot) {
  const seen = new Set();
  return (snapshot?.markets || [])
    .map(market => ({ location: LEADER_LOCATIONS.get(normalizedName(market.label || market.title)), probability: marketProbability(market) }))
    .filter(candidate => candidate.location && Number.isFinite(candidate.probability))
    .sort((left, right) => right.probability - left.probability)
    .filter(candidate => !seen.has(candidate.location.id) && seen.add(candidate.location.id))
    .slice(0, 5)
    .map(candidate => candidate.location);
}

function manualPoliticsClassification(location) {
  return {
    jurisdictionId: location.id, geography: "Global", jurisdiction: location.jurisdiction, code: location.code,
    capital: location.capital, lon: location.lon, lat: location.lat, dateKey: "international",
    dateLabel: "Open international markets", confidence: "Manually located", scope: "Geopolitical",
    office: "International", importance: 76
  };
}

export function resolvePoliticalLocation(text) {
  const matches = politicalLocations.filter(([pattern]) => pattern.test(String(text || "")));
  const withoutActorUs = matches.length > 1 ? matches.filter(([, , code]) => code !== "USA") : matches;
  if (withoutActorUs.length !== 1) return null;
  const match = withoutActorUs[0];
  const [, jurisdiction, code, capital, lon, lat] = match;
  return { jurisdiction, code, capital, lon, lat };
}

const candidateParties = new Map(Object.entries({
  "ken paxton": "R", "susan collins": "R", "michael whatley": "R", "ashley hinson": "R", "mike collins": "R",
  "jon husted": "R", "pete ricketts": "R", "kurt alme": "R", "jim risch": "R", "cindy hyde-smith": "R",
  "steve hilton": "R", "vivek ramaswamy": "R", "rick jackson": "R", "andy biggs": "R", "joe lombardo": "R",
  "greg abbott": "R", "christine drazan": "R", "stacy garrity": "R", "victor marx": "R", "tommy tuberville": "R",
  "james talarico": "D", "troy jackson": "D", "roy cooper": "D", "josh turek": "D", "jon ossoff": "D",
  "sherrod brown": "D", "xavier becerra": "D", "amy acton": "D", "keisha lance bottoms": "D", "katie hobbs": "D",
  "rob sand": "D", "aaron ford": "D", "gina hinojosa": "D", "tina kotek": "D", "josh shapiro": "D",
  "phil weiser": "D", "doug jones": "D", "hannah pingree": "D", "deb haaland": "D", "cyndi munson": "D",
  "mike thompson": "D", "eric jones": "D", "doris matsui": "D", "mai vang": "D", "scott wiener": "D",
  "connie chan": "D", "lateefah simon": "D", "aisha wahab": "D", "luz rivas": "D", "jimmy gomez": "D",
  "angela gonzales torres": "D", "sydney kamlager dove": "D", "ken calvert": "R", "young kim": "R"
}));

export function politicsParty(label, ticker = "") {
  const text = String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(republican|gop|rep)\b/.test(text)) return "R";
  if (/\b(democratic|democrat|dfl|dem)\b/.test(text)) return "D";
  const tickerParty = String(ticker || "").trim().toUpperCase().match(/(?:^|-)(D|R)$/)?.[1];
  if (tickerParty) return tickerParty;
  if (candidateParties.has(text)) return candidateParties.get(text);
  const padded = ` ${text} `;
  for (const [candidate, party] of candidateParties) {
    if (padded.includes(` ${candidate} `)) return party;
  }
  return "N";
}

export function politicsMarketUrl(eventTicker, seriesTicker = "") {
  const ticker = String(eventTicker || "").trim().toUpperCase();
  const series = String(seriesTicker || seriesFromEventTicker(ticker)).trim().toUpperCase();
  if (series === "KXHOUSERACE" && /^KXHOUSERACE-[A-Z]{2}(?:\d{2}|AL)-\d{2}$/.test(ticker)) {
    return `https://kalshi.com/markets/kxhouserace/house-race-winner/${ticker.toLowerCase()}`;
  }
  if (series === "KXCAELECTION" && /^KXCAELECTION-26\d{2}$/.test(ticker)) {
    return `https://kalshi.com/markets/kxcaelection/california-general-elections-/${ticker.toLowerCase()}`;
  }
  if (series === "KXCA11PERSON" && ticker === "KXCA11PERSON-26") {
    return `https://kalshi.com/markets/kxca11person/ca11-house-winner-person/${ticker.toLowerCase()}`;
  }
  if ((/^KXSENATE[A-Z]{2}[DR]$/.test(series) || series === "KXSCRSENS" || series === "KXAKSENADVANCE") && ticker.startsWith(`${series}-`)) {
    return `https://kalshi.com/markets/${series.toLowerCase()}/${ticker.toLowerCase()}`;
  }
  const legacyHouse = series.match(/^HOUSE([A-Z]{2})(\d{1,2}|AL)$/);
  if (legacyHouse && new RegExp(`^${series}-\\d{2}$`).test(ticker)) {
    const slug = `house-${legacyHouse[1].toLowerCase()}${legacyHouse[2].toLowerCase()}`;
    return `https://kalshi.com/markets/${series.toLowerCase()}/${slug}/${ticker.toLowerCase()}`;
  }
  const legacyKxHouse = series.match(/^KXHOUSE([A-Z]{2})(\d{1,2}|AL)$/);
  if (legacyKxHouse && new RegExp(`^${series}-\\d{2}$`).test(ticker)) {
    const slug = `house-${legacyKxHouse[1].toLowerCase()}${legacyKxHouse[2].toLowerCase()}`;
    return `https://kalshi.com/markets/${series.toLowerCase()}/${slug}/${ticker.toLowerCase()}`;
  }
  return `https://kalshi.com/markets_by_ticker/${encodeURIComponent(ticker.toLowerCase())}`;
}

function seriesFromEventTicker(eventTicker) {
  return String(eventTicker || "").split("-")[0];
}

function stateFromTitle(title) {
  const normalized = String(title || "").trim();
  return Object.values(US_STATE_CAPITALS)
    .sort((left, right) => right.name.length - left.name.length)
    .find(state => new RegExp(`^${state.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (?:Senate|Governor) winner\\??$`, "i").test(normalized));
}

function ordinal(value) {
  const number = Number(value);
  const tens = number % 100;
  if (tens >= 11 && tens <= 13) return `${number}th`;
  return `${number}${number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th"}`;
}

function houseRaceFromSnapshot(snapshot) {
  const seriesTicker = String(snapshot?.seriesTicker || "").toUpperCase();
  const eventTicker = String(snapshot?.eventTicker || "").toUpperCase();
  const title = String(snapshot?.title || "").trim();
  const titleMatch = title.match(/\b([A-Z]{2})-(\d{1,2}|AL)\b/i);
  const standardTickerMatch = eventTicker.match(/^KXHOUSERACE-([A-Z]{2})(\d{2}|AL)(?:-|$)/);
  const legacySeriesMatch = seriesTicker.match(/^(?:KX)?HOUSE([A-Z]{2})(\d{1,2}|AL)$/);
  const legacyTickerMatch = eventTicker.match(/^(?:KX)?HOUSE([A-Z]{2})(\d{1,2}|AL)-\d{2}$/);
  const isStandardHouseRace = seriesTicker === "KXHOUSERACE" && Boolean(standardTickerMatch || titleMatch);
  const isLegacyHouseRace = Boolean(legacySeriesMatch && legacyTickerMatch && eventTicker.startsWith(`${seriesTicker}-`));
  const isExplicitHouseWinner = Boolean(
    /^\s*[A-Z]{2}-(?:\d{1,2}|AL) House winner\?\s*$/i.test(title)
    && /-26(?:\d{2})?(?:-|$)/.test(eventTicker)
  );
  if (!isStandardHouseRace && !isLegacyHouseRace && !isExplicitHouseWinner) return null;
  const tickerMatch = standardTickerMatch || legacyTickerMatch || legacySeriesMatch;
  const stateCode = String(titleMatch?.[1] || tickerMatch?.[1] || "").toUpperCase();
  const rawDistrict = String(titleMatch?.[2] || tickerMatch?.[2] || "").toUpperCase();
  const district = rawDistrict === "AL" ? "AL" : rawDistrict.padStart(2, "0");
  const state = stateByCode.get(stateCode);
  const point = HOUSE_DISTRICT_CENTROIDS.get(`${stateCode}-${district}`);
  if (!state || !point) return null;
  const districtLabel = district === "AL" ? "At-Large District" : `${ordinal(Number(district))} District`;
  return {
    jurisdictionId: `us-house-${stateCode.toLowerCase()}-${district.toLowerCase()}-2026`,
    geography: "US",
    jurisdiction: `${state.name} ${districtLabel}`,
    code: `${stateCode}${district === "AL" ? "AL" : Number(district)}`,
    capital: `${stateCode}-${district} congressional district`,
    lon: point.lon,
    lat: point.lat,
    dateKey: US_ELECTION_DATE,
    dateLabel: "November 3, 2026",
    confidence: "Census district point",
    scope: "Congressional district",
    office: "Congress",
    importance: 70,
    minZoomScale: HOUSE_RACE_MIN_SCALE
  };
}

function senatePrimaryFromSnapshot(snapshot) {
  const eventTicker = String(snapshot?.eventTicker || "").toUpperCase();
  const title = String(snapshot?.title || "").trim();
  if (!/-26(?:-|$|[A-Z0-9])/.test(eventTicker)) return null;
  const state = Object.values(US_STATE_CAPITALS)
    .sort((left, right) => right.name.length - left.name.length)
    .find(item => title.toLowerCase().startsWith(`${item.name.toLowerCase()} `));
  if (!state) return null;
  const escapedState = state.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nominee = new RegExp(`^${escapedState} (Democratic|Republican) Senate nominee\\?$`, "i").test(title);
  const specialPrimary = new RegExp(`^${escapedState} (Democratic|Republican) Senate special primary winner\\?$`, "i").test(title);
  const advances = new RegExp(`^${escapedState} Senate: who will advance\\?$`, "i").test(title);
  if (!nominee && !specialPrimary && !advances) return null;
  return {
    jurisdictionId: `us-${state.code.toLowerCase()}-2026`, geography: "US", jurisdiction: state.name, code: state.code,
    capital: state.capital, lon: state.lon, lat: state.lat, dateKey: US_ELECTION_DATE, dateLabel: "November 3, 2026",
    confidence: "Live primary market", scope: "Statewide", office: "Senate", stage: "primary", importance: 89
  };
}

function classifyStandardPoliticsEvent(snapshot) {
  const seriesTicker = String(snapshot?.seriesTicker || "").toUpperCase();
  const eventTicker = String(snapshot?.eventTicker || "").toUpperCase();
  const title = String(snapshot?.title || "").trim();
  const subtitle = String(snapshot?.subtitle || "");
  const combined = `${title} ${subtitle}`;

  const national = NATIONAL_SERIES[seriesTicker];
  if (national) {
    if (/203[0-9]/.test(`${eventTicker} ${combined}`)) return null;
    const is2028 = national.cycle === "2028" || /(?:^|-)28(?:$|-)/.test(eventTicker) || /2028/.test(combined);
    return {
      jurisdictionId: is2028 ? "us-national-2028" : "us-national-2026", geography: "US", jurisdiction: "United States", code: "US",
      capital: "Washington, D.C.", lon: -77.0369, lat: 38.9072, dateKey: is2028 ? "2028-11-07" : US_ELECTION_DATE,
      dateLabel: is2028 ? "November 7, 2028" : "November 3, 2026", confidence: "Official date", scope: "National",
      office: national.office, importance: national.importance
    };
  }

  const houseRace = houseRaceFromSnapshot(snapshot);
  if (houseRace) return houseRace;

  const senatePrimary = senatePrimaryFromSnapshot(snapshot);
  if (senatePrimary) return senatePrimary;

  const disallowed = /\b(primary|margin|turnout|closest|advance|run for|nominee|nomination|special election date)\b/i;
  const state = stateFromTitle(title);
  if (state && !disallowed.test(combined) && (/(?:^|-)26(?:$|-)/.test(eventTicker) || /2026/.test(combined))) {
    const office = /senate/i.test(title) ? "Senate" : "Governor";
    return {
      jurisdictionId: `us-${state.code.toLowerCase()}-2026`, geography: "US", jurisdiction: state.name, code: state.code,
      capital: state.capital, lon: state.lon, lat: state.lat, dateKey: US_ELECTION_DATE, dateLabel: "November 3, 2026",
      confidence: "Official date", scope: "Statewide", office, importance: office === "Senate" ? 90 : 82
    };
  }

  const global = GLOBAL_SERIES[seriesTicker];
  if (global) {
    const [jurisdiction, code, capital, lon, lat, dateKey, dateLabel, office, importance] = global;
    return {
      jurisdictionId: `${code.toLowerCase()}-${dateKey}`, geography: "Global", jurisdiction, code, capital, lon, lat,
      dateKey, dateLabel, confidence: /pending|next|2027 election|2026 election|2029/.test(dateLabel) ? "Election window" : "Official date",
      scope: "National", office, importance
    };
  }

  const isInternational = snapshot?.isInternationalPolitics === true
    || (snapshot?.politicsTags || []).some(tag => String(tag).toLowerCase() === "international");
  if (!isInternational) return null;
  const location = resolvePoliticalLocation(`${title} ${subtitle} ${snapshot?.seriesTitle || ""}`);
  if (!location) return null;
  return {
    jurisdictionId: `intl-${location.code.toLowerCase()}`, geography: "Global", ...location,
    dateKey: "international", dateLabel: "Open international markets", confidence: "Title-matched location",
    scope: "Geopolitical", office: "International", importance: 72
  };
}

export function classifyPoliticsLocations(snapshot) {
  const seriesTicker = String(snapshot?.seriesTicker || "").toUpperCase();
  const manual = seriesTicker === "KXLEADERSOUT"
    ? likelyLeaderLocations(snapshot)
    : MANUAL_SERIES_LOCATIONS[seriesTicker];
  if (manual?.length) return manual.map(manualPoliticsClassification);
  const standard = classifyStandardPoliticsEvent(snapshot);
  return standard ? [standard] : [];
}

export function classifyPoliticsEvent(snapshot) {
  return classifyPoliticsLocations(snapshot)[0] || null;
}

export function politicsTimeline(bundles) {
  const periods = new Map();
  for (const bundle of bundles) {
    if (!periods.has(bundle.dateKey)) periods.set(bundle.dateKey, {
      id: bundle.dateKey,
      eyebrow: bundle.dateKey === "international" ? "Global politics" : bundle.scope === "National" ? bundle.jurisdiction : "United States",
      label: bundle.dateLabel,
      short: bundle.dateKey === "international" ? "Intl" : bundle.code === "US" ? `US ${bundle.dateKey.slice(2, 4)}` : bundle.code
    });
  }
  const dated = [...periods.values()].filter(period => /^\d{4}-\d{2}-\d{2}$/.test(period.id)).sort((a, b) => a.id.localeCompare(b.id));
  const windows = [...periods.values()].filter(period => !/^\d{4}-\d{2}-\d{2}$/.test(period.id)).sort((a, b) => a.label.localeCompare(b.label));
  return [{ id: "upcoming", eyebrow: "Market horizon", label: "All upcoming", short: "Upcoming" }, ...dated, ...windows];
}
