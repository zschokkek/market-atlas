# Deployment runbook

Market Atlas deploys to two isolated Cloudflare Workers environments. Staging
uses a five-minute cron and reduced Kalshi read budget. Production uses the
one-minute live-event scheduler. Each environment must have its own KV
namespace and Worker secrets.

## Release flow

- Every pull request to `main` runs the locked install, dependency audit, tests,
  production checks, and both Wrangler dry-run bundles.
- Every push to `main` runs the same verification and then deploys `staging`.
- Publishing a GitHub release, or manually dispatching the production workflow,
  validates the release again and deploys `production`.
- GitHub deployment concurrency prevents overlapping releases to the same
  environment. Configure the `production` GitHub environment with a required
  reviewer before enabling the first deployment.

## One-time Cloudflare setup

Authenticate without placing credentials in this repository:

```bash
npx wrangler login
```

Create four distinct KV namespaces:

```bash
npx wrangler kv namespace create MARKET_ATLAS_CACHE --env staging
npx wrangler kv namespace create MARKET_ATLAS_CACHE --env staging --preview
npx wrangler kv namespace create MARKET_ATLAS_CACHE --env production
npx wrangler kv namespace create MARKET_ATLAS_CACHE --env production --preview
```

Copy the returned 32-character IDs into the matching staging and production
`id` and `preview_id` fields in `wrangler.toml`. KV IDs are resource identifiers,
not credentials, and should be committed so CI can deploy deterministically.

The GitHub workflows synchronize Kalshi credentials from their protected
environment secrets into the matching Cloudflare Worker during every deploy.
For a break-glass manual deployment, the same secrets can be set directly with
Wrangler; it reads the value interactively and does not write it to the
repository:

```bash
npx wrangler secret put KALSHI_API_KEY_ID --env staging
npx wrangler secret put KALSHI_PRIVATE_KEY --env staging
npx wrangler secret put KALSHI_API_KEY_ID --env production
npx wrangler secret put KALSHI_PRIVATE_KEY --env production
```

The Kalshi private key must retain its complete PEM header, footer, and line
breaks. Authentication is optional for public market reads, but production
should use it so the scheduler can inspect its assigned read tier and preserve
rate-limit headroom.

## One-time GitHub setup

Create repository environments named exactly `staging` and `production` under
**Settings → Environments**. Configure production with a required reviewer and
restrict deployments to protected branches/tags as appropriate for the
repository plan.

Add these environment secrets to both environments:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Least-privilege token with Workers Scripts, Workers KV Storage, and account read access |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account targeted by Wrangler |
| `KALSHI_API_KEY_ID` | Kalshi API key ID for that environment's Worker |
| `KALSHI_PRIVATE_KEY` | Complete multiline PEM private key paired with the API key ID |

The deploy action sends the two Kalshi values to Cloudflare as encrypted Worker
secrets. They are never written to `wrangler.toml`, the build output, or the
repository. Use different Kalshi credentials for staging when the account setup
allows it; at minimum, the GitHub environment boundary keeps access and rotation
separate.

## Validation and manual deployment

The deploy-specific check fails closed if any hosted KV ID is missing, invalid,
or replaced with a placeholder:

```bash
npm ci
npm run build
npm run check:deploy
```

After it passes, manual deployments are available as a fallback:

```bash
npm run deploy:staging
npm run deploy:production
```

After deployment, verify `GET /api/health` in each environment. A healthy
response has `ok: true`, a recent successful poll timestamp, and `lastError:
null`. Keep the staging and production caches isolated; never copy a KV ID from
one environment into the other.
