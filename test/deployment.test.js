import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Wrangler isolates staging and production resources and polling budgets", async () => {
  const config = await read("wrangler.toml");
  assert.match(config, /\[env\.staging\][\s\S]*name = "market-atlas-staging"/);
  assert.match(config, /\[env\.production\][\s\S]*name = "market-atlas"/);
  assert.match(config, /\[\[env\.staging\.kv_namespaces\]\][\s\S]*id = "[a-f0-9]{32}"[\s\S]*preview_id = "[a-f0-9]{32}"/i);
  assert.match(config, /\[\[env\.production\.kv_namespaces\]\][\s\S]*id = "[a-f0-9]{32}"[\s\S]*preview_id = "[a-f0-9]{32}"/i);
  const hostedKvIds = [...config.matchAll(/(?:id|preview_id) = "([a-f0-9]{32})"/gi)].map(match => match[1]);
  assert.equal(hostedKvIds.length, 4);
  assert.equal(new Set(hostedKvIds).size, 4);
  assert.match(config, /\[env\.staging\.triggers\][\s\S]*"\*\/5 \* \* \* \*"/);
  assert.match(config, /\[env\.production\.triggers\][\s\S]*"\* \* \* \* \*"/);
  assert.match(config, /\[env\.production\.vars\][\s\S]*KALSHI_SCHEDULED_READ_REQUESTS_PER_SECOND = "0\.25"/);
  assert.match(config, /\[env\.production\.vars\][\s\S]*KALSHI_POLL_CONCURRENCY = "1"/);
  assert.match(config, /\[env\.production\.vars\][\s\S]*KALSHI_MAX_EVENT_REFRESHES_PER_RUN = "15"/);
  assert.match(config, /\[env\.production\.vars\][\s\S]*KALSHI_MAX_RETRY_ATTEMPTS = "1"/);
  assert.match(config, /compatibility_date = "2026-08-02"/);
  assert.match(config, /compatibility_flags = \["nodejs_compat"\]/);
  assert.match(config, /\[exports\.RefreshCoordinator\][\s\S]*type = "durable-object"[\s\S]*storage = "sqlite"/);
  assert.match(config, /\[\[env\.staging\.durable_objects\.bindings\]\][\s\S]*name = "REFRESH_COORDINATOR"[\s\S]*class_name = "RefreshCoordinator"/);
  assert.match(config, /\[\[env\.production\.durable_objects\.bindings\]\][\s\S]*name = "REFRESH_COORDINATOR"[\s\S]*class_name = "RefreshCoordinator"/);
  assert.match(config, /\[observability\][\s\S]*enabled = true/);
  assert.doesNotMatch(config, /KALSHI_API_KEY_ID|KALSHI_PRIVATE_KEY|CLOUDFLARE_API_TOKEN/);
});

test("GitHub verifies every change, auto-deploys staging, and gates production", async () => {
  const ci = await read(".github/workflows/ci.yml");
  const production = await read(".github/workflows/deploy-production.yml");
  assert.match(ci, /pull_request:[\s\S]*branches: \[main\]/);
  assert.match(ci, /push:[\s\S]*branches: \[main\]/);
  assert.match(ci, /deploy-staging:[\s\S]*needs: verify/);
  assert.match(ci, /environment:[\s\S]*name: staging[\s\S]*deployment-url/);
  assert.match(ci, /command: deploy --env staging/);
  assert.match(ci, /secrets:[\s\S]*KALSHI_API_KEY_ID[\s\S]*KALSHI_PRIVATE_KEY/);
  assert.match(production, /release:[\s\S]*types: \[published\]/);
  assert.match(production, /workflow_dispatch:/);
  assert.match(production, /environment:[\s\S]*name: production[\s\S]*deployment-url/);
  assert.match(production, /cancel-in-progress: false/);
  assert.match(production, /command: deploy --env production/);
  assert.match(production, /secrets:[\s\S]*KALSHI_API_KEY_ID[\s\S]*KALSHI_PRIVATE_KEY/);
});

test("deployment documentation keeps application and CI secrets out of Git", async () => {
  const ignore = await read(".gitignore");
  const runbook = await read("docs/deployment.md");
  assert.match(ignore, /\.dev\.vars\*/);
  assert.match(ignore, /\.env\.\*/);
  assert.match(ignore, /\*\.pem/);
  assert.match(runbook, /wrangler secret put KALSHI_API_KEY_ID --env staging/);
  assert.match(runbook, /wrangler secret put KALSHI_PRIVATE_KEY --env production/);
  assert.match(runbook, /CLOUDFLARE_API_TOKEN/);
  assert.match(runbook, /complete multiline PEM private key/i);
  assert.match(runbook, /required reviewer/);
});

test("health responses identify their environment and API JSON is hardened", async () => {
  const worker = await read("src/worker.js");
  const localServer = await read("scripts/dev-server.mjs");
  assert.match(worker, /environment: env\.ENVIRONMENT \|\| "unknown"/);
  assert.match(worker, /headers\.set\("x-content-type-options", "nosniff"\)/);
  assert.match(worker, /headers\.set\("referrer-policy", "no-referrer"\)/);
  assert.match(worker, /if \(!headers\.has\("cache-control"\)\) headers\.set\("cache-control", "no-store"\)/);
  assert.match(localServer, /ENVIRONMENT: process\.env\.ENVIRONMENT \|\| "local"/);
});
