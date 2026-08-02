# Market Atlas

Market Atlas is an interactive geographic view of Kalshi sports, politics, and weather markets. The canonical app is served at `/`; standalone category maps live under `public/categories/` and shared browser code lives under `public/assets/`.

The hosted app uses a single server-side Kalshi poller. Browsers never call Kalshi directly; they read compact snapshots from cached API routes backed by edge cache and Cloudflare KV.

## Polling policy

| Event state | Upstream refresh |
| --- | ---: |
| More than 24 hours away | 60 minutes |
| Within 24 hours | 15 minutes |
| Within 2 hours of scheduled start | 5 minutes |
| Scheduled start through Kalshi's expiration time | 1 minute |

Every hour the worker pages through `GET /events` for each sports series with `status=open&with_nested_markets=true`. It stores Kalshi's event ticker and nested outcome markets directly rather than rebuilding events from a generic market list. Known events are then refreshed with `GET /events/{event_ticker}?with_nested_markets=true`, so one request updates all outcomes for a matchup.

The live window uses Kalshi's `occurrence_datetime` and expiration fields, which keeps multi-day golf, tennis, and cricket events fresh. A five-hour window is used only when Kalshi has not supplied an end timestamp.

Without credentials, the upstream gate is two requests per second: a conservative 20-token allowance divided by Kalshi's common 10-token request cost. With credentials, the worker reads `/account/limits` hourly, uses 25% of the account's current read refill rate, and caps itself at 10 requests per second. That leaves headroom for other Kalshi clients using the same account. `429` and `5xx` responses use jittered exponential backoff. Kalshi currently does not send `Retry-After` or rate-limit headers, so the worker does not depend on them.

## Cache path

1. The minute cron runs the scheduler.
2. The worker writes one internal state document and one sanitized public snapshot to KV. The local server mirrors the same KV records to `.local-cache/kalshi-kv.json`, so restarting localhost does not trigger an empty cold cache.
3. `/api/odds?date=YYYY-MM-DD` returns only the nearby events needed by the globe.
4. Cloudflare's edge cache holds that response for 30 seconds and may serve stale data for two minutes during an upstream problem.
5. The browser checks only the cached endpoint every 30 seconds and merges prices, volume, and the real Kalshi ticker without moving the globe. It never calls Kalshi directly.

Snapshots older than three adaptive refresh intervals (with a five-minute minimum) are removed from API responses until refreshed. The UI therefore shows an explicit cache-updating state instead of silently falling back to embedded odds. `/api/health` reports the newest and oldest event timestamps, overdue event count, request success counts, poll errors, and futures-pipeline status.

This makes page traffic independent of Kalshi traffic: 10 users and 100,000 users produce the same scheduled upstream request load.

## Team futures

Clicking a team name in MLB, NFL, college football, NBA, WNBA, NHL, Champions League, or a supported domestic soccer league opens that team's market window. The generalized `/api/team-markets?sport=LEAGUE&team=CODE&name=NAME` endpoint reads a daily KV manifest and returns every distinct posted team-future category it can match: title, conference, division, playoffs, win totals, seeding, cup, finalist/advance, top-two/four/eight/half, relegation, and best/worst record markets.

The daily discovery pass uses Kalshi's Sports series metadata, then performs one paginated server-side open-events sweep shared by generic and MLB futures. Game lines, spreads, totals, player markets, awards, draft markets, and novelty contracts are excluded. A verified fallback set covers the major NFL, NBA, WNBA, NHL, college-football, and soccer series if metadata discovery is temporarily unavailable. The sweep is atomic: a failed pass leaves the last successful manifest untouched. A KV lease prevents overlapping minute-cron runs, and futures use a reserved background portion of the read budget so game odds remain the priority. Team clicks read KV and edge cache only; they never trigger upstream Kalshi traffic.

The currently enabled leagues are MLB, NFL, college football, NBA, WNBA, NHL, EPL, Champions League, La Liga, Bundesliga, Serie A, Ligue 1, Brasileirão, Liga MX, and Argentine Primera. A newly listed series that fits one of the supported team-future categories is picked up automatically on the next daily pass.

### MLB details

MLB keeps its stricter team-specific cache and adds a Player Props tab. Each team has its own versioned KV record (`kalshi:team-futures:v2:MLB:CODE`); the endpoint never reads a shared all-team payload. The response supplies four daily-cached futures:

- World Series title.
- Playoff qualification.
- The team's highest-volume regular-season wins contract.
- Division winner.

The same tab has a Player Props view. `/api/mlb-team-markets?team=CODE&event=TICKER` combines that team's daily record with game-matched strikeout (`KXMLBKS`) and hits+runs+RBIs (`KXMLBHRR`) markets from the adaptive sports cache. Until a prop is posted, the view shows a deliberate empty state. The worker discovers championship, playoff, all six division series, and one season-wins series per MLB team once every 24 hours. Shared markets are assigned only by exact ticker suffix, every card carries its sport/team/kind identity, and records are validated before writes and again before responses. A failed series refresh preserves only the affected field from that team's prior valid record. Team clicks only read team-specific KV/edge cache and never trigger a Kalshi request.

## Schedule refreshes

- `npm run refresh:soccer-schedules` rebuilds the 2026 Brasileirão, Liga MX, and Argentine Primera calendar and its stadium cache.
- `npm run refresh:international-baseball` rebuilds LMB from the MLB Stats API, KBO from the official KBO schedule service, and NPB from the official NPB monthly schedules. Stadium coordinates are kept in `data/international-baseball-venue-cache.json`.
- `npm run refresh:mlb-futures` rebuilds the 30-team local preview cache from the same market-indexing code used by the hosted worker.

The map stores the official game date, exact UTC start, home stadium, city, and coordinates before attempting to match any Kalshi market. Kalshi discovery then uses the league series plus date/team tokens, so newly posted markets attach without rebuilding the schedule.

## Market coverage invariant

Schedule data alone is never sufficient for a near-term event. After the server cache loads, every unelapsed event overlapping today or tomorrow must resolve to a real Kalshi event by exact ticker or the league's verified series/date/team matcher. This applies to every sport on the globe. Distant fixtures may remain unlisted while Kalshi has not posted them.

A missing near-term match raises `MISSING_NEAR_TERM_KALSHI_MARKETS`, lists every offending event, marks its detail as `ERROR · Kalshi market missing`, and puts the globe and timeline summaries into a visible error state. Clicking either error summary opens the complete diagnostic list with sport, matchup, dates, and expected ticker. Never sign off on a newly added sport while that error is present. The regression suite must cover the hard-error case, the distant-event exception, every supported sport code, and the global 48-hour cache window.

## Deploy

1. Install dependencies with `npm install`.
2. Create KV namespaces:
   - `npx wrangler kv namespace create MARKET_ATLAS_CACHE`
   - `npx wrangler kv namespace create MARKET_ATLAS_CACHE --preview`
3. Put the returned IDs in `wrangler.toml`.
4. Optionally copy `.dev.vars.example` to `.dev.vars` and add Kalshi credentials. Public market data works without credentials; credentials let the deployment use its assigned authenticated tier.
5. Run locally at `http://localhost:8766` with `npm run dev`. The dependency-free local server keeps an in-memory odds cache and runs the same adaptive scheduler every minute, so it no longer serves the embedded MLB snapshot indefinitely. Use `npm run dev:worker` to exercise Wrangler's local KV runtime, or `npm run dev:static` only for a deliberately frozen UI-only preview, then deploy with `npm run deploy`.
6. Trigger the first warm-up immediately in Cloudflare or wait for the next minute cron. `/api/health` reports the last successful scheduler run.

Tune `KALSHI_RATE_BUDGET_FRACTION` if this service should use more or less of the authenticated tier. An explicit `KALSHI_READ_TOKENS_PER_SECOND` overrides auto-detection. Keep `KALSHI_MAX_EVENT_REFRESHES_PER_RUN` bounded so a busy Saturday cannot monopolize the worker; overdue events are ordered by age so the cap cannot starve the same games indefinitely.

## Relevant Kalshi behavior

- [Kalshi integration guide: API quirks, heuristics, and hard-won rules](docs/kalshi-integration-guide.md)
- [Project roadmap](docs/roadmap.md)
- [Rate limits and token costs](https://docs.kalshi.com/getting_started/rate_limits)
- [Inspect the authenticated account's API limits](https://docs.kalshi.com/api-reference/account/get-account-api-limits)
- [Cursor pagination](https://docs.kalshi.com/getting_started/pagination)
- [Get Event with nested markets](https://docs.kalshi.com/api-reference/events/get-event)
- [Series, events, and markets](https://docs.kalshi.com/getting_started/terms)
