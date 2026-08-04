import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Market Atlas app keeps all four market globes in persistent accessible tab panels", async () => {
  const html = await read("public/index.html");
  assert.match(html, /role="tablist"/);
  assert.match(html, /data-category="sports"/);
  assert.match(html, /data-category="politics"/);
  assert.match(html, /data-category-view="sports"/);
  assert.match(html, /data-category-view="politics"/);
  assert.match(html, /data-category="weather"/);
  assert.match(html, /data-category-view="weather"/);
  assert.match(html, /data-category="business"/);
  assert.match(html, /data-category-view="business"/);
  assert.doesNotMatch(html, />Culture<\/button>/);
  assert.equal((html.match(/<button class="integration-tab/g) || []).length, 4, "the header exposes all four globe categories");
  assert.doesNotMatch(html, /<iframe\b/i);
});

test("Market Atlas app exposes one functional cross-category market search", async () => {
  const html = await read("public/index.html");
  const source = await read("public/assets/app.js");
  const client = await read("public/assets/search.js");
  assert.match(html, /data-market-search/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /assets\/search\.js/);
  assert.match(html, /src="\/assets\/app\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /src="\/assets\/search\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /href="\/assets\/app\.css\?v=[a-f0-9]{12}"/);
  assert.match(html, /href="\/assets\/globe-shell\.css\?v=[a-f0-9]{12}"/);
  assert.match(html, /href="\/assets\/search\.css\?v=[a-f0-9]{12}"/);
  assert.match(source, /market-search:select/);
  assert.match(await read("public/assets/search.js"), /market-search-result-date[\s\S]*searchDateLabel\(result\)/);
  assert.match(await read("public/assets/search.css"), /\.market-search-result-date[\s\S]*font-variant-numeric: tabular-nums/);
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

test("Sports uses canonical team names without changing compact map markers", async () => {
  const sports = await read("public/categories/sports/index.html");
  const shell = await read("public/assets/app.js");
  const names = await read("src/client/sports-team-names.js");
  assert.match(sports, /from "\/assets\/sports-team-names\.js"/);
  assert.match(sports, /canonicalSportsOutcomeName\(market\.label/);
  assert.match(sports, /name: `\$\{away\[1\]\} at \$\{home\[1\]\}`/);
  assert.match(shell, /new URL\("\/assets\/sports-team-names\.js"/);
  assert.match(names, /NE: \["New England Patriots"/);
  assert.match(names, /LAD: \["Los Angeles Dodgers"/);
});

test("geographic search jumps instantly and selects the destination detail market", async () => {
  const shell = await read("public/assets/app.js");
  const sports = await read("public/categories/sports/index.html");
  const weather = await read("public/categories/weather/app.js");
  assert.match(shell, /const candidates = activeBundles\.length \? activeBundles : electionBundles;[\s\S]*selectedBundleId = match\.id;[\s\S]*renderDetail\(match\);[\s\S]*projection\.rotate\(\[-\(match\?\.lon \?\? lon\)/);
  assert.match(shell, /pending\.type === "location"[\s\S]*revealLocation\?\.\(pending\)/);
  assert.match(weather, /revealLocation\(result\) \{[\s\S]*selectedId = bundle\.id;[\s\S]*renderDetail\(bundle\);[\s\S]*projection\.rotate\(\[-\(bundle\?\.lon \?\? lon\)/);
  assert.match(sports, /revealLocation\(result\) \{[\s\S]*showClusterDetail\(localEvents\)[\s\S]*selectEvent\(nearest\.event\.id, false\)[\s\S]*projection\.rotate\(\[-\(target\?\.lon \?\? lon\)/);
  assert.match(sports, /revealMarket\(result\) \{[\s\S]*selectEvent\(event\.id, false\);[\s\S]*projection\.rotate\(\[-event\.lon/);
  assert.match(sports, /SPORTS_SEARCH_LOCATION_SCALE = 1400/);
  assert.match(sports, /SPORTS_SEARCH_MARKET_SCALE = 1500/);
  assert.match(sports, /revealLocation\(result\) \{[\s\S]*Math\.max\(SPORTS_SEARCH_LOCATION_SCALE/);
  assert.match(sports, /revealMarket\(result\) \{[\s\S]*Math\.max\(SPORTS_SEARCH_MARKET_SCALE/);
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
  assert.equal((source.match(/\n  installMobileMarketCarousel\(view\);/g) || []).length, 4, "every globe installs the shared carousel");
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
  assert.match(css, /\.mobile-market-carousel-nav \{\s*display: none;\s*\}[\s\S]*@media \(max-width: 900px\)[\s\S]*@media \(max-width: 700px\)[\s\S]*\.mobile-market-carousel-nav \{\s*display: grid;/);
  assert.match(sports, /list\.dataset\.outcomeCount = String\(displayedPrices\.length\)/);
  assert.match(sports, /class="sports-mobile-market-browser"/);
  assert.match(sports, /function showMobileMarketBrowser\(events\)/);
  assert.match(sports, /mobileMarketList\.innerHTML = ranked\.map\(sportsMobileMarketCard\)\.join\(""\)/);
  assert.match(sports, /const ticker = prices\[0\]\?\.\[4\] \|\| specificEventTicker\(event\)/);
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

test("all three mobile globes use native two-touch pinch zoom with a pointer fallback", async () => {
  const source = await read("public/assets/app.js");
  const shellCss = await read("public/assets/globe-shell.css");
  assert.match(source, /function installSharedGlobePinch\(view, lifecycle\)/);
  assert.match(source, /const supportsNativeTouchEvents = "ontouchstart" in window/);
  assert.match(source, /touchstart[\s\S]*event\.touches\.length < 2[\s\S]*passive: false/);
  assert.match(source, /touchmove[\s\S]*applyPinch\(nativeTouchMetrics\(event\.touches\), nativePinch\)[\s\S]*passive: false/);
  assert.match(source, /touchend[\s\S]*touchcancel/);
  assert.match(source, /const touchPointers = new Map\(\)/);
  assert.match(source, /supportsNativeTouchEvents \|\| event\.pointerType !== "touch"/);
  assert.match(source, /if \(touchPointers\.size < 2\) return/);
  assert.match(source, /Math\.pow\(Math\.max\(0\.2, gesture\.distance \/ baseline\.distance\), 0\.9\)/);
  assert.match(source, /lifecycle\.setMapView\(\{[\s\S]*scale: nextScale,[\s\S]*rotate:/);
  assert.match(source, /pointermove[\s\S]*capture: true, passive: false/);
  assert.match(source, /installSharedGlobePinch\(view, lifecycle\);[\s\S]*loadedViews\.set\(category, lifecycle\)/);
  assert.match(shellCss, /\.market-globe\.is-pinching/);
});

test("native two-touch movement changes the shared globe scale", async () => {
  const source = await read("public/assets/app.js");
  const start = source.indexOf("function installSharedGlobePinch");
  const end = source.indexOf("\nfunction setLoadingError", start);
  assert.ok(start >= 0 && end > start, "shared pinch implementation is extractable");

  const listeners = new Map();
  const classes = new Set();
  const globe = {
    dataset: {},
    classList: {
      add: (...names) => names.forEach(name => classes.add(name)),
      remove: (...names) => names.forEach(name => classes.delete(name)),
    },
    addEventListener(type, listener, options) {
      listeners.set(type, { listener, options });
    },
  };
  const mapView = { rotate: [10, -20, 0], scale: 300 };
  const appliedViews = [];
  const lifecycle = {
    getMapView: () => ({ rotate: [...mapView.rotate], scale: mapView.scale }),
    setMapView(nextView) {
      appliedViews.push(nextView);
      mapView.rotate = [...nextView.rotate];
      mapView.scale = nextView.scale;
    },
  };
  const installer = new Function("window", `${source.slice(start, end)}; return installSharedGlobePinch;`)({ ontouchstart: null });
  installer({ querySelector: () => globe }, lifecycle);

  const touchEvent = touches => {
    const state = { prevented: false, stopped: false };
    return {
      touches,
      state,
      preventDefault: () => { state.prevented = true; },
      stopImmediatePropagation: () => { state.stopped = true; },
    };
  };
  const startEvent = touchEvent([{ clientX: 100, clientY: 200 }, { clientX: 200, clientY: 200 }]);
  listeners.get("touchstart").listener(startEvent);
  const moveEvent = touchEvent([{ clientX: 50, clientY: 200 }, { clientX: 250, clientY: 200 }]);
  listeners.get("touchmove").listener(moveEvent);

  assert.equal(listeners.get("touchmove").options.passive, false);
  assert.equal(startEvent.state.prevented, true);
  assert.equal(moveEvent.state.stopped, true);
  assert.equal(classes.has("is-pinching"), true);
  assert.equal(appliedViews.length, 1);
  assert.ok(appliedViews[0].scale > 500, `expected pinch scale above 500, received ${appliedViews[0].scale}`);
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

test("globe interaction never replaces the normal system cursor", async () => {
  const shell = await read("public/assets/globe-shell.css");
  const sports = await read("public/categories/sports/index.html");
  assert.doesNotMatch(shell, /cursor:\s*zoom-in/);
  assert.doesNotMatch(sports, /cursor:\s*grab(?:bing)?/);
});

test("all desktop map detail panels scroll within the shared shell", async () => {
  const shell = await read("public/assets/globe-shell.css");
  assert.match(shell, /:is\(#market-atlas-sports, \.politics-app, \.weather-app, \.business-app\)\.market-globe-shell \.market-detail-panel \{[\s\S]*max-height: min\(570px, calc\(100dvh - 220px\)\);[\s\S]*overflow-x: hidden;[\s\S]*overflow-y: auto;[\s\S]*overscroll-behavior: contain;/);
  assert.doesNotMatch(shell, /#market-atlas-sports\.market-globe-shell \.market-detail-panel \{[\s\S]*overflow: visible;/);
});

test("selecting a new event resets every market detail scroller", async () => {
  const [sports, politics, weather] = await Promise.all([
    read("public/categories/sports/index.html"),
    read("public/categories/politics/app.js"),
    read("public/categories/weather/app.js")
  ]);
  assert.match(sports, /if \(eventChanged\) \{[\s\S]*detail\.scrollTop = 0;[\s\S]*gameDetailView\.scrollTop = 0;/);
  assert.match(sports, /mobileMarketList\.innerHTML = ranked\.map[\s\S]*mobileMarketList\.scrollTop = 0;[\s\S]*mobileMarketList\.scrollLeft = 0;/);
  assert.match(politics, /function resetDetailScroll\(bundle\)[\s\S]*detailPanel\.scrollTop = 0;[\s\S]*detailMarketList\.scrollTop = 0;[\s\S]*detailMarketList\.scrollLeft = 0;/);
  assert.match(weather, /function resetDetailScroll\(bundle\)[\s\S]*detailPanel\.scrollTop = 0;[\s\S]*detailList\.scrollTop = 0;[\s\S]*detailList\.scrollLeft = 0;/);
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
  assert.match(css, /\[data-category-view="sports"\] #market-atlas-sports \.sports-globe \{[\s\S]*height: 100% !important;[\s\S]*max-height: none !important/);
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

test("desktop Sports clusters load every underlying market into the scrollable detail panel", async () => {
  const sports = await read("public/categories/sports/index.html");
  const css = await read("public/assets/app.css");
  assert.match(sports, /if \(!mobileMarketViewport\(\)\) \{[\s\S]*showClusterDetail\(events\);[\s\S]*group\.classList\.add\("is-selected"\);[\s\S]*hideTooltip\(true\);/);
  assert.match(sports, /function showClusterDetail\(events\) \{[\s\S]*sportsMobileMarketCard\(event, true\)[\s\S]*detail\.classList\.add\("is-cluster-detail"\);[\s\S]*wireSportsMarketCards\(\);/);
  assert.match(sports, /event-cluster\.is-selected \.marker-halo/);
  assert.match(css, /@media \(min-width: 701px\) \{[\s\S]*\.sports-detail-market-list \{[\s\S]*display: grid;[\s\S]*gap: 10px/);
});

test("desktop team futures and player props escape the scrollable detail card as full overlays", async () => {
  const sports = await read("public/categories/sports/index.html");
  assert.match(sports, /root\.append\(teamMarketWindow, tennisMarketWindow\);/);
  assert.match(sports, /function positionFloatingMarketWindow\(panel\) \{[\s\S]*panel\.style\.position = "fixed";[\s\S]*panel\.style\.overflowY = "auto";[\s\S]*panel\.style\.zIndex = "120";/);
  assert.match(sports, /teamMarketWindow\.hidden = false;[\s\S]{0,240}positionFloatingMarketWindow\(teamMarketWindow\);/);
  assert.match(sports, /tennisMarketWindow\.hidden = false;[\s\S]{0,240}positionFloatingMarketWindow\(tennisMarketWindow\);/);
  assert.match(sports, /const detailTop = detailRect\.top - rootRect\.top/);
});

test("mobile team markets are bounded swipe-dismissible sheets with scrolling rows", async () => {
  const sports = await read("public/categories/sports/index.html");
  const shellCss = await read("public/assets/app.css");
  assert.match(sports, /class="mobile-team-sheet-handle"/);
  assert.match(sports, /function installSwipeDownDismiss\(panel, dismiss\)/);
  assert.match(sports, /document\.body\.classList\.toggle\("sports-market-sheet-open"/);
  assert.match(sports, /touchmove[\s\S]*--market-sheet-drag[\s\S]*event\.preventDefault/);
  assert.match(sports, /distance > 96[\s\S]*is-swipe-closing[\s\S]*setTimeout\(dismiss, 190\)/);
  assert.match(sports, /@media \(max-width: 720px\)[\s\S]*\.team-market-window,[\s\S]*right: 6px;[\s\S]*bottom: calc\(var\(--market-sheet-bottom, 0px\) \+ 6px\);[\s\S]*left: 6px;[\s\S]*width: auto;[\s\S]*height: min\(50dvh, 30rem\);[\s\S]*overflow: hidden;[\s\S]*border-radius: 17px !important/);
  assert.match(sports, /border: 1px solid color-mix\(in srgb, var\(--integration-green\) 24%, var\(--integration-border\)\)/);
  assert.match(sports, /const detailTop = detail\.getBoundingClientRect\(\)\.top;[\s\S]*--market-sheet-bottom[\s\S]*viewportHeight - detailTop/);
  assert.match(sports, /closeTeamMarkets\(\) \{[\s\S]*hideTeamFutures\(\);[\s\S]*hideTennisMarkets\(\)/);
  const app = await read("public/assets/app.js");
  assert.match(app, /search\.addEventListener\("input"[\s\S]*closeTeamMarkets/);
  assert.match(app, /closeTeamMarkets\(\) \{[\s\S]*__marketAtlasOddsBridges[\s\S]*closeTeamMarkets/);
  assert.match(sports, /\.team-market-view:not\(\[hidden\]\),[\s\S]*display: flex;[\s\S]*min-height: 0;[\s\S]*overflow: hidden/);
  assert.match(sports, /\.team-futures-list,[\s\S]*\.team-props-list,[\s\S]*\.tennis-matches-list[\s\S]*overflow-y: auto;[\s\S]*-webkit-overflow-scrolling: touch/);
  assert.match(shellCss, /@media \(max-width: 700px\)[\s\S]*\.category-view\.is-active \{\s*transform: none;/);
  assert.match(shellCss, /body\.sports-market-sheet-open \.integration-stage \{[\s\S]*z-index: 200;[\s\S]*overflow: visible/);
});

test("Sports maps exact Copa do Brasil markets and the AFCON future across all host countries", async () => {
  const sports = await read("public/categories/sports/index.html");
  assert.equal((sports.match(/id: "copa-do-brasil-\d+"/g) || []).length, 9, "all currently posted Copa do Brasil events are mapped");
  assert.match(sports, /KXCOPADOBRASILGAME-26AUG03CAPVIT/);
  assert.equal((sports.match(/KXCOPADOBRASILADVANCE-26AUG0[456][A-Z]+/g) || []).length, 16, "eight exact advance tickers are retained on both event fields");
  assert.match(sports, /event\.marketKind === "advance"[\s\S]*Kalshi to advance · last trade/);
  assert.match(sports, /eventTicker: "KXAFCON-27", seriesTicker: "KXAFCON", expectedEventTicker: "KXAFCON-27"/);
  assert.match(sports, /\["nairobi", "Nairobi, Kenya", -1\.286389, 36\.817223\]/);
  assert.match(sports, /\["kampala", "Kampala, Uganda", 0\.347596, 32\.58252\]/);
  assert.match(sports, /\["dar-es-salaam", "Dar es Salaam, Tanzania", -6\.792354, 39\.208328\]/);
  assert.match(sports, /"SOCCER-GROUP": \[[^\]]*"COPADOBRASIL", "AFCON"\]/);
});

test("Sports embeds the complete MLS calendar and resolves its cached Kalshi game series", async () => {
  const sports = await read("public/categories/sports/index.html");
  const scheduleMatch = sports.match(/<script id="market-atlas-americas-soccer-schedule-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(scheduleMatch, "Americas soccer schedule data should be embedded");
  const schedules = JSON.parse(scheduleMatch[1]);
  assert.equal(schedules.MLS.series, "KXMLSGAME");
  assert.equal(schedules.MLS.events.length, 510);
  assert.ok(schedules.MLS.events.every(event => Number.isFinite(event.lat) && Number.isFinite(event.lon)));
  assert.match(sports, /"SOCCER-GROUP": \[[^\]]*"MLS", "COPADOBRASIL"/);
  assert.match(sports, /MLS: "MLS"/);
});

test("Politics markers match the Sports dark-core construction and retain count badges", async () => {
  const css = await read("public/assets/app.css");
  assert.match(css, /\.politics-app \.event-marker \.marker-core[\s\S]*--politics-party-fill[\s\S]*--politics-party-reveal[\s\S]*stroke-width: 2/);
  assert.match(css, /\.event-marker\.leader-dem \.marker-core[\s\S]*stroke: var\(--dem-blue-soft\)/);
  assert.match(css, /\.event-marker\.leader-rep \.marker-core[\s\S]*stroke: var\(--rep-red-soft\)/);
  assert.match(css, /\.politics-app \.event-marker \.market-count[\s\S]*fill: var\(--shared-globe-background\)/);
});

test("every visible Business marker carries a spaced collision-aware company label", async () => {
  const source = await read("public/categories/weather/app.js");
  const css = await read("public/categories/business/styles.css");
  assert.match(source, /namedMarkerLabels = app\.classList\.contains\("business-app"\)/);
  assert.match(source, /nameLabel = appendSvg\(group, "text", "marker-name-label"\)/);
  assert.match(source, /businessLabelCandidates[\s\S]*const gap = 5;[\s\S]*makeBox\("right"[\s\S]*makeBox\("left"/);
  assert.match(source, /boxesOverlap\(box, other\.labelBox\)[\s\S]*boxTouchesMarker/);
  assert.match(source, /businessFullDetail = namedMarkerLabels && currentScale >= 700/);
  assert.match(source, /if \(collision && !businessFullDetail/);
  assert.match(source, /isFrontHemisphere\(node\.distance\)/);
  assert.match(source, /markerIntersectsViewport\(node\.point, node\.radius \+ 5, WIDTH, HEIGHT\)/);
  assert.doesNotMatch(source, /lastBusinessPlacedIds|BUSINESS_HORIZON_BUFFER|horizonLimit|preserveZoomedMarkers/);
  assert.match(source, /businessLabelPlacement\(node, x, y, accepted, true\)/);
  assert.match(source, /const opacity = 1;/);
  assert.doesNotMatch(source, /horizonRoom \/ \.08/);
  assert.match(source, /nameLabel\.style\.textAnchor = placement\.anchor/);
  assert.match(source, /if \(namedMarkerLabels\) return;/);
  assert.match(css, /\.business-app \.event-marker \.marker-name-label[\s\S]*font-size:7\.25px[\s\S]*paint-order:stroke/);
});

test("all four globes share deterministic zoom, pan, edge, and diagnostic rules", async () => {
  const [shared, shell, sports, politics, weather] = await Promise.all([
    read("public/assets/globe-interaction.js"),
    read("public/assets/app.js"),
    read("public/categories/sports/index.html"),
    read("public/categories/politics/app.js"),
    read("public/categories/weather/app.js"),
  ]);
  const runtime = await import(new URL("../public/assets/globe-interaction.js", import.meta.url));
  assert.equal(runtime.markerIntersectsViewport([-8, 8], 9, 620, 560), true);
  assert.equal(runtime.markerIntersectsViewport([-10, 8], 9, 620, 560), false);
  assert.equal(runtime.isFrontHemisphere(Math.PI / 2), true);
  assert.equal(runtime.isFrontHemisphere(Math.PI / 2 + 0.01), false);
  assert.ok(runtime.globeZoomMultiplier(235) <= 1.3);
  assert.ok(runtime.globeZoomMultiplier(1500) <= 1.2);
  const clusters = runtime.stableDistanceClusters([
    { id: "b", anchorX: 10, anchorY: 0 },
    { id: "a", anchorX: 0, anchorY: 0 },
    { id: "c", anchorX: 100, anchorY: 0 },
  ], 20);
  assert.deepEqual(clusters.map(cluster => cluster.members.map(member => member.id)), [["a", "b"], ["c"]]);
  for (const source of [sports, politics, weather]) {
    assert.match(source, /from "\/assets\/globe-interaction\.js"/);
    assert.match(source, /globePanSensitivity\(projection\.scale\(\)\)/);
    assert.match(source, /globeZoomMultiplier\(projection\.scale\(\)\)/);
    assert.match(source, /publishGlobeDiagnostics/);
  }
  assert.match(sports, /stableDistanceClusters\(edgeSafePoints, distanceThreshold\)/);
  assert.doesNotMatch(sports, /const edgeInset =/);
  assert.doesNotMatch(politics, /viewportEdgeOpacity|edgeRoom > 0\.015|horizonOpacity/);
  assert.doesNotMatch(weather, /BUSINESS_HORIZON_BUFFER|lastBusinessPlacedIds/);
  assert.match(shell, /new URL\("\/assets\/globe-interaction\.js", window\.location\.origin\)\.href/);
  assert.match(shared, /preferredZoomAnchor[\s\S]*stableDistanceClusters[\s\S]*publishGlobeDiagnostics[\s\S]*data-globe-diagnostics-/);
});

test("Business consolidates dense corporate cities into searchable metro clusters", async () => {
  const source = await read("public/categories/weather/app.js");
  for (const id of ["new-york", "bay-area", "los-angeles", "chicago", "washington", "miami", "boston", "dallas-fort-worth"]) {
    assert.match(source, new RegExp(`business-metro-${id}`));
  }
  assert.match(source, /function clusterBusinessMetros\(bundles\)/);
  assert.match(source, /geoDistance\(\[metro\.lon, metro\.lat\][\s\S]*\* 6371 <= metro\.radiusKm/);
  assert.match(source, /memberIds: members\.map\(bundle => bundle\.id\)/);
  assert.match(source, /members\.length < Number\(metro\.minMembers \|\| 2\)/);
  assert.match(source, /bundle\.id === searchSelectedId \|\| bundle\.memberIds\?\.includes\(searchSelectedId\)/);
  assert.match(source, /item\.id === result\?\.bundleId \|\| item\.memberIds\?\.includes\(result\?\.bundleId\)/);
});

test("mobile filter and calendar values share one aligned inner column", async () => {
  const css = await read("public/assets/app.css");
  assert.match(css, /\.category-view \.mobile-filter-dropdown \{[\s\S]*border: 1px solid color-mix\(in srgb, var\(--integration-green\) 24%, var\(--integration-border\)\) !important;/);
  assert.match(css, /\.mobile-calendar-toggle \{[\s\S]*border: 1px solid color-mix\(in srgb, var\(--integration-green\) 24%, var\(--integration-border\)\);/);
  assert.match(css, /\.mobile-filter-toggle \{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\) 12px;[\s\S]*padding: 0 11px;/);
  assert.match(css, /\.mobile-filter-summary \{[\s\S]*justify-content: flex-end;[\s\S]*height: 18px;[\s\S]*line-height: 18px;/);
  assert.match(css, /\.mobile-calendar-toggle \{[\s\S]*grid-template-columns: 15px minmax\(0, 1fr\) 12px;[\s\S]*gap: 8px;[\s\S]*padding: 0 11px;/);
  assert.match(css, /\.mobile-calendar-value \{[\s\S]*justify-content: flex-end;[\s\S]*height: 18px;[\s\S]*line-height: 18px;[\s\S]*text-align: right;/);
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
