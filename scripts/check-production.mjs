import { readFile, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "package-lock.json",
  "wrangler.toml",
  ".github/workflows/ci.yml",
  ".github/workflows/deploy-production.yml",
  ".github/dependabot.yml",
  "docs/deployment.md",
  "public/index.html",
  "public/_headers",
  "public/og.png",
  "public/assets/map-runtime.js",
  "public/assets/sports-team-names.js",
  "public/categories/sports/index.html",
  "public/categories/politics/index.html",
  "public/categories/weather/index.html",
  "public/categories/business/index.html",
];

const textFiles = [
  "public/index.html",
  "public/assets/app.js",
  "public/assets/search.js",
  "public/assets/map-runtime.js",
  "public/assets/sports-team-names.js",
  "public/categories/sports/index.html",
  "public/categories/politics/index.html",
  "public/categories/politics/app.js",
  "public/categories/weather/index.html",
  "public/categories/weather/app.js",
  "public/categories/business/index.html",
  "public/categories/business/data.js",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    const info = await stat(join(root, file));
    if (!info.isFile() || info.size === 0) failures.push(`${file} is empty or not a file`);
  } catch {
    failures.push(`${file} is missing`);
  }
}

const index = await readFile(join(root, "public/index.html"), "utf8");
for (const token of [
  'name="description"',
  'name="theme-color"',
  'property="og:title"',
  'property="og:image" content="/og.png"',
  'name="twitter:card" content="summary_large_image"',
]) {
  if (!index.includes(token)) failures.push(`public/index.html is missing ${token}`);
}
for (const entrypoint of ["app.js", "search.js"]) {
  if (!new RegExp(`src="/assets/${entrypoint.replace(".", "\\.")}\\?v=[a-f0-9]{12}"`).test(index)) {
    failures.push(`public/index.html does not cache-bust ${entrypoint}`);
  }
}
for (const stylesheet of ["app.css", "globe-shell.css", "search.css"]) {
  if (!new RegExp(`href="/assets/${stylesheet.replace(".", "\\.")}\\?v=[a-f0-9]{12}"`).test(index)) {
    failures.push(`public/index.html does not cache-bust ${stylesheet}`);
  }
}

const appShell = await readFile(join(root, "public/assets/app.js"), "utf8");
if (!appShell.includes('new URL("/assets/map-runtime.js", window.location.origin).href')) {
  failures.push("public/assets/app.js does not resolve the map runtime before Blob-module imports");
}
if (!appShell.includes('new URL("/assets/sports-team-names.js", window.location.origin).href')) {
  failures.push("public/assets/app.js does not resolve canonical sports names before Blob-module imports");
}

const wranglerConfig = await readFile(join(root, "wrangler.toml"), "utf8");
for (const token of [
  "[env.staging]",
  "[env.production]",
  'ENVIRONMENT = "staging"',
  'ENVIRONMENT = "production"',
  'name = "market-atlas-staging"',
]) {
  if (!wranglerConfig.includes(token)) failures.push(`wrangler.toml is missing ${token}`);
}
for (const secret of ["KALSHI_API_KEY_ID", "KALSHI_PRIVATE_KEY", "CLOUDFLARE_API_TOKEN"]) {
  if (wranglerConfig.includes(secret)) failures.push(`wrangler.toml must not contain ${secret}`);
}

const stagingWorkflow = await readFile(join(root, ".github/workflows/ci.yml"), "utf8");
const productionWorkflow = await readFile(join(root, ".github/workflows/deploy-production.yml"), "utf8");
for (const token of ["name: staging", "deployment-url", "deploy --env staging", "needs: verify", "secrets.CLOUDFLARE_API_TOKEN", "secrets.KALSHI_PRIVATE_KEY"]) {
  if (!stagingWorkflow.includes(token)) failures.push(`staging workflow is missing ${token}`);
}
for (const token of ["name: production", "deployment-url", "deploy --env production", "types: [published]", "cancel-in-progress: false", "secrets.KALSHI_PRIVATE_KEY"]) {
  if (!productionWorkflow.includes(token)) failures.push(`production workflow is missing ${token}`);
}

const png = await readFile(join(root, "public/og.png"));
if (png.length < 24 || png.toString("ascii", 1, 4) !== "PNG") {
  failures.push("public/og.png is not a PNG");
} else {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    failures.push(`public/og.png must be 1200x630, received ${width}x${height}`);
  }
}

for (const file of textFiles) {
  const source = await readFile(join(root, file), "utf8");
  if (/\bfrom\s+["']https?:\/\//.test(source) || /\bimport\s*\(\s*["']https?:\/\//.test(source)) {
    failures.push(`${relative(root, file)} contains a runtime network module import`);
  }
  for (const phrase of ["Integrated Preview", "Test Page", "Weather cache scaffold"]) {
    if (source.includes(phrase)) failures.push(`${file} contains production placeholder text: ${phrase}`);
  }
}

if (failures.length) {
  console.error("Production checks failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  const checkedExtensions = [...new Set(textFiles.map(extname))].join(", ");
  console.log(`Production checks passed (${requiredFiles.length} required assets; ${checkedExtensions} sources inspected).`);
}
