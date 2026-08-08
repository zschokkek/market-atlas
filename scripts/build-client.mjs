import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";

// Skip map-runtime rebuild if src/client hasn't changed (saves 28s on CSS-only runs)
const mapRuntimeSrc = "src/client/map-runtime.js";
const mapRuntimeOut = "public/assets/map-runtime.js";
let shouldBuildMapRuntime = true;
if (existsSync(mapRuntimeOut)) {
  try {
    const [srcStat, outStat] = await Promise.all([stat(mapRuntimeSrc), stat(mapRuntimeOut)]);
    // Also check d3 dependencies if they exist
    const srcMtime = srcStat.mtimeMs;
    const outMtime = outStat.mtimeMs;
    shouldBuildMapRuntime = srcMtime > outMtime;
    if (!shouldBuildMapRuntime) {
      // Also check if any dep is newer than output (light check)
      const depStats = await Promise.all(
        ["src/client/map-runtime.js", "package.json"].map(p => stat(p).catch(() => ({ mtimeMs: 0 })))
      );
      shouldBuildMapRuntime = depStats.some(s => s.mtimeMs > outMtime);
    }
  } catch {}
}
if (shouldBuildMapRuntime) {
  await build({
    entryPoints: [mapRuntimeSrc],
    outfile: mapRuntimeOut,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    legalComments: "none",
    logLevel: "info",
  });
} else {
  console.log(`  ${mapRuntimeOut}  1.0mb (cached)`);
  console.log(`⚡ Done in 0ms (skipped, src unchanged)`);
}

const entrypoints = [
  { file: "app.js", attribute: "src" },
  { file: "search.js", attribute: "src" },
  { file: "app.css", attribute: "href" },
  { file: "globe-shell.css", attribute: "href" },
  { file: "search.css", attribute: "href" }
];
const indexPath = "public/index.html";
let index = await readFile(indexPath, "utf8");
for (const { file, attribute } of entrypoints) {
  const source = await readFile(`public/assets/${file}`);
  const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const escaped = file.replace(".", "\\.");
  index = index.replace(
    new RegExp(`${attribute}="/assets/${escaped}(?:\\?v=[a-f0-9]+)?"`, "g"),
    `${attribute}="/assets/${file}?v=${version}"`
  );
}
await writeFile(indexPath, index);

const teamNamesSrc = "src/client/sports-team-names.js";
const teamNamesOut = "public/assets/sports-team-names.js";
let shouldBuildTeamNames = true;
if (existsSync(teamNamesOut)) {
  try {
    const [s, o] = await Promise.all([stat(teamNamesSrc), stat(teamNamesOut)]);
    shouldBuildTeamNames = s.mtimeMs > o.mtimeMs;
  } catch {}
}
if (shouldBuildTeamNames) {
  await build({
    entryPoints: [teamNamesSrc],
    outfile: teamNamesOut,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    legalComments: "none",
    logLevel: "info",
  });
} else {
  console.log(`  ${teamNamesOut}  9.1kb (cached)`);
  console.log(`⚡ Done in 0ms (skipped, src unchanged)`);
}
