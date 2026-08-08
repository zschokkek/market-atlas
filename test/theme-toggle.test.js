import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("theme toggle keeps classic dark as default and offers light via data-theme", async () => {
  const html = await read("public/index.html");
  const css = await read("public/assets/app.css");
  const js = await read("public/assets/app.js");

  // Default is now light
  assert.match(html, /<html[^>]*data-theme="light"/);
  assert.match(html, /<meta[^>]*name="theme-color"[^>]*content="#eef2ef"/);
  assert.match(html, /<meta[^>]*name="color-scheme"[^>]*content="light"/);
  // Inline init script respects localStorage and defaults to dark
  assert.match(html, /localStorage\.getItem\('market-atlas-theme'\)/);
  assert.match(html, /document\.documentElement\.setAttribute\('data-theme'/);

  // Toggle button exists, minimalist
  assert.match(html, /id="theme-toggle"/);
  assert.match(html, /integration-theme-toggle/);
  assert.match(html, /aria-label="Toggle globe style"/);
  // No heavy pill background — minimalist transparent style
  assert.match(css, /\.integration-theme-toggle,\s*\.integration-daily-link\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.integration-theme-toggle:hover[^}]*text-decoration:\s*underline/);
  assert.doesNotMatch(css, /\.integration-theme-toggle\s*\{[^}]*border-radius:\s*999px[^}]*background:\s*var\(--integration-surface\)/);

  // JS toggle logic: persists, updates meta, switches label
  assert.match(js, /const STORAGE_KEY = "market-atlas-theme"/);
  assert.match(js, /function applyTheme\(theme\)/);
  assert.match(js, /html\.setAttribute\("data-theme", t\)/);
  assert.match(js, /metaTheme\.setAttribute\("content", t === "light" \? "#eef2ef" : "#0b110e"\)/);
  assert.match(js, /localStorage\.setItem\(STORAGE_KEY, t\)/);
  assert.match(js, /getElementById\("theme-toggle"\)/);
  assert.match(js, /\.addEventListener\("click", \(\) => applyTheme\(currentTheme\(\) === "dark" \? "light" : "dark"\)\)/);
  assert.match(js, /window\.__marketAtlasTheme/);

  // CSS actually toggles globe via variables — light block must override on html[data-theme="light"]
  assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*--integration-background:\s*#eef2ef/);
  assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*--shared-globe-background:\s*#eef2ef/);
  assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*--shared-globe-land:\s*#d5ddd5/);
  // Dark base still present
  assert.match(css, /:root\s*\{[^}]*--integration-background:\s*#111713/);
  assert.match(css, /:root\s*\{[^}]*--shared-globe-background:\s*#111713/);
  // Header also toggles — dark uses color-mix, light uses #ffffff
  assert.match(css, /html\[data-theme="light"\] \.integration-header\s*\{[^}]*background:\s*#ffffff/);
  assert.match(css, /\.integration-header\s*\{[^}]*background:\s*color-mix/);
});

test("globe shell and category styles all respond to the same data-theme toggle", async () => {
  const appCss = await read("public/assets/app.css");
  const globeCss = await read("public/assets/globe-shell.css");
  const searchCss = await read("public/assets/search.css");
  const politicsCss = await read("public/categories/politics/styles.css");
  const weatherCss = await read("public/categories/weather/styles.css");
  const businessCss = await read("public/categories/business/styles.css");

  // All files must contain light overrides prefixed correctly — no broken " :root"
  for (const [name, css] of [
    ["app", appCss],
    ["politics", politicsCss],
  ]) {
    assert.match(css, /html\[data-theme="light"\]\s*\{[^}]*color-scheme:\s*light/, `${name} has light :root block`);
    assert.doesNotMatch(css, /html\[data-theme="light"\] :root/, `${name} must not have broken descendant :root`);
  }
  for (const [name, css] of [
    ["globe-shell", globeCss],
    ["search", searchCss],
    ["weather", weatherCss],
    ["business", businessCss],
  ]) {
    assert.match(css, /html\[data-theme="light"\]/, `${name} has light overrides`);
    assert.doesNotMatch(css, /html\[data-theme="light"\] :root/, `${name} must not have broken descendant :root`);
  }

  // Globe respects toggle: ocean/land/border variables switch
  assert.match(appCss, /html\[data-theme="light"\]\s*\{[^}]*--shared-globe-ocean-light:\s*#dde7de/);
  assert.match(appCss, /html\[data-theme="light"\]\s*\{[^}]*--shared-globe-ocean-dark:\s*#eef2ef/);
  // Search panel toggles
  assert.match(searchCss, /html\[data-theme="light"\] \.market-search-panel\s*\{[^}]*background:\s*#ffffff/);
  // Politics toggles party colors and surface
  assert.match(politicsCss, /html\[data-theme="light"\]\s*\{[^}]*--background:\s*#eef2ef/);
  assert.match(politicsCss, /html\[data-theme="light"\]\s*\{[^}]*--dem-blue:\s*#6b8db5/);
  // Weather toggles marker fill + temp colors
  assert.match(weatherCss, /html\[data-theme="light"\] \.weather-app \.event-marker \.marker-core\s*\{[^}]*fill:\s*#ffffff/);
  // Business toggles card
  assert.match(businessCss, /html\[data-theme="light"\] \.business-app\s*\{[^}]*--surface:\s*#ffffff/);
  // Globe shell marker halo toggles
  assert.match(globeCss, /html\[data-theme="light"\] \.market-globe-shell \.event-marker\.is-selected \.marker-halo\s*\{[^}]*stroke:\s*#787c7e/);
});

test("sports side windows (filter/detail) follow the same data-theme toggle", async () => {
  const sports = await read("public/categories/sports/index.html");
  // Sports inline :root must expose real light/dark variables, not just color-scheme
  assert.match(sports, /:root\[data-theme="light"\]\s*\{[^}]*--background:\s*#eef2ef/);
  assert.match(sports, /:root\[data-theme="light"\]\s*\{[^}]*--foreground:\s*#1a2320/);
  assert.match(sports, /:root\[data-theme="dark"\]\s*\{[^}]*--background:\s*#111713/);
  assert.match(sports, /:root\[data-theme="dark"\]\s*\{[^}]*--foreground:\s*#f4f6f3/);
  // Side panels (.orbital-panel) derive from --card/--border which are set via those roots, so toggle propagates
  assert.match(sports, /\.orbital-panel/);
});

test("side windows on both sides of globe and search dropdown follow data-theme", async () => {
  const appCss = await read("public/assets/app.css");
  const searchCss = await read("public/assets/search.css");
  const sports = await read("public/categories/sports/index.html");
  // Global side-window fix must exist
  assert.match(appCss, /Ensure side windows.*orbital-panel.*market-detail-panel/s);
  assert.match(appCss, /html\[data-theme="light"\] \.orbital-panel/);
  assert.match(appCss, /html\[data-theme="light"\] \.market-search-panel/);
  // Search dropdown results also toggle
  assert.match(searchCss, /html\[data-theme="light"\] \.market-search-panel/);
  // Sports side windows already checked, ensure globe-shell side windows also have fix
  const politicsCss = await read("public/categories/politics/styles.css");
  assert.match(politicsCss, /category side-window light fix/);
});

test("KXDAILY link is desktop-only and minimalist", async () => {
  const html = await read("public/index.html");
  const css = await read("public/assets/app.css");
  assert.match(html, /<a[^>]*class="integration-daily-link"[^>]*href="https:\/\/zschokkek\.github\.io\/daily-market\/"/);
  assert.match(html, />Try the KXDAILY/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener"/);
  // Desktop-only: hidden below 1100px
  assert.match(css, /@media\s*\(max-width:\s*1100px\)\s*\{[^}]*\.integration-daily-link\s*\{\s*display:\s*none/);
  // Minimalist: transparent background, not pill
  assert.match(css, /\.integration-daily-link\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.integration-daily-link:\s*hover\s*\{[^}]*text-decoration:\s*underline/);
  assert.doesNotMatch(css, /\.integration-daily-link\s*\{[^}]*border-radius:\s*999px[^}]*background:\s*color-mix/);
  // KXDAILY + toggle are outside header AND outside shell so search stays standard and globe grid intact
  const headerEnd = html.indexOf('</header>');
  const shellEnd = html.indexOf('</main>');
  const utilityIdx = html.indexOf('integration-utility-bar');
  const toggleIdx = html.indexOf('id="theme-toggle"');
  const dailyIdx = html.indexOf('integration-daily-link');
  const searchIdx = html.indexOf('integration-search-shell');
  assert.ok(headerEnd !== -1 && shellEnd !== -1 && utilityIdx !== -1, "utility bar exists outside header/shell");
  assert.ok(utilityIdx > headerEnd, "utility bar is outside header");
  assert.ok(utilityIdx > shellEnd, "utility bar is outside shell (globe grid unaffected)");
  assert.ok(toggleIdx !== -1 && dailyIdx !== -1 && searchIdx !== -1, "all header controls present");
  assert.ok(searchIdx < headerEnd, "search stays inside header (standard place)");
  assert.ok(dailyIdx > shellEnd && toggleIdx > shellEnd, "KXDAILY and toggle are outside shell, at page bottom");
  assert.ok(dailyIdx < toggleIdx, "KXDAILY before toggle inside utility bar");
});
