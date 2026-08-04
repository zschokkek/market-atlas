import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

await build({
  entryPoints: ["src/client/map-runtime.js"],
  outfile: "public/assets/map-runtime.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  logLevel: "info",
});

const entrypoints = ["app.js", "search.js"];
const indexPath = "public/index.html";
let index = await readFile(indexPath, "utf8");
for (const entrypoint of entrypoints) {
  const source = await readFile(`public/assets/${entrypoint}`);
  const version = createHash("sha256").update(source).digest("hex").slice(0, 12);
  const escaped = entrypoint.replace(".", "\\.");
  index = index.replace(
    new RegExp(`src="/assets/${escaped}(?:\\?v=[a-f0-9]+)?"`, "g"),
    `src="/assets/${entrypoint}?v=${version}"`
  );
}
await writeFile(indexPath, index);

await build({
  entryPoints: ["src/client/sports-team-names.js"],
  outfile: "public/assets/sports-team-names.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  logLevel: "info",
});
