export const MISSING_MARKET_ERROR_CODE = "MISSING_NEAR_TERM_KALSHI_MARKETS";

export function addIsoDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function assertNearTermMarketCoverage(events, {
  today,
  tomorrow = addIsoDays(today, 1),
  resolveMarket,
  isElapsed = () => false
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today || "")) throw new TypeError("A valid ISO date is required for market coverage validation.");
  if (typeof resolveMarket !== "function") throw new TypeError("A market resolver is required for market coverage validation.");

  const checked = [];
  const missing = [];
  const seen = new Set();
  for (const event of events || []) {
    if (!event?.id || seen.has(event.id)) continue;
    seen.add(event.id);
    const start = String(event.start || "");
    const end = String(event.end || start);
    if (!start || start > tomorrow || end < today || isElapsed(event)) continue;
    checked.push(event);
    if (!resolveMarket(event)) missing.push(event);
  }

  if (missing.length) {
    const labels = missing.map(event => `${event.sport || "SPORT"}: ${event.name || event.id}`);
    const error = new Error(`Missing listed Kalshi markets for ${missing.length} near-term ${missing.length === 1 ? "event" : "events"}: ${labels.join("; ")}`);
    error.name = "MarketCoverageError";
    error.code = MISSING_MARKET_ERROR_CODE;
    error.missingEvents = missing.map(event => ({
      id: event.id,
      sport: event.sport || null,
      name: event.name || event.id,
      start: event.start || null,
      end: event.end || event.start || null,
      expectedEventTicker: event.expectedEventTicker || event.eventTicker || null
    }));
    throw error;
  }

  return { checkedEventCount: checked.length, missingEventCount: 0 };
}
