import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMlbFuturesSnapshot,
  mlbFuturesSeries,
  normalizeEvent,
  validateTeamFuturesRecord
} from "../src/worker.js";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repository, "data/mlb-team-futures-cache.json");
const API_ORIGIN = "https://external-api.kalshi.com/trade-api/v2";
const now = Date.now();
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function fetchSeries(seriesTicker) {
  const grouped = new Map();
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200", status: "open", series_ticker: seriesTicker });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`${API_ORIGIN}/markets?${query}`, {
      headers: { accept: "application/json", "user-agent": "sports-globe-futures-cache/2.0" }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${seriesTicker}`);
    const payload = await response.json();
    for (const market of payload.markets || []) {
      if (!market.event_ticker) continue;
      const markets = grouped.get(market.event_ticker) || [];
      markets.push(market);
      grouped.set(market.event_ticker, markets);
    }
    cursor = payload.cursor || "";
    if (cursor) await wait(550);
  } while (cursor);
  return [...grouped.entries()].map(([eventTicker, markets]) =>
    normalizeEvent({ ticker: eventTicker, series_ticker: seriesTicker }, markets, now));
}

const discovered = [];
for (const seriesTicker of mlbFuturesSeries()) {
  discovered.push(await fetchSeries(seriesTicker));
  await wait(550);
}

const snapshot = buildMlbFuturesSnapshot(discovered, now);
for (const record of Object.values(snapshot.teams)) {
  if (!validateTeamFuturesRecord(record)) throw new Error(`Invalid team futures record for ${record.teamCode}`);
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Cached ${snapshot.teamCount} team records at ${snapshot.generatedAt}`);
console.log(outputPath);
