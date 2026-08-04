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
