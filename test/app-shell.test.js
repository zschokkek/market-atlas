import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Market Atlas app keeps Sports, Politics, and Weather in persistent accessible tab panels", async () => {
  const html = await read("public/index.html");
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-category="sports"/);
  assert.match(html, /data-category="politics"/);
  assert.match(html, /data-category-view="sports"/);
  assert.match(html, /data-category-view="politics"/);
  assert.match(html, /data-category="weather"/);
  assert.match(html, /data-category-view="weather"/);
  assert.doesNotMatch(html, />Culture<\/button>/);
  assert.equal((html.match(/<button class="integration-tab/g) || []).length, 3, "the header exposes only Sports, Politics, and Weather");
  assert.doesNotMatch(html, /<iframe\b/i);
});

test("Market Atlas app exposes one functional cross-category market search", async () => {
  const html = await read("public/index.html");
  const source = await read("public/assets/app.js");
  const client = await read("public/assets/search.js");
  assert.match(html, /data-market-search/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /assets\/search\.js/);
  assert.match(source, /market-search:select/);
  assert.match(source, /revealMarket\(result\)/);
  assert.match(source, /revealLocation\(result\)/);
  assert.match(source, /result\.type === "location"/);
  assert.match(source, /integratedPendingSearchResult/);
  assert.match(client, /\/api\/search\?q=/);
  assert.match(client, /active=\$\{encodeURIComponent\(activeCategory\)\}/);
  assert.match(client, /result\.category === "weather" \? "WX"/);
  assert.match(client, /market-search-result\$\{result\.type === "location" \? " is-location"/);
  assert.match(client, /metaKey \|\| event\.ctrlKey/);
});

test("Market Atlas search remains viewport-safe on small phones", async () => {
  const shellCss = await read("public/assets/app.css");
  const searchCss = await read("public/assets/search.css");
  assert.match(shellCss, /@media \(max-width: 700px\)[\s\S]*grid-template-rows: auto minmax\(0, 1fr\)/);
  assert.match(shellCss, /\.integration-search-shell \.market-search-panel[\s\S]*max-height: calc\(100dvh - 7rem\)/);
  assert.match(searchCss, /@media \(max-width: 760px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(searchCss, /touch-action: manipulation/);
});

test("mobile globes use compact market and calendar dropdowns instead of bottom sliders", async () => {
  const source = await read("public/assets/app.js");
  const css = await read("public/assets/app.css");
  assert.match(source, /function installMobileFilterDropdown/);
  assert.match(source, /function installMobileCalendarDropdown/);
  assert.match(source, /label: "Markets", allLabel: "All sports"/);
  assert.match(source, /label: "Markets", allLabel: "All politics"/);
  assert.match(source, /label: "Markets", allLabel: "All weather"/);
  assert.match(source, /label: "Schedule date"/);
  assert.match(source, /label: "Election date"/);
  assert.match(source, /label: "Weather horizon"/);
  assert.match(source, /setTimelineIndex/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /usesIOSNativePickers/);
  assert.match(source, /mobile-native-filter-select/);
  assert.match(source, /mobile-native-calendar-select/);
  assert.match(source, /const controlHost = view\.querySelector\("\.market-globe-layout"\) \|\| view;[\s\S]*controlHost\.appendChild\(picker\)/);
  assert.match(css, /\.mobile-filter-dropdown\.is-open \.mobile-filter-content/);
  assert.match(css, /\.category-view \.mobile-filter-dropdown[\s\S]*width: calc\(50% - 12px\)/);
  assert.match(css, /\.mobile-calendar-picker[\s\S]*width: calc\(50% - 12px\)/);
  assert.match(css, /\.ios-native-controls \.mobile-native-filter-select/);
  assert.match(css, /\.mobile-calendar-picker[\s\S]*top: 8px;[\s\S]*right: 8px/);
  assert.match(css, /\.mobile-calendar-sheet[\s\S]*position: fixed;[\s\S]*bottom: 0;[\s\S]*border-radius: 22px 22px 0 0/);
  assert.match(css, /\.mobile-calendar-backdrop[\s\S]*backdrop-filter: blur\(3px\)/);
  assert.match(css, /\.mobile-calendar-option\.is-selected[\s\S]*var\(--integration-green\)/);
  assert.match(css, /\.date-dock,[\s\S]*\.timeline-dock[\s\S]*display: none !important/);
  assert.match(css, /\.category-view \.globe-stage[\s\S]*align-items: center[\s\S]*justify-content: center/);
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) !important;[\s\S]*grid-template-areas: "globe" !important/);
});

test("mobile markets use click-only compact bottom sheets without page scrolling", async () => {
  const source = await read("public/assets/app.js");
  const css = await read("public/assets/app.css");
  const sports = await read("public/categories/sports/index.html");
  const politics = await read("public/categories/politics/app.js");
  const weather = await read("public/categories/weather/app.js");
  assert.match(source, /function installMobileMarketCarousel/);
  assert.equal((source.match(/\n  installMobileMarketCarousel\(view\);/g) || []).length, 3, "Sports, Politics, and Weather install the shared carousel");
  assert.match(source, /Previous market/);
  assert.match(source, /Next market/);
  assert.match(source, /scrollTo\(\{ left: items\[activeIndex\]\.offsetLeft, behavior: "smooth" \}\)/);
  assert.match(source, /--mobile-market-card-height/);
  assert.match(source, /activeCard\.scrollHeight/);
  assert.match(css, /\.detail-market-list,[\s\S]*grid-auto-columns: 100%;[\s\S]*grid-auto-flow: column;[\s\S]*scroll-snap-type: x mandatory/);
  assert.match(css, /\.category-view \.map-tooltip,[\s\S]*display: none !important/);
  assert.match(css, /\.mobile-market-sheet-close \{\s*display: none !important;/);
  assert.match(css, /\.event-detail,[\s\S]*\.election-detail[\s\S]*position: fixed !important[\s\S]*visibility: hidden/);
  assert.match(css, /\.event-detail\.is-mobile-open,[\s\S]*\.election-detail\.is-mobile-open[\s\S]*visibility: visible/);
  assert.match(css, /\.integration-stage,[\s\S]*\.category-view \{[\s\S]*overflow: hidden/);
  assert.match(css, /\.market-outcomes \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.market-card\[data-outcome-count="2"\] \.market-outcomes,[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.election-detail \{[\s\S]*grid-template-rows: auto auto auto;[\s\S]*height: auto/);
  assert.match(css, /\.mobile-market-carousel-nav[\s\S]*grid-template-columns: 30px minmax\(0, 1fr\) 30px/);
  assert.match(sports, /list\.dataset\.outcomeCount = String\(displayedPrices\.length\)/);
  assert.match(sports, /class="sports-mobile-market-browser"/);
  assert.match(sports, /function showMobileMarketBrowser\(events\)/);
  assert.match(sports, /mobileMarketList\.innerHTML = ranked\.map\(sportsMobileMarketCard\)\.join\(""\)/);
  assert.match(sports, /showMobileMarketBrowser\(events\)/);
  assert.match(css, /\.sports-detail-market-list \{[\s\S]*grid-auto-columns: 100%;[\s\S]*grid-auto-flow: column;[\s\S]*scroll-snap-type: x mandatory/);
  assert.match(css, /\.sports-market-card\[data-outcome-count="2"\] \.market-outcomes \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(politics, /data-outcome-count="\$\{market\.outcomes\.length\}"/);
  assert.match(weather, /data-outcome-count="\$\{market\.outcomes\.length\}"/);
  assert.match(sports, /mobileMarketViewport[\s\S]*openMobileDetail/);
  assert.match(sports, /preciseHoverViewport[\s\S]*showClusterTooltip/);
  assert.match(politics, /preciseHoverViewport[\s\S]*openMobileDetail/);
  assert.match(weather, /preciseHoverViewport[\s\S]*openMobileDetail/);
});

test("all three mobile globes share two-finger pinch zoom without breaking one-finger input", async () => {
  const source = await read("public/assets/app.js");
  const shellCss = await read("public/assets/globe-shell.css");
  assert.match(source, /function installSharedGlobePinch\(view, lifecycle\)/);
  assert.match(source, /const touchPointers = new Map\(\)/);
  assert.match(source, /event\.pointerType !== "touch"/);
  assert.match(source, /if \(touchPointers\.size < 2\) return/);
  assert.match(source, /Math\.pow\(Math\.max\(0\.2, gesture\.distance \/ pinch\.distance\), 0\.9\)/);
  assert.match(source, /lifecycle\.setMapView\(\{[\s\S]*scale: nextScale,[\s\S]*rotate:/);
  assert.match(source, /pointermove[\s\S]*capture: true, passive: false/);
  assert.match(source, /installSharedGlobePinch\(view, lifecycle\);[\s\S]*loadedViews\.set\(category, lifecycle\)/);
  assert.match(shellCss, /\.market-globe\.is-pinching/);
});

test("Market Atlas app composes the real source views and preserves them while switching", async () => {
  const source = await read("public/assets/app.js");
  assert.match(source, /fetchText\("\/categories\/sports\/"\)/);
  assert.match(source, /fetchText\("\/categories\/politics\/"\)/);
  assert.match(source, /fetchText\("\/categories\/weather\/"\)/);
  assert.match(source, /previousLifecycle\?\.deactivate\?\.\(\)/);
  assert.match(source, /lifecycle\.activate\?\.\(\)/);
  assert.match(source, /view\.inert = !selected/);
  assert.match(source, /history\[historyMode === "replace"/);
  assert.match(source, /new URL\("\/assets\/map-runtime\.js", window\.location\.origin\)\.href/);
  assert.match(source, /source\.replaceAll\([\s\S]*from "\/assets\/map-runtime\.js"/);
});

test("Sports, Politics, and Weather are composed on one shared globe shell", async () => {
  const integrated = await read("public/index.html");
  const sports = await read("public/categories/sports/index.html");
  const politics = await read("public/categories/politics/index.html");
  const weather = await read("public/categories/weather/index.html");
  const shell = await read("public/assets/globe-shell.css");

  assert.match(integrated, /assets\/globe-shell\.css/);
  for (const source of [sports, politics, weather]) {
    assert.match(source, /market-globe-shell/);
    assert.match(source, /market-globe-layout/);
    assert.match(source, /market-filter-panel/);
    assert.match(source, /market-globe-stage/);
    assert.match(source, /market-globe/);
    assert.match(source, /market-detail-panel/);
    assert.match(source, /market-timeline-dock/);
    assert.match(source, /market-zoom-button/);
  }
  assert.match(shell, /grid-template-areas:[\s\S]*"filters globe detail"[\s\S]*"timeline timeline timeline"/);
  assert.match(shell, /\.market-filter-panel[\s\S]*grid-area: filters/);
  assert.match(shell, /\.market-detail-panel[\s\S]*grid-area: detail/);
  assert.match(shell, /\.market-timeline-dock[\s\S]*grid-area: timeline/);
});

test("Market Atlas app gives hidden views lifecycle-controlled polling", async () => {
  const source = await read("public/assets/app.js");
  assert.match(source, /sportsClient\.deactivate\(\)/);
  assert.match(source, /clearTimeout\(timer\)/);
  assert.match(source, /integratedActive = false/);
  assert.match(source, /clearInterval\(integratedTimer\)/);
  assert.match(source, /cancelAnimationFrame\(drawFrame\)/);
  assert.doesNotMatch(source, /requestIdleCallback/, "inactive globes must not initialize during idle time");
  assert.match(source, /function prefetchCategoryAssets/);
  assert.match(source, /tab\.addEventListener\("pointerenter"/);
  assert.match(source, /link\.rel = "prefetch"/);
  assert.match(source, /new URL\("\/categories\/politics\/data\.js", window\.location\.origin\)\.href/);
  assert.match(source, /new URL\("\/categories\/weather\/data\.js", window\.location\.origin\)\.href/);
});

test("Weather view uses verified market geography and the shared globe lifecycle", async () => {
  const html = await read("public/categories/weather/index.html");
  const source = await read("public/categories/weather/app.js");
  const data = await read("public/categories/weather/data.js");
  assert.match(html, /data-kind="Temperature"/);
  assert.match(html, /data-kind="Hurricanes"/);
  assert.match(html, /data-kind="Natural Disasters"/);
  assert.match(source, /window\.__integratedWeatherView/);
  assert.match(source, /getMapView\(\)/);
  assert.match(source, /setMapView\(view\)/);
  assert.match(source, /candidates = \[/);
  assert.match(data, /KXHIGHLAX-26AUG02/);
  assert.match(data, /KXFIRSTHURRICANE-26DEC01ATL/);
  assert.match(data, /KXEARTHQUAKECALIFORNIA-27/);
  assert.match(data, /KXGTEMP-26/);
});

test("Market Atlas app shares Sports map colors and Politics card hierarchy deliberately", async () => {
  const css = await read("public/assets/app.css");
  const source = await read("public/assets/app.js");
  assert.match(css, /\.politics-app \.ocean-light[\s\S]*var\(--viz-series-1\) 18%/);
  assert.match(css, /\.politics-app \.country[\s\S]*var\(--sports-map-muted\) 78%/);
  assert.match(css, /fill-opacity: var\(--map-ocean-opacity\)/);
  assert.match(css, /stroke-opacity: var\(--map-rim-opacity\)/);
  assert.match(source, /projection\.scale\(\) - 300/);
  assert.match(source, /--map-ocean-opacity/);
  assert.match(css, /\.event-detail[\s\S]*\.price-header[\s\S]*\.price-list[\s\S]*\.price-row/);
  assert.match(css, /\.price-track[\s\S]*position: absolute/);
});

test("all three globes consume one authoritative palette", async () => {
  const css = await read("public/assets/app.css");
  assert.match(css, /--shared-globe-ocean-light:/);
  assert.match(css, /--shared-globe-ocean-dark:/);
  assert.match(css, /--shared-globe-land:/);
  assert.match(css, /data-category-view="sports"[^}]*\.ocean-light,[\s\S]*data-category-view="politics"[^}]*\.ocean-light[\s\S]*stop-color: var\(--shared-globe-ocean-light\)/);
  assert.match(css, /data-category-view="sports"[^}]*\.country,[\s\S]*data-category-view="politics"[^}]*\.country[\s\S]*fill: var\(--shared-globe-land\)/);
  assert.match(css, /data-category-view="weather"[^}]*\.ocean-light[\s\S]*stop-color: var\(--shared-globe-ocean-light\)/);
  assert.match(css, /data-category-view="weather"[^}]*\.country[\s\S]*fill: var\(--shared-globe-land\)/);
  assert.match(css, /\.politics-globe[\s\S]*-webkit-mask-image: none/);
  assert.match(css, /\.weather-globe[\s\S]*-webkit-mask-image: none/);
});

test("Weather matches the shared deep-zoom transition and restrained marker system", async () => {
  const source = await read("public/categories/weather/app.js");
  const css = await read("public/assets/app.css");
  assert.match(source, /projection\.scale\(\) - 300/);
  assert.match(source, /--map-ocean-opacity/);
  assert.match(source, /--map-rim-opacity/);
  assert.match(source, /--weather-marker-reveal/);
  assert.match(css, /\.weather-app \.event-marker \.marker-core[\s\S]*var\(--weather-marker-reveal\)[\s\S]*stroke-width: 2/);
  assert.match(css, /\.weather-app \.event-marker \.marker-halo[\s\S]*fill: none/);
});

test("Global Climate becomes a top-right viewport market at regional zoom", async () => {
  const source = await read("public/categories/weather/app.js");
  const css = await read("public/categories/weather/styles.css");
  assert.match(source, /const GLOBAL_ANCHOR_SCALE = 620/);
  assert.match(source, /const GLOBAL_ANCHOR_POINT = \[WIDTH - 26, 28\]/);
  assert.match(source, /bundle\?\.id === "global-climate" \|\| bundle\?\.id === "global-temperature"/);
  assert.match(source, /projection\.scale\(\) >= GLOBAL_ANCHOR_SCALE[\s\S]*GLOBAL_ANCHOR_POINT/);
  assert.match(source, /classList\.toggle\("is-viewport-anchor"/);
  assert.doesNotMatch(source, /viewport-anchor-tag/);
  assert.doesNotMatch(css, /viewport-anchor-tag/);
});

test("category switches preserve one continuous geographic view", async () => {
  const source = await read("public/assets/app.js");
  assert.match(source, /let sharedMapView = null/);
  assert.match(source, /getMapView: \(\) => \(\{ rotate: \[\.\.\.projection\.rotate\(\)\], scale: projection\.scale\(\) \}\)/);
  assert.match(source, /setMapView\(view\)[\s\S]*projection\.rotate\(view\.rotate\.slice\(0, 3\)\)[\s\S]*projection\.scale\(scale\)/);
  assert.match(source, /departingMapView[\s\S]*sharedMapView = departingMapView/);
  assert.match(source, /lifecycle\.setMapView\?\.\(sharedMapView\)/);
  assert.match(source, /integrationStage\.scrollTop = 0/);
});

test("mobile Sports uses the same full-width globe canvas as Politics and Weather", async () => {
  const source = await read("public/assets/app.js");
  const css = await read("public/assets/app.css");
  const sports = await read("public/categories/sports/index.html");
  assert.match(sports, /const center = \[310, 280\]/);
  assert.doesNotMatch(source, /const center = \[310, 270\]/);
  assert.match(css, /\[data-category-view="sports"\][\s\S]*\.sports-layout,[\s\S]*height: 100%;[\s\S]*grid-template-areas: "globe" !important/);
  assert.match(css, /\[data-category-view="sports"\][\s\S]*\.globe-stage \{[\s\S]*width: 100%;[\s\S]*height: 100%;[\s\S]*min-height: 0/);
  assert.match(css, /\.integration-stage,[\s\S]*\.category-view \{[\s\S]*overflow: hidden/);
  assert.match(css, /\[data-category-view="sports"\] > #market-atlas-sports,[\s\S]*height: 100%;[\s\S]*overflow: hidden/);
});

test("Sports uses the shared restrained marker scale without automatic matchup pills", async () => {
  const sports = await read("public/categories/sports/index.html");
  const shell = await read("public/assets/globe-shell.css");
  assert.match(sports, /Math\.max\(7, Math\.min\(15, 6\.5 \+ normalized \* 2\.75\)\)/);
  assert.match(sports, /const showMatchup = node\.matchupTag && node\.event\.id === selectedId/);
  assert.doesNotMatch(sports, /showMatchup[\s\S]{0,120}projection\.scale\(\) >= 1100/);
  assert.match(sports, /const radius = volumeRadius\(largestMarketVolume\);/);
  assert.doesNotMatch(sports, /Bubble size = volume/);
  assert.match(shell, /#market-atlas-sports\.market-globe-shell \.event-marker > text[\s\S]*font-size: 7\.25px/);
});

test("Politics markers match the Sports dark-core construction and retain count badges", async () => {
  const css = await read("public/assets/app.css");
  assert.match(css, /\.politics-app \.event-marker \.marker-core[\s\S]*--politics-party-fill[\s\S]*--politics-party-reveal[\s\S]*stroke-width: 2/);
  assert.match(css, /\.event-marker\.leader-dem \.marker-core[\s\S]*stroke: var\(--dem-blue-soft\)/);
  assert.match(css, /\.event-marker\.leader-rep \.marker-core[\s\S]*stroke: var\(--rep-red-soft\)/);
  assert.match(css, /\.politics-app \.event-marker \.market-count[\s\S]*fill: var\(--shared-globe-background\)/);
});

test("Politics market previews dock to the nearest unobstructed map edge", async () => {
  const source = await read("public/categories/politics/app.js");
  assert.match(source, /const edgeCandidates = \[/);
  assert.match(source, /edge: "left"[\s\S]*edge: "right"[\s\S]*edge: "top"[\s\S]*edge: "bottom"/);
  assert.match(source, /coversMarker[\s\S]*obstructionPenalty/);
  assert.match(source, /tooltip\.dataset\.edge = placement\.edge/);
});

test("Market Atlas Politics composes the current House tiers and map interaction cleanup", async () => {
  const shellSource = await read("public/assets/app.js");
  const politicsHtml = await read("public/categories/politics/index.html");
  const politicsSource = await read("public/categories/politics/app.js");
  assert.match(shellSource, /fetchText\("\/categories\/politics\/"\)/);
  assert.match(shellSource, /fetchText\("\/categories\/politics\/app\.js"\)/);
  assert.match(politicsHtml, /aria-label="Election market globe"/);
  assert.doesNotMatch(politicsHtml, /Election markets at state and national capitals/);
  assert.match(politicsSource, /const edgeCandidates = \[/);
  assert.match(politicsSource, /projection\.scale\(\) >= Number\(node\.bundle\.minZoomScale \|\| 0\)/);
});

test("U.S. political fills return progressively at regional zoom with probability-driven shades", async () => {
  const source = await read("public/assets/app.js");
  const css = await read("public/assets/app.css");
  assert.match(source, /partyFillStrength = 32 \+ \(\(leaderPrice - 50\) \/ 50\) \* 48/);
  assert.match(source, /projection\.scale\(\) - 380/);
  assert.match(source, /--politics-party-reveal/);
  assert.match(css, /leader-dem \.marker-core[\s\S]*var\(--dem-blue\) var\(--party-fill-strength/);
  assert.match(css, /leader-rep \.marker-core[\s\S]*var\(--rep-red\) var\(--party-fill-strength/);
  assert.match(css, /event-marker\.is-global \.marker-core[\s\S]*fill: var\(--shared-globe-background\)/);
});
