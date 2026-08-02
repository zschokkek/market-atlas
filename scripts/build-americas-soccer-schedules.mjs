import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scheduleDirectory = path.join(repository, "data");
const outputPath = path.join(scheduleDirectory, "americas-soccer-schedules-2026.json");
const venueCachePath = path.join(scheduleDirectory, "americas-soccer-venue-cache.json");
const ESPN_ORIGIN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const PHOTON_ORIGIN = "https://photon.komoot.io/api/";

const leagues = {
  BRASILEIRAO: {
    label: "Brasileirão Série A",
    espn: "bra.1",
    series: "KXBRASILEIROGAME",
    timeZone: "America/Sao_Paulo"
  },
  LIGAMX: {
    label: "Liga MX",
    espn: "mex.1",
    series: "KXLIGAMXGAME",
    timeZone: "America/Mexico_City"
  },
  ARGPRIMERA: {
    label: "Argentine Primera",
    espn: "arg.1",
    series: "KXARGPREMDIVGAME",
    timeZone: "America/Argentina/Buenos_Aires"
  }
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const venueOverrides = {
  "Arena da Baixada|Curitiba|Brazil": [-25.448346, -49.276877],
  "Estádio Cícero Pompeu de Toledo|Sao Paulo|Brazil": [-23.600102, -46.720126],
  "Alberto José Armando (La Bombonera)|Buenos Aires|Argentina": [-34.635517, -58.364916],
  "El Gigante de Alberdi|Córdoba|Argentina": [-31.403544, -64.206289],
  "Guillermo Laza|Buenos Aires|Argentina": [-34.653344, -58.443511]
};

function localParts(iso, timeZone) {
  const date = new Date(iso);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).formatToParts(date).map(part => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    label: `${monthNames[Number(parts.month) - 1]} ${Number(parts.day)} · ${parts.hour}:${parts.minute} ${parts.dayPeriod} local`
  };
}

function eventCompetitor(event, homeAway) {
  return event.competitions?.[0]?.competitors?.find(competitor => competitor.homeAway === homeAway);
}

function venueKey(venue) {
  return [venue.fullName, venue.address?.city, venue.address?.country].filter(Boolean).join("|");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "market-atlas-schedule-builder/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function geocodeVenue(venue) {
  const query = [venue.fullName, venue.address?.city, venue.address?.country].filter(Boolean).join(", ");
  const url = new URL(PHOTON_ORIGIN);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "1");
  const payload = await fetchJson(url);
  const coordinates = payload.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) throw new Error(`No coordinates found for ${query}`);
  return [Number(coordinates[1].toFixed(6)), Number(coordinates[0].toFixed(6))];
}

fs.mkdirSync(scheduleDirectory, { recursive: true });
const venueCache = fs.existsSync(venueCachePath) ? JSON.parse(fs.readFileSync(venueCachePath, "utf8")) : {};
const sourceByLeague = {};

for (const [code, league] of Object.entries(leagues)) {
  const url = `${ESPN_ORIGIN}/${league.espn}/scoreboard?dates=20260101-20261231&limit=1000`;
  const payload = await fetchJson(url);
  sourceByLeague[code] = payload.events || [];
}

const fallbackVenueByHomeTeam = new Map();
for (const events of Object.values(sourceByLeague)) {
  for (const event of events) {
    const home = eventCompetitor(event, "home");
    const venue = event.competitions?.[0]?.venue;
    if (!home?.team?.id || !venue?.fullName) continue;
    const key = home.team.id;
    const venues = fallbackVenueByHomeTeam.get(key) || new Map();
    venues.set(venueKey(venue), { venue, count: (venues.get(venueKey(venue))?.count || 0) + 1 });
    fallbackVenueByHomeTeam.set(key, venues);
  }
}

const requiredVenues = new Map();
for (const events of Object.values(sourceByLeague)) {
  for (const event of events) {
    const home = eventCompetitor(event, "home");
    let venue = event.competitions?.[0]?.venue;
    if (!venue?.fullName && home?.team?.id) {
      venue = [...(fallbackVenueByHomeTeam.get(home.team.id)?.values() || [])]
        .sort((left, right) => right.count - left.count)[0]?.venue;
    }
    if (venue?.fullName) requiredVenues.set(venueKey(venue), venue);
  }
}

let geocoded = 0;
for (const [key, venue] of requiredVenues) {
  if (venueOverrides[key]) {
    venueCache[key] = venueOverrides[key];
    continue;
  }
  if (venueCache[key]) continue;
  venueCache[key] = await geocodeVenue(venue);
  geocoded += 1;
  if (geocoded % 10 === 0) console.log(`Geocoded ${geocoded} venues…`);
  await sleep(180);
}
fs.writeFileSync(venueCachePath, `${JSON.stringify(venueCache, null, 2)}\n`);

const schedules = {};
for (const [code, league] of Object.entries(leagues)) {
  const seen = new Set();
  const events = [];
  for (const sourceEvent of sourceByLeague[code]) {
    if (seen.has(sourceEvent.id)) continue;
    const home = eventCompetitor(sourceEvent, "home");
    const away = eventCompetitor(sourceEvent, "away");
    if (!home?.team || !away?.team || !sourceEvent.date) continue;
    let venue = sourceEvent.competitions?.[0]?.venue;
    if (!venue?.fullName) {
      venue = [...(fallbackVenueByHomeTeam.get(home.team.id)?.values() || [])]
        .sort((left, right) => right.count - left.count)[0]?.venue;
    }
    if (!venue?.fullName) continue;
    const coordinates = venueCache[venueKey(venue)];
    if (!coordinates) continue;
    const local = localParts(sourceEvent.date, league.timeZone);
    events.push({
      id: sourceEvent.id,
      date: local.date,
      utc: sourceEvent.date,
      dates: local.label,
      home: home.team.displayName,
      away: away.team.displayName,
      venue: venue.fullName,
      city: [venue.address?.city, venue.address?.country].filter(Boolean).join(", "),
      lat: coordinates[0],
      lon: coordinates[1]
    });
    seen.add(sourceEvent.id);
  }
  events.sort((left, right) => left.utc.localeCompare(right.utc) || left.id.localeCompare(right.id));
  schedules[code] = {
    label: league.label,
    series: league.series,
    source: `ESPN ${league.espn}`,
    events
  };
}

fs.writeFileSync(outputPath, `${JSON.stringify(schedules)}\n`);
for (const [code, league] of Object.entries(schedules)) console.log(`${code}: ${league.events.length} events`);
console.log(outputPath);
