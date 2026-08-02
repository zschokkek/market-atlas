import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("integrated preview keeps Sports and Politics in persistent accessible tab panels", async () => {
  const html = await read("public/integrated-test/index.html");
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-category="sports"/);
  assert.match(html, /data-category="politics"/);
  assert.match(html, /data-category-view="sports"/);
  assert.match(html, /data-category-view="politics"/);
  assert.doesNotMatch(html, /<iframe\b/i);
});

test("integrated preview composes the real source views and preserves them while switching", async () => {
  const source = await read("public/integrated-test/app.js");
  assert.match(source, /fetchText\("\/"\)/);
  assert.match(source, /fetchText\("\/politics-test\/"\)/);
  assert.match(source, /previousLifecycle\?\.deactivate\?\.\(\)/);
  assert.match(source, /lifecycle\.activate\?\.\(\)/);
  assert.match(source, /view\.inert = !selected/);
  assert.match(source, /history\[historyMode === "replace"/);
});

test("integrated preview gives hidden views lifecycle-controlled polling", async () => {
  const source = await read("public/integrated-test/app.js");
  assert.match(source, /sportsClient\.deactivate\(\)/);
  assert.match(source, /clearTimeout\(timer\)/);
  assert.match(source, /integratedActive = false/);
  assert.match(source, /clearInterval\(integratedTimer\)/);
  assert.match(source, /cancelAnimationFrame\(drawFrame\)/);
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /new URL\("\/politics-test\/data\.js", window\.location\.origin\)\.href/);
});

test("integrated preview shares Sports map colors and Politics card hierarchy deliberately", async () => {
  const css = await read("public/integrated-test/styles.css");
  const source = await read("public/integrated-test/app.js");
  assert.match(css, /\.politics-app \.ocean-light[\s\S]*var\(--viz-series-1\) 18%/);
  assert.match(css, /\.politics-app \.country[\s\S]*var\(--sports-map-muted\) 78%/);
  assert.match(css, /fill-opacity: var\(--map-ocean-opacity\)/);
  assert.match(css, /stroke-opacity: var\(--map-rim-opacity\)/);
  assert.match(source, /projection\.scale\(\) - 300/);
  assert.match(source, /--map-ocean-opacity/);
  assert.match(css, /\.event-detail[\s\S]*\.price-header[\s\S]*\.price-list[\s\S]*\.price-row/);
  assert.match(css, /\.price-track[\s\S]*position: absolute/);
});

test("both globes consume one authoritative palette", async () => {
  const css = await read("public/integrated-test/styles.css");
  assert.match(css, /--shared-globe-ocean-light:/);
  assert.match(css, /--shared-globe-ocean-dark:/);
  assert.match(css, /--shared-globe-land:/);
  assert.match(css, /data-category-view="sports"[^}]*\.ocean-light,[\s\S]*data-category-view="politics"[^}]*\.ocean-light[\s\S]*stop-color: var\(--shared-globe-ocean-light\)/);
  assert.match(css, /data-category-view="sports"[^}]*\.country,[\s\S]*data-category-view="politics"[^}]*\.country[\s\S]*fill: var\(--shared-globe-land\)/);
  assert.match(css, /\.politics-globe[\s\S]*-webkit-mask-image: none/);
});

test("category switches preserve one shared geographic view", async () => {
  const source = await read("public/integrated-test/app.js");
  assert.match(source, /let sharedMapView = null/);
  assert.match(source, /getMapView: \(\) => \(\{ rotate: \[\.\.\.projection\.rotate\(\)\], scale: projection\.scale\(\) \}\)/);
  assert.match(source, /setMapView\(view\)[\s\S]*projection\.rotate\(view\.rotate\.slice\(0, 3\)\)[\s\S]*projection\.scale\(scale\)/);
  assert.match(source, /departingMapView[\s\S]*sharedMapView = departingMapView/);
  assert.match(source, /lifecycle\.setMapView\?\.\(sharedMapView\)/);
});

test("Politics markers match the Sports dark-core construction and retain count badges", async () => {
  const css = await read("public/integrated-test/styles.css");
  assert.match(css, /\.politics-app \.event-marker \.marker-core[\s\S]*--politics-party-fill[\s\S]*--politics-party-reveal[\s\S]*stroke-width: 2/);
  assert.match(css, /\.event-marker\.leader-dem \.marker-core[\s\S]*stroke: var\(--dem-blue-soft\)/);
  assert.match(css, /\.event-marker\.leader-rep \.marker-core[\s\S]*stroke: var\(--rep-red-soft\)/);
  assert.match(css, /\.politics-app \.event-marker \.market-count[\s\S]*fill: var\(--shared-globe-background\)/);
});

test("U.S. political fills return progressively at regional zoom with probability-driven shades", async () => {
  const source = await read("public/integrated-test/app.js");
  const css = await read("public/integrated-test/styles.css");
  assert.match(source, /partyFillStrength = 32 \+ \(\(leaderPrice - 50\) \/ 50\) \* 48/);
  assert.match(source, /projection\.scale\(\) - 380/);
  assert.match(source, /--politics-party-reveal/);
  assert.match(css, /leader-dem \.marker-core[\s\S]*var\(--dem-blue\) var\(--party-fill-strength/);
  assert.match(css, /leader-rep \.marker-core[\s\S]*var\(--rep-red\) var\(--party-fill-strength/);
  assert.match(css, /event-marker\.is-global \.marker-core[\s\S]*fill: var\(--shared-globe-background\)/);
});
