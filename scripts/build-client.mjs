import { build } from "esbuild";

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
