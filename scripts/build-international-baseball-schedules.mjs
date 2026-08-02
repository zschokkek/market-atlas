import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDirectory = path.join(repository, "data");
const outputPath = path.join(dataDirectory, "international-baseball-schedules-2026.json");
const venueCachePath = path.join(dataDirectory, "international-baseball-venue-cache.json");
const USER_AGENT = "sports-globe-schedule-builder/1.0";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const npbTeams = {
  "巨人": "Yomiuri Giants", "DeNA": "Yokohama DeNA BayStars", "ヤクルト": "Tokyo Yakult Swallows",
  "阪神": "Hanshin Tigers", "広島": "Hiroshima Toyo Carp", "中日": "Chunichi Dragons",
  "ソフトバンク": "Fukuoka SoftBank Hawks", "日本ハム": "Hokkaido Nippon-Ham Fighters",
  "オリックス": "Orix Buffaloes", "楽天": "Tohoku Rakuten Golden Eagles", "西武": "Saitama Seibu Lions",
  "ロッテ": "Chiba Lotte Marines"
};
const kboTeams = {
  "LG": "LG Twins", "두산": "Doosan Bears", "삼성": "Samsung Lions", "롯데": "Lotte Giants",
  "한화": "Hanwha Eagles", "KT": "KT Wiz", "KIA": "KIA Tigers", "SSG": "SSG Landers",
  "키움": "Kiwoom Heroes", "NC": "NC Dinos"
};
const npbKalshiCodes = {
  "Yomiuri Giants": "YOM", "Yokohama DeNA BayStars": "YOK", "Tokyo Yakult Swallows": "YAK",
  "Hanshin Tigers": "HAN", "Hiroshima Toyo Carp": "HIR", "Chunichi Dragons": "CHU",
  "Fukuoka SoftBank Hawks": "FUK", "Hokkaido Nippon-Ham Fighters": "HOK", "Orix Buffaloes": "ORI",
  "Tohoku Rakuten Golden Eagles": "TOH", "Saitama Seibu Lions": "SAI", "Chiba Lotte Marines": "CHI"
};
const kboKalshiCodes = {
  "LG Twins": "LG", "Doosan Bears": "DOO", "Samsung Lions": "SAM", "Lotte Giants": "LOT",
  "Hanwha Eagles": "HAN", "KT Wiz": "KTW", "KIA Tigers": "KIA", "SSG Landers": "SSG",
  "Kiwoom Heroes": "KIW", "NC Dinos": "NCD"
};
const lmbKalshiCodes = {
  "Acereros del Norte": "ADM", "Algodoneros Union Laguna": "ALG", "Bravos de Leon": "BLE",
  "Caliente de Durango": "CAL", "Charros de Jalisco": "CDJ", "Conspiradores de Queretaro": "CON",
  "Diablos Rojos del Mexico": "DIA", "Dorados de Chihuahua": "DOR", "El Aguila de Veracruz": "AGU",
  "Guerreros de Oaxaca": "GUE", "Leones de Yucatan": "LDY", "Olmecas de Tabasco": "ODT",
  "Pericos de Puebla": "PDP", "Piratas de Campeche": "PDC", "Rieleros de Aguascalientes": "RDA",
  "Saraperos de Saltillo": "SDS", "Sultanes de Monterrey": "SDM", "Tecos de los Dos Laredos": "TEL",
  "Tigres de Quintana Roo": "TDQ", "Toros de Tijuana": "TDT"
};
const kalshiTickerParts = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "2-digit", month: "short", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23"
});

const npbVenues = {
  "東京ドーム": ["Tokyo Dome", "Tokyo, Japan", 35.7056, 139.7519],
  "神 宮": ["Meiji Jingu Stadium", "Tokyo, Japan", 35.6745, 139.7170],
  "マツダスタジアム": ["Mazda Zoom-Zoom Stadium", "Hiroshima, Japan", 34.3929, 132.4840],
  "ベルーナドーム": ["Belluna Dome", "Tokorozawa, Japan", 35.7686, 139.4205],
  "ZOZOマリン": ["ZOZO Marine Stadium", "Chiba, Japan", 35.6450, 140.0307],
  "みずほPayPay": ["Mizuho PayPay Dome Fukuoka", "Fukuoka, Japan", 33.5953, 130.3620],
  "エスコンＦ": ["ES CON Field Hokkaido", "Kitahiroshima, Japan", 42.9904, 141.5490],
  "バンテリンドーム": ["Vantelin Dome Nagoya", "Nagoya, Japan", 35.1859, 136.9470],
  "京セラD大阪": ["Kyocera Dome Osaka", "Osaka, Japan", 34.6694, 135.4760],
  "楽天モバイル": ["Rakuten Mobile Park Miyagi", "Sendai, Japan", 38.2563, 140.9020],
  "横 浜": ["Yokohama Stadium", "Yokohama, Japan", 35.4433, 139.6400],
  "甲子園": ["Hanshin Koshien Stadium", "Nishinomiya, Japan", 34.7214, 135.3616],
  "ほっと神戸": ["Hotto Motto Field Kobe", "Kobe, Japan", 34.6813, 135.0739],
  "盛 岡": ["Kitagin Ballpark", "Morioka, Japan", 39.6561, 141.1447],
  "秋 田": ["Komachi Stadium", "Akita, Japan", 39.7173, 140.0664]
};
const kboVenues = {
  "잠실": ["Jamsil Baseball Stadium", "Seoul, South Korea", 37.5123, 127.0719],
  "고척": ["Gocheok Sky Dome", "Seoul, South Korea", 37.4982, 126.8673],
  "문학": ["Incheon SSG Landers Field", "Incheon, South Korea", 37.4370, 126.6933],
  "수원": ["Suwon KT Wiz Park", "Suwon, South Korea", 37.2996, 127.0100],
  "대전": ["Daejeon Hanwha Life Ballpark", "Daejeon, South Korea", 36.3170, 127.4290],
  "대구": ["Daegu Samsung Lions Park", "Daegu, South Korea", 35.8411, 128.6810],
  "사직": ["Sajik Baseball Stadium", "Busan, South Korea", 35.1940, 129.0610],
  "창원": ["Changwon NC Park", "Changwon, South Korea", 35.2225, 128.5824],
  "광주": ["Gwangju-KIA Champions Field", "Gwangju, South Korea", 35.1681, 126.8891],
  "포항": ["Pohang Baseball Stadium", "Pohang, South Korea", 36.0086, 129.3596]
};
const lmbVenues = {
  2701: ["Walmart Park", "Monterrey, Mexico", 25.7183, -100.3154],
  2869: ["Estadio Hermanos Serdán", "Puebla, Mexico", 19.0773, -98.1647],
  2929: ["Estadio Alberto Romo Chávez", "Aguascalientes, Mexico", 21.8978, -102.2848],
  2949: ["Estadio Cruz Azul Nelson Barrera", "Campeche, Mexico", 19.8448, -90.5375],
  2950: ["Estadio Kickapoo Lucky Eagle", "Monclova, Mexico", 26.9064, -101.4248],
  2951: ["Estadio Yu'Va", "Oaxaca, Mexico", 17.0828, -96.7222],
  2953: ["Parque Francisco I. Madero", "Saltillo, Mexico", 25.4380, -101.0060],
  2955: ["Parque Centenario 27 de Febrero", "Villahermosa, Mexico", 17.9961, -92.9475],
  2956: ["Estadio de la Revolución", "Torreón, Mexico", 25.5428, -103.4020],
  2957: ["Toros Mobil Park", "Tijuana, Mexico", 32.5065, -116.9934],
  2958: ["Estadio Beto Ávila", "Veracruz, Mexico", 19.1778, -96.1233],
  2959: ["Parque de Béisbol Kukulcán", "Mérida, Mexico", 20.9388, -89.6180],
  3210: ["Estadio Chihuahua", "Chihuahua, Mexico", 28.6697, -106.0880],
  3410: ["Parque La Junta", "Nuevo Laredo, Mexico", 27.4909, -99.5106],
  3929: ["Estadio Beto Ávila Sherwin-Williams", "Cancún, Mexico", 21.1522, -86.8380],
  4710: ["Estadio Panamericano", "Zapopan, Mexico", 20.7195, -103.3800],
  5320: ["Estadio Domingo Santana", "León, Mexico", 21.0975, -101.6410],
  5321: ["Estadio Francisco Villa", "Durango, Mexico", 24.0307, -104.6530],
  5330: ["Uni-Trade Stadium", "Laredo, TX", 27.5041, -99.4487],
  5340: ["Estadio Alfredo Harp Helú", "Mexico City, Mexico", 19.4040, -99.0858],
  6070: ["Estadio Conspiradores", "Huimilpan, Mexico", 20.4544, -100.2670]
};

function cleanHtml(value = "") {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function timeLabel(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${monthNames[month - 1]} ${day} · ${hour % 12 || 12}:${minute} ${meridiem} local`;
}

function utcFromAsia(date, time) {
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

function kalshiGameTicker(series, utc, awayCode, homeCode) {
  const parts = Object.fromEntries(kalshiTickerParts.formatToParts(new Date(utc)).map(part => [part.type, part.value]));
  return `${series}-${parts.year}${parts.month.toUpperCase()}${parts.day}${parts.hour}${parts.minute}${awayCode}${homeCode}`;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "user-agent": USER_AGENT, ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function fetchJson(url, options = {}) {
  return JSON.parse((await fetchText(url, options)).replace(/^\uFEFF/, ""));
}

async function buildLmb() {
  const schedule = await fetchJson("https://statsapi.mlb.com/api/v1/schedule?sportId=23&leagueId=125&season=2026&hydrate=team,venue");
  const venueCache = Object.fromEntries(Object.entries(lmbVenues).map(([venueId, venue]) => [venueId, {
    venue: venue[0], city: venue[1], lat: venue[2], lon: venue[3]
  }]));
  fs.writeFileSync(venueCachePath, `${JSON.stringify(venueCache, null, 2)}\n`);

  const events = [];
  const seen = new Set();
  for (const date of schedule.dates || []) for (const game of date.games || []) {
    if (seen.has(game.gamePk)) continue;
    const location = venueCache[game.venue.id];
    if (!location) continue;
    const gameDate = new Date(game.gameDate);
    const localTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false
    }).format(gameDate);
    const home = game.teams.home.team.name;
    const away = game.teams.away.team.name;
    const homeKalshi = lmbKalshiCodes[home];
    const awayKalshi = lmbKalshiCodes[away];
    events.push({
      id: String(game.gamePk), date: game.officialDate, utc: game.gameDate,
      dates: timeLabel(game.officialDate, localTime === "24:00" ? "00:00" : localTime),
      home, away,
      ...(homeKalshi && awayKalshi ? {
        eventTicker: kalshiGameTicker("KXLMBGAME", game.gameDate, awayKalshi, homeKalshi),
        homeKalshi, awayKalshi
      } : {}),
      venue: location.venue, city: location.city, lat: location.lat, lon: location.lon
    });
    seen.add(game.gamePk);
  }
  return events.sort((left, right) => left.utc.localeCompare(right.utc));
}

async function buildNpb() {
  const events = [];
  for (const month of ["03", "04", "05", "06", "07", "08", "09", "10", "11"]) {
    const html = await fetchText(`https://npb.jp/games/2026/schedule_${month}_detail.html`);
    for (const rowMatch of html.matchAll(/<tr id="date(\d{4})"[^>]*>([\s\S]*?)<\/tr>/g)) {
      const [, monthDay, row] = rowMatch;
      const homeCode = cleanHtml(row.match(/<div class="team1">([\s\S]*?)<\/div>/)?.[1]);
      const awayCode = cleanHtml(row.match(/<div class="team2">([\s\S]*?)<\/div>/)?.[1]);
      const venueCode = cleanHtml(row.match(/<div class="place">([\s\S]*?)<\/div>/)?.[1]);
      const time = cleanHtml(row.match(/<div class="time">([\s\S]*?)<\/div>/)?.[1]);
      const venue = npbVenues[venueCode];
      if (!npbTeams[awayCode] || !npbTeams[homeCode] || !venue || !/^\d{1,2}:\d{2}$/.test(time)) continue;
      const date = `2026-${monthDay.slice(0, 2)}-${monthDay.slice(2)}`;
      const utc = utcFromAsia(date, time);
      const home = npbTeams[homeCode];
      const away = npbTeams[awayCode];
      events.push({
        id: `${date}-${awayCode}-${homeCode}`, date, utc, dates: timeLabel(date, time), home, away,
        eventTicker: kalshiGameTicker("KXNPBGAME", utc, npbKalshiCodes[away], npbKalshiCodes[home]),
        homeKalshi: npbKalshiCodes[home], awayKalshi: npbKalshiCodes[away],
        venue: venue[0], city: venue[1], lat: venue[2], lon: venue[3]
      });
    }
  }
  return events.sort((left, right) => left.utc.localeCompare(right.utc));
}

async function buildKbo() {
  const events = [];
  for (const month of ["03", "04", "05", "06", "07", "08", "09", "10"]) {
    const body = new URLSearchParams({ leId: "1", srIdList: "0,9", seasonId: "2026", gameMonth: month, teamId: "" });
    const payload = await fetchJson("https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer: `https://www.koreabaseball.com/Schedule/Schedule.aspx?seriesId=0%2C9&year=2026&month=${month}`
      },
      body
    });
    let activeDate = "";
    for (const entry of payload.rows || []) {
      const cells = entry.row || [];
      const dateCell = cells.find(cell => cell.Class === "day");
      if (dateCell) activeDate = `2026-${cleanHtml(dateCell.Text).slice(0, 5).replace(".", "-")}`;
      const time = cleanHtml(cells.find(cell => cell.Class === "time")?.Text);
      const playIndex = cells.findIndex(cell => cell.Class === "play");
      if (!activeDate || playIndex < 0 || !/^\d{1,2}:\d{2}$/.test(time)) continue;
      const teams = [...cells[playIndex].Text.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)]
        .map(match => cleanHtml(match[1]))
        .filter(value => kboTeams[value]);
      const venueCode = cleanHtml(cells[playIndex + 5]?.Text);
      const venue = kboVenues[venueCode];
      if (teams.length !== 2 || !venue) continue;
      const [awayCode, homeCode] = teams;
      const utc = utcFromAsia(activeDate, time);
      const home = kboTeams[homeCode];
      const away = kboTeams[awayCode];
      events.push({
        id: `${activeDate}-${awayCode}-${homeCode}`, date: activeDate, utc, dates: timeLabel(activeDate, time), home, away,
        eventTicker: kalshiGameTicker("KXKBOGAME", utc, kboKalshiCodes[away], kboKalshiCodes[home]),
        homeKalshi: kboKalshiCodes[home], awayKalshi: kboKalshiCodes[away],
        venue: venue[0], city: venue[1], lat: venue[2], lon: venue[3]
      });
    }
  }
  return events.sort((left, right) => left.utc.localeCompare(right.utc));
}

fs.mkdirSync(dataDirectory, { recursive: true });
const schedules = {
  LMB: { label: "Liga Mexicana de Beisbol", series: "KXLMBGAME", source: "MLB Stats API", events: await buildLmb() },
  KBO: { label: "KBO League", series: "KXKBOGAME", source: "KBO official schedule", events: await buildKbo() },
  NPB: { label: "Nippon Professional Baseball", series: "KXNPBGAME", source: "NPB.jp official schedule", events: await buildNpb() }
};
fs.writeFileSync(outputPath, `${JSON.stringify(schedules)}\n`);
for (const [code, league] of Object.entries(schedules)) console.log(`${code}: ${league.events.length} games`);
console.log(outputPath);
