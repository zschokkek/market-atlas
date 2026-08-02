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
