import { readFile } from "node:fs/promises";

const requested = process.argv.slice(2).filter(value => !value.startsWith("-"));
const environments = requested.length ? requested : ["staging", "production"];
const allowed = new Set(["staging", "production"]);
const config = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
const failures = [];

for (const environment of environments) {
  if (!allowed.has(environment)) {
    failures.push(`Unknown deployment environment: ${environment}`);
    continue;
  }

  const sectionStart = config.indexOf(`[env.${environment}]`);
  const nextEnvironment = environment === "staging"
    ? config.indexOf("\n[env.production]", sectionStart + 1)
    : -1;
  const section = sectionStart < 0
    ? ""
    : config.slice(sectionStart, nextEnvironment < 0 ? config.length : nextEnvironment);

  if (!section) {
    failures.push(`wrangler.toml is missing [env.${environment}]`);
    continue;
  }
  if (!section.includes(`ENVIRONMENT = "${environment}"`)) {
    failures.push(`${environment} is missing its ENVIRONMENT marker`);
  }
  if (!section.includes(`name = "market-atlas${environment === "staging" ? "-staging" : ""}"`)) {
    failures.push(`${environment} has an unexpected Worker name`);
  }

  const id = section.match(/\bid\s*=\s*"([^"]+)"/)?.[1] || "";
  const previewId = section.match(/\bpreview_id\s*=\s*"([^"]+)"/)?.[1] || "";
  if (!/^[a-f0-9]{32}$/i.test(id)) failures.push(`${environment} KV id is still unset or invalid`);
  if (!/^[a-f0-9]{32}$/i.test(previewId)) failures.push(`${environment} preview KV id is still unset or invalid`);
}

for (const forbidden of ["KALSHI_API_KEY_ID", "KALSHI_PRIVATE_KEY", "CLOUDFLARE_API_TOKEN"]) {
  if (config.includes(forbidden)) failures.push(`wrangler.toml must not contain the secret ${forbidden}`);
}

if (failures.length) {
  console.error("Deployment configuration is not ready:\n" + failures.map(item => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Deployment configuration is ready for ${environments.join(" and ")}.`);
}
