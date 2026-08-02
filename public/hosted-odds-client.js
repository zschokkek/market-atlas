const POLL_INTERVAL_MS = 30_000;
let lastDate = "";
let timer = null;
let controller = null;
let futuresController = null;
const futuresCache = new Map();

function bridge() {
  return Object.values(window.__sportsGlobeOddsBridges || {})[0] || null;
}

function validTeamPayload(sport, teamCode, payload) {
  if (![2, 3].includes(payload?.schemaVersion) || payload?.sport !== sport || payload?.teamCode !== teamCode) return false;
  const cards = Array.isArray(payload.cards) ? payload.cards : Object.values(payload.futures || {});
  return cards.every(card => !card || (card.teamCode === teamCode && card.sport === sport));
}

async function refresh() {
  const oddsBridge = bridge();
  if (!oddsBridge) return;
  const date = oddsBridge.getActiveDate();
  controller?.abort();
  controller = new AbortController();
  try {
    const response = await fetch(`/api/odds?date=${encodeURIComponent(date)}`, {
      headers: { accept: "application/json" }, signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const warming = response.status === 503 && payload.warming;
      oddsBridge.apply({ events: [], oddsStatus: warming ? "warming" : "unavailable", cache: payload.cache || null });
      return warming ? "warming" : "unavailable";
    }
    const status = payload.cache?.updating ? "warming" : "ready";
    oddsBridge.apply({ ...payload, oddsStatus: status });
    lastDate = date;
    return status;
  } catch (error) {
    if (error.name !== "AbortError") {
      oddsBridge.apply({ events: [], oddsStatus: "unavailable" });
      console.warn("Cached odds refresh failed", error);
    }
    return error.name === "AbortError" ? "aborted" : "unavailable";
  }
}

function schedule(delay = POLL_INTERVAL_MS) {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const status = await refresh();
    schedule(status === "warming" ? 2000 : POLL_INTERVAL_MS);
  }, delay);
}

document.addEventListener("sports-globe:date", event => {
  if (event.detail?.date === lastDate) return;
  refresh();
});

document.addEventListener("sports-globe:team", async event => {
  const sport = String(event.detail?.sport || "").toUpperCase();
  const teamCode = String(event.detail?.teamCode || "").toUpperCase();
  const teamName = String(event.detail?.teamName || "");
  const eventTicker = String(event.detail?.eventTicker || "").toUpperCase();
  const oddsBridge = bridge();
  if (!sport || !teamCode || !oddsBridge?.applyTeamFutures) return;
  const cacheKey = `${sport}:${teamCode}:${eventTicker}`;
  const cached = futuresCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 60 * 1000) {
    oddsBridge.applyTeamFutures(sport, teamCode, cached.payload);
    return;
  }
  futuresController?.abort();
  futuresController = new AbortController();
  try {
    const query = new URLSearchParams({ sport, team: teamCode, name: teamName, event: eventTicker });
    let response;
    let payload = {};
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(`/api/team-markets?${query}`, {
        headers: { accept: "application/json" },
        signal: futuresController.signal
      });
      payload = await response.json().catch(() => ({}));
      if (response.status !== 503 || !/cache is warming/i.test(payload.error || "") || attempt === 3) break;
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    if (response.status === 404 && sport === "MLB") {
      response = await fetch(`/api/mlb-team-markets?team=${encodeURIComponent(teamCode)}&event=${encodeURIComponent(eventTicker)}`, {
        headers: { accept: "application/json" },
        signal: futuresController.signal
      });
      payload = await response.json().catch(() => ({}));
    }
    if (!response.ok && !validTeamPayload(sport, teamCode, payload)) {
      throw new Error(payload.error || "Team markets are temporarily unavailable.");
    }
    if (!validTeamPayload(sport, teamCode, payload)) throw new Error("The cached markets did not match the selected team.");
    futuresCache.set(cacheKey, { payload, fetchedAt: Date.now() });
    oddsBridge.applyTeamFutures(sport, teamCode, payload);
  } catch (error) {
    if (error.name !== "AbortError") oddsBridge.applyTeamFutures(sport, teamCode, { error: error.message });
  }
});

refresh();
schedule();
