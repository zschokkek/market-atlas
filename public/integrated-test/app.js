const shell = document.querySelector(".integration-shell");
const search = document.querySelector(".integration-search input");
const categoryTabs = [...document.querySelectorAll(".integration-tab[data-category]")];
const categoryViews = new Map(
  [...document.querySelectorAll("[data-category-view]")].map(view => [view.dataset.categoryView, view])
);

const viewLoaders = {
  sports: loadSportsView,
  politics: loadPoliticsView
};
const loadedViews = new Map();
const loadingViews = new Map();
let activeCategory = null;
let sharedMapView = null;

const sportsClient = createSportsDataClient();

function sourceDocument(html) {
  return new DOMParser().parseFromString(html, "text/html");
}

async function fetchText(path) {
  const response = await fetch(path, { headers: { Accept: "text/html, text/css;q=0.9, */*;q=0.1" } });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.text();
}

function appendStyle(id, text) {
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = text;
  document.head.appendChild(style);
}

function setLoadingError(view, error) {
  const loading = view.querySelector(".category-loading");
  if (!loading) return;
  loading.classList.add("is-error");
  const message = loading.querySelector("span:last-child");
  if (message) message.textContent = `Unable to load this globe · ${error.message}`;
}

async function importSource(source, replacements = []) {
  let moduleSource = source;
  replacements.forEach(([pattern, replacement]) => {
    moduleSource = moduleSource.replace(pattern, replacement);
  });
  const url = URL.createObjectURL(new Blob([moduleSource], { type: "text/javascript" }));
  try {
    await import(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadSportsView(view) {
  const html = await fetchText("/");
  const documentSource = sourceDocument(html);
  const root = documentSource.querySelector("#global-sports-clean-detail-20260801");
  const moduleScript = [...documentSource.querySelectorAll('script[type="module"]:not([src])')]
    .find(script => script.textContent.includes("geoOrthographic"));
  if (!root || !moduleScript) throw new Error("The Sports view contract could not be found");

  const sourceStyles = [...documentSource.querySelectorAll("style")].map(style => style.textContent).join("\n");
  appendStyle("integrated-sports-source-styles", sourceStyles);

  [...documentSource.querySelectorAll('script[type="application/json"][id]')].forEach(sourceScript => {
    if (document.getElementById(sourceScript.id)) return;
    const dataScript = document.createElement("script");
    dataScript.id = sourceScript.id;
    dataScript.type = "application/json";
    dataScript.textContent = sourceScript.textContent;
    view.appendChild(dataScript);
  });

  root.querySelector(".sports-app-header")?.remove();
  view.appendChild(document.importNode(root, true));
  const integratedSportsSource = moduleScript.textContent.replace(
    '    getActiveDate: () => calendarDates[activeDateIndex],',
    `    getActiveDate: () => calendarDates[activeDateIndex],
    getMapView: () => ({ rotate: [...projection.rotate()], scale: projection.scale() }),
    setMapView(view) {
      if (!view || !Array.isArray(view.rotate)) return;
      if (viewFrame) cancelAnimationFrame(viewFrame);
      if (zoomFrame) cancelAnimationFrame(zoomFrame);
      viewFrame = null;
      zoomFrame = null;
      const scale = Math.max(170, Math.min(4200, Number(view.scale) || projection.scale()));
      projection.rotate(view.rotate.slice(0, 3));
      projection.scale(scale);
      zoomTarget = scale;
      draw();
    },`
  );
  await importSource(integratedSportsSource);
  view.classList.add("is-ready");
  return {
    activate() {
      sportsClient.activate();
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    },
    deactivate() {
      sportsClient.deactivate();
      closeTransientUi(view);
    },
    getMapView() {
      return sportsClient.getMapView();
    },
    setMapView(mapView) {
      sportsClient.setMapView(mapView);
    }
  };
}

async function loadPoliticsView(view) {
  const [html, css, source] = await Promise.all([
    fetchText("/politics-test/"),
    fetchText("/politics-test/styles.css"),
    fetchText("/politics-test/app.js")
  ]);
  const documentSource = sourceDocument(html);
  const app = documentSource.querySelector(".politics-app");
  if (!app) throw new Error("The Politics view contract could not be found");

  app.querySelector(".app-header")?.remove();
  app.querySelector(".prototype-strip")?.remove();
  appendStyle("integrated-politics-source-styles", `@scope (.politics-app) {\n${css}\n}`);
  view.appendChild(document.importNode(app, true));

  const politicsDataUrl = new URL("/politics-test/data.js", window.location.origin).href;
  const lifecycleSource = source
    .replace(
      'import { majorWorldCapitals, stateCapitals } from "./data.js";',
      `import { majorWorldCapitals, stateCapitals } from ${JSON.stringify(politicsDataUrl)};`
    )
    .replace(
      '    setTimeout(() => void loadPoliticsFeed(), 5000);',
      '    if (integratedActive) { clearTimeout(integratedRetryTimer); integratedRetryTimer = setTimeout(() => void loadPoliticsFeed(), 5000); }'
    )
    .replace(
      'window.addEventListener("resize", () => {\n  hideTooltip();\n  scheduleDraw();\n});',
      'window.addEventListener("resize", () => {\n  if (!integratedActive) return;\n  hideTooltip();\n  scheduleDraw();\n});'
    )
    .replace(
      '  group.dataset.id = bundle.id;',
      `  const leaderPrice = Math.max(50, Math.min(100, Number(bundle.leaderPrice) || 50));
  const partyFillStrength = 32 + ((leaderPrice - 50) / 50) * 48;
  group.style.setProperty("--party-fill-strength", partyFillStrength.toFixed(1) + "%");
  group.dataset.id = bundle.id;`
    )
    .replace(
      'function draw() {\n  const spherePath = path(sphere);',
      `function draw() {
  const zoomProgress = Math.max(0, Math.min(1, (projection.scale() - 300) / (700 - 300)));
  const mapBlend = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
  const partyZoomProgress = Math.max(0, Math.min(1, (projection.scale() - 380) / (950 - 380)));
  const partyReveal = partyZoomProgress * partyZoomProgress * (3 - 2 * partyZoomProgress);
  app.style.setProperty("--map-ocean-opacity", String(1 - mapBlend));
  app.style.setProperty("--map-rim-opacity", String(1 - mapBlend));
  app.style.setProperty("--map-grid-opacity", String(1 - mapBlend * 0.28));
  app.style.setProperty("--politics-party-reveal", (partyReveal * 100).toFixed(1) + "%");
  const spherePath = path(sphere);`
    )
    .replace(
      /renderTimelineStops\(\);\nrenderTimeline\(\);\nvoid loadPoliticsFeed\(\);\nsetInterval\([\s\S]*$/,
      `let integratedActive = false;
let integratedTimer = null;
let integratedRetryTimer = null;

renderTimelineStops();
renderTimeline();

window.__integratedPoliticsView = {
  activate() {
    integratedActive = true;
    clearInterval(integratedTimer);
    clearTimeout(integratedRetryTimer);
    scheduleDraw();
    void loadPoliticsFeed();
    integratedTimer = setInterval(() => {
      if (integratedActive && !document.hidden) void loadPoliticsFeed();
    }, 60_000);
  },
  deactivate() {
    integratedActive = false;
    clearInterval(integratedTimer);
    clearTimeout(integratedRetryTimer);
    if (drawFrame) cancelAnimationFrame(drawFrame);
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
    drawFrame = null;
    zoomFrame = null;
    hideTooltip();
  },
  getMapView() {
    return { rotate: [...projection.rotate()], scale: projection.scale() };
  },
  setMapView(view) {
    if (!view || !Array.isArray(view.rotate)) return;
    if (drawFrame) cancelAnimationFrame(drawFrame);
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
    drawFrame = null;
    zoomFrame = null;
    const scale = Math.max(170, Math.min(4200, Number(view.scale) || projection.scale()));
    projection.rotate(view.rotate.slice(0, 3));
    projection.scale(scale);
    hideTooltip();
    draw();
  }
};`
    );

  await importSource(lifecycleSource);
  const lifecycle = window.__integratedPoliticsView;
  if (!lifecycle) throw new Error("Politics lifecycle initialization failed");
  view.classList.add("is-ready");
  return lifecycle;
}

function closeTransientUi(view) {
  view.querySelectorAll(".map-tooltip").forEach(tooltip => {
    tooltip.hidden = true;
  });
  view.querySelectorAll(".team-market-window, .tennis-market-window, .coverage-error-window").forEach(panel => {
    panel.hidden = true;
  });
}

async function ensureView(category) {
  if (loadedViews.has(category)) return loadedViews.get(category);
  if (loadingViews.has(category)) return loadingViews.get(category);
  const view = categoryViews.get(category);
  const loader = viewLoaders[category];
  if (!view || !loader) throw new Error(`Unknown category: ${category}`);
  const loading = loader(view)
    .then(lifecycle => {
      loadedViews.set(category, lifecycle);
      loadingViews.delete(category);
      return lifecycle;
    })
    .catch(error => {
      loadingViews.delete(category);
      setLoadingError(view, error);
      console.error(`Failed to load ${category}`, error);
      throw error;
    });
  loadingViews.set(category, loading);
  return loading;
}

function updateShell(category) {
  shell.dataset.activeCategory = category;
  categoryTabs.forEach(tab => {
    const selected = tab.dataset.category === category;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });
  categoryViews.forEach((view, viewCategory) => {
    const selected = viewCategory === category;
    view.classList.toggle("is-active", selected);
    view.setAttribute("aria-hidden", String(!selected));
    view.inert = !selected;
  });
  const politics = category === "politics";
  search.placeholder = politics ? "Search politics markets" : "Search sports markets";
  search.setAttribute("aria-label", politics ? "Search elections, states, and countries" : "Search markets, teams, and cities");
  document.title = politics ? "Politics Markets Globe · Integrated Preview" : "Sports Markets Globe · Integrated Preview";
}

async function activateCategory(category, { historyMode = "push" } = {}) {
  if (!viewLoaders[category]) category = "sports";
  if (category === activeCategory && loadedViews.has(category)) return;

  const previousCategory = activeCategory;
  const previousLifecycle = previousCategory ? loadedViews.get(previousCategory) : null;
  const departingMapView = previousLifecycle?.getMapView?.();
  if (departingMapView) sharedMapView = departingMapView;
  activeCategory = category;
  updateShell(category);
  previousLifecycle?.deactivate?.();

  if (historyMode !== "none") {
    const url = new URL(window.location.href);
    url.searchParams.set("category", category);
    history[historyMode === "replace" ? "replaceState" : "pushState"]({ category }, "", url);
  }

  try {
    const lifecycle = await ensureView(category);
    if (activeCategory === category) {
      if (sharedMapView) lifecycle.setMapView?.(sharedMapView);
      lifecycle.activate?.();
    }
  } catch {
    // The in-view error message remains visible and the other tab stays usable.
  }
}

categoryTabs.forEach(tab => {
  tab.addEventListener("click", () => void activateCategory(tab.dataset.category));
  tab.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = categoryTabs.indexOf(tab);
    const next = event.key === "Home" ? 0
      : event.key === "End" ? categoryTabs.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + categoryTabs.length) % categoryTabs.length;
    categoryTabs[next].focus();
    void activateCategory(categoryTabs[next].dataset.category);
  });
});

window.addEventListener("popstate", event => {
  const category = event.state?.category || new URL(window.location.href).searchParams.get("category") || "sports";
  void activateCategory(category, { historyMode: "none" });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) loadedViews.get(activeCategory)?.deactivate?.();
  else loadedViews.get(activeCategory)?.activate?.();
});

const initialCategory = new URL(window.location.href).searchParams.get("category") === "politics" ? "politics" : "sports";
await activateCategory(initialCategory, { historyMode: "replace" });

const idle = window.requestIdleCallback || (callback => setTimeout(callback, 700));
idle(() => {
  const nextCategory = initialCategory === "sports" ? "politics" : "sports";
  void ensureView(nextCategory).catch(() => {});
}, { timeout: 1600 });

function createSportsDataClient() {
  const POLL_INTERVAL_MS = 30_000;
  let timer = null;
  let controller = null;
  let futuresController = null;
  let active = false;
  let lastDate = "";
  let lastFetchedAt = 0;
  const futuresCache = new Map();

  function bridge() {
    return window.__sportsGlobeOddsBridges?.["global-sports-clean-detail-20260801"] || null;
  }

  function validTeamPayload(sport, teamCode, payload) {
    if (![2, 3].includes(payload?.schemaVersion) || payload?.sport !== sport || payload?.teamCode !== teamCode) return false;
    const cards = Array.isArray(payload.cards) ? payload.cards : Object.values(payload.futures || {});
    return cards.every(card => !card || (card.teamCode === teamCode && card.sport === sport));
  }

  async function refresh() {
    const oddsBridge = bridge();
    if (!active || !oddsBridge) return "inactive";
    const date = oddsBridge.getActiveDate();
    controller?.abort();
    controller = new AbortController();
    try {
      const response = await fetch(`/api/odds?date=${encodeURIComponent(date)}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const warming = response.status === 503 && payload.warming;
        oddsBridge.apply({ events: [], oddsStatus: warming ? "warming" : "unavailable", cache: payload.cache || null });
        return warming ? "warming" : "unavailable";
      }
      oddsBridge.apply({ ...payload, oddsStatus: payload.cache?.updating ? "warming" : "ready" });
      lastDate = date;
      lastFetchedAt = Date.now();
      return payload.cache?.updating ? "warming" : "ready";
    } catch (error) {
      if (error.name !== "AbortError") {
        oddsBridge.apply({ events: [], oddsStatus: "unavailable" });
        console.warn("Cached sports odds refresh failed", error);
      }
      return error.name === "AbortError" ? "aborted" : "unavailable";
    }
  }

  function schedule(delay = POLL_INTERVAL_MS) {
    clearTimeout(timer);
    if (!active) return;
    timer = setTimeout(async () => {
      const status = await refresh();
      schedule(status === "warming" ? 2000 : POLL_INTERVAL_MS);
    }, delay);
  }

  document.querySelector('[data-category-view="sports"]').addEventListener("sports-globe:date", event => {
    if (!active || event.detail?.date === lastDate) return;
    void refresh();
  });

  document.querySelector('[data-category-view="sports"]').addEventListener("sports-globe:team", async event => {
    if (!active) return;
    const sport = String(event.detail?.sport || "").toUpperCase();
    const teamCode = String(event.detail?.teamCode || "").toUpperCase();
    const teamName = String(event.detail?.teamName || "");
    const eventTicker = String(event.detail?.eventTicker || "").toUpperCase();
    const oddsBridge = bridge();
    if (!sport || !teamCode || !oddsBridge?.applyTeamFutures) return;
    const cacheKey = `${sport}:${teamCode}:${eventTicker}`;
    const cached = futuresCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      oddsBridge.applyTeamFutures(sport, teamCode, cached.payload);
      return;
    }
    futuresController?.abort();
    futuresController = new AbortController();
    try {
      const query = new URLSearchParams({ sport, team: teamCode, name: teamName, event: eventTicker });
      let response;
      let payload = {};
      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await fetch(`/api/team-markets?${query}`, {
          headers: { Accept: "application/json" },
          signal: futuresController.signal
        });
        payload = await response.json().catch(() => ({}));
        if (response.status !== 503 || !/cache is warming/i.test(payload.error || "") || attempt === 3) break;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      if (!response.ok && !validTeamPayload(sport, teamCode, payload)) throw new Error(payload.error || "Team markets are temporarily unavailable.");
      if (!validTeamPayload(sport, teamCode, payload)) throw new Error("The cached markets did not match the selected team.");
      futuresCache.set(cacheKey, { payload, fetchedAt: Date.now() });
      oddsBridge.applyTeamFutures(sport, teamCode, payload);
    } catch (error) {
      if (error.name !== "AbortError") oddsBridge.applyTeamFutures(sport, teamCode, { error: error.message });
    }
  });

  return {
    activate() {
      active = true;
      const stale = Date.now() - lastFetchedAt > 15_000;
      if (stale) void refresh();
      schedule();
    },
    deactivate() {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      futuresController?.abort();
    },
    getMapView() {
      return bridge()?.getMapView?.() || null;
    },
    setMapView(mapView) {
      bridge()?.setMapView?.(mapView);
    }
  };
}
