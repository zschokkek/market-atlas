const shell = document.querySelector(".integration-shell");
const search = document.querySelector(".integration-search input");
const categoryTabs = [...document.querySelectorAll(".integration-tab[data-category]")];
const categoryViews = new Map(
  [...document.querySelectorAll("[data-category-view]")].map(view => [view.dataset.categoryView, view])
);

const viewLoaders = {
  sports: loadSportsView,
  politics: loadPoliticsView,
  weather: loadWeatherView
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

function installMobileFilterDropdown(view, { label, allLabel }) {
  const panel = view.querySelector(".filter-sidebar");
  if (!panel || panel.classList.contains("mobile-filter-dropdown")) return;

  const content = document.createElement("div");
  content.className = "mobile-filter-content";
  while (panel.firstChild) content.appendChild(panel.firstChild);

  const button = document.createElement("button");
  const contentId = `mobile-filter-${view.dataset.categoryView}`;
  button.className = "mobile-filter-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", contentId);
  button.innerHTML = `<span class="mobile-filter-label">${label}</span><span class="mobile-filter-summary"></span><span class="mobile-filter-chevron" aria-hidden="true"></span>`;
  content.id = contentId;
  panel.classList.add("mobile-filter-dropdown");
  panel.append(button, content);

  const inputs = [...content.querySelectorAll('input[type="checkbox"]')];
  const summary = button.querySelector(".mobile-filter-summary");
  const updateSummary = () => {
    const checked = inputs.filter(input => input.checked);
    const allChecked = checked.length === inputs.length || checked.some(input => input.dataset.sport === "ALL");
    summary.textContent = allChecked ? allLabel : `${checked.length} selected`;
  };
  const close = () => {
    panel.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", () => {
    const open = !panel.classList.contains("is-open");
    panel.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
  });
  panel.addEventListener("change", updateSummary);
  panel.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    close();
    button.focus();
  });
  panel._closeMobileDropdown = close;
  updateSummary();
}

function installMobileCalendarDropdown(view, lifecycle, { label }) {
  if (!lifecycle || view.querySelector(".mobile-calendar-picker")) return;

  const picker = document.createElement("div");
  picker.className = "mobile-calendar-picker";
  const menuId = `mobile-calendar-${view.dataset.categoryView}`;
  const sheetId = `${menuId}-sheet`;
  picker.innerHTML = `
    <button class="mobile-calendar-toggle" type="button" aria-label="${label}" aria-expanded="false" aria-controls="${sheetId}">
      <span class="mobile-calendar-icon" aria-hidden="true"></span>
      <span class="mobile-calendar-value"></span>
      <span class="mobile-calendar-chevron" aria-hidden="true"></span>
    </button>
    <div class="mobile-calendar-backdrop" hidden></div>
    <section class="mobile-calendar-sheet" id="${sheetId}" role="dialog" aria-modal="true" aria-label="${label}" hidden>
      <span class="mobile-calendar-handle" aria-hidden="true"></span>
      <header class="mobile-calendar-sheet-header">
        <strong>${label}</strong>
        <button class="mobile-calendar-done" type="button">Done</button>
      </header>
      <div class="mobile-calendar-menu" id="${menuId}" role="listbox" aria-label="${label}"></div>
    </section>`;
  view.appendChild(picker);

  const toggle = picker.querySelector(".mobile-calendar-toggle");
  const value = picker.querySelector(".mobile-calendar-value");
  const backdrop = picker.querySelector(".mobile-calendar-backdrop");
  const sheet = picker.querySelector(".mobile-calendar-sheet");
  const done = picker.querySelector(".mobile-calendar-done");
  const menu = picker.querySelector(".mobile-calendar-menu");
  const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "2-digit" });
  const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const optionLabel = option => {
    if (option.date) {
      const date = new Date(`${option.date}T12:00:00Z`);
      if (!Number.isNaN(date.getTime())) return dateFormatter.format(date);
    }
    return option.short || option.label || option.date || String(option.value ?? "");
  };
  const sync = () => {
    const options = lifecycle.getTimelineOptions?.() || [];
    const selectedValue = String(lifecycle.getTimelineIndex?.() ?? 0);
    const signature = JSON.stringify(options.map(option => [String(option.value), optionLabel(option)]));
    if (menu.dataset.signature !== signature) {
      const children = [];
      let previousMonth = "";
      options.forEach(option => {
        if (option.date) {
          const date = new Date(`${option.date}T12:00:00Z`);
          const month = Number.isNaN(date.getTime()) ? "" : monthFormatter.format(date);
          if (month && month !== previousMonth) {
            const heading = document.createElement("div");
            heading.className = "mobile-calendar-month";
            heading.textContent = month;
            children.push(heading);
            previousMonth = month;
          }
        }
        const item = document.createElement("button");
        item.className = "mobile-calendar-option";
        item.type = "button";
        item.dataset.value = String(option.value);
        item.setAttribute("role", "option");
        const itemLabel = document.createElement("span");
        itemLabel.textContent = optionLabel(option);
        const check = document.createElement("span");
        check.className = "mobile-calendar-check";
        check.setAttribute("aria-hidden", "true");
        item.append(itemLabel, check);
        children.push(item);
      });
      menu.replaceChildren(...children);
      menu.dataset.signature = signature;
    }
    menu.querySelectorAll(".mobile-calendar-option").forEach(item => {
      const selected = item.dataset.value === selectedValue;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    const selectedOption = options.find(option => String(option.value) === selectedValue) || options[0];
    value.textContent = selectedOption ? optionLabel(selectedOption) : label;
  };

  const close = ({ restoreFocus = false } = {}) => {
    picker.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    sheet.hidden = true;
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener("click", () => {
    sync();
    const open = !picker.classList.contains("is-open");
    if (!open) {
      close();
      return;
    }
    picker.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    sheet.hidden = false;
    requestAnimationFrame(() => menu.querySelector('.mobile-calendar-option[aria-selected="true"]')?.scrollIntoView({ block: "center" }));
  });
  backdrop.addEventListener("click", () => close({ restoreFocus: true }));
  done.addEventListener("click", () => close({ restoreFocus: true }));
  menu.addEventListener("click", event => {
    const item = event.target.closest(".mobile-calendar-option");
    if (!item) return;
    lifecycle.setTimelineIndex?.(Number(item.dataset.value));
    sync();
    close({ restoreFocus: true });
  });
  picker.addEventListener("keydown", event => {
    if (event.key === "Escape") close({ restoreFocus: true });
  });
  document.addEventListener("pointerdown", event => {
    if (!picker.contains(event.target)) close();
  });
  const sourceDock = view.querySelector(".date-dock, .timeline-dock");
  if (sourceDock) {
    new MutationObserver(sync).observe(sourceDock, { childList: true, subtree: true, characterData: true, attributes: true });
  }
  view._syncMobileCalendar = sync;
  view._closeMobileCalendar = close;
  sync();
}

function installMobileMarketCarousel(view) {
  const list = view.querySelector(".detail-market-list");
  if (!list || list.dataset.mobileCarousel === "true") return;
  list.dataset.mobileCarousel = "true";
  list.setAttribute("aria-label", "Markets at this location");

  const navigation = document.createElement("div");
  navigation.className = "mobile-market-carousel-nav";
  navigation.innerHTML = `
    <button class="mobile-market-carousel-step mobile-market-carousel-prev" type="button" aria-label="Previous market">&#8249;</button>
    <span class="mobile-market-carousel-status" aria-live="polite"></span>
    <button class="mobile-market-carousel-step mobile-market-carousel-next" type="button" aria-label="Next market">&#8250;</button>`;
  list.after(navigation);

  const previous = navigation.querySelector(".mobile-market-carousel-prev");
  const next = navigation.querySelector(".mobile-market-carousel-next");
  const status = navigation.querySelector(".mobile-market-carousel-status");
  let activeIndex = 0;
  let scrollFrame = null;
  const cards = () => [...list.children].filter(child => child.classList.contains("market-card"));
  const nearestIndex = items => {
    if (!items.length) return 0;
    const left = list.getBoundingClientRect().left;
    return items.reduce((best, item, index) => (
      Math.abs(item.getBoundingClientRect().left - left) < Math.abs(items[best].getBoundingClientRect().left - left) ? index : best
    ), 0);
  };
  const update = ({ reset = false } = {}) => {
    const items = cards();
    if (reset) {
      activeIndex = 0;
      list.scrollLeft = 0;
    } else {
      activeIndex = nearestIndex(items);
    }
    const count = items.length;
    navigation.hidden = count <= 1;
    status.textContent = count ? `${activeIndex + 1} of ${count}` : "No markets";
    previous.disabled = activeIndex <= 0;
    next.disabled = activeIndex >= count - 1;
    items.forEach((card, index) => card.setAttribute("aria-label", `Market ${index + 1} of ${count}`));
  };
  const move = direction => {
    const items = cards();
    if (!items.length) return;
    activeIndex = Math.max(0, Math.min(items.length - 1, activeIndex + direction));
    list.scrollTo({ left: items[activeIndex].offsetLeft, behavior: "smooth" });
  };

  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  list.addEventListener("scroll", () => {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      update();
    });
  }, { passive: true });
  new MutationObserver(() => update({ reset: true })).observe(list, { childList: true });
  update({ reset: true });
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
  const html = await fetchText("/categories/sports/");
  const documentSource = sourceDocument(html);
  const root = documentSource.querySelector("#market-atlas-sports");
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
  installMobileFilterDropdown(view, { label: "Markets", allLabel: "All sports" });
  const integratedSportsSource = moduleScript.textContent
    .replace('  const center = [310, 270];', '  const center = [310, 280];')
    .replace(
      '    getActiveDate: () => calendarDates[activeDateIndex],',
      `    getActiveDate: () => calendarDates[activeDateIndex],
    getTimelineOptions: () => calendarDates.map((date, index) => ({ value: index, date })),
    getTimelineIndex: () => activeDateIndex,
    setTimelineIndex: index => renderDate(index, { preserveView: true }),
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
  const lifecycle = {
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
    },
    getTimelineOptions() {
      return sportsClient.getTimelineOptions();
    },
    getTimelineIndex() {
      return sportsClient.getTimelineIndex();
    },
    setTimelineIndex(index) {
      sportsClient.setTimelineIndex(index);
    },
    revealLocation(result) {
      return window.__marketAtlasOddsBridges?.["market-atlas-sports"]?.revealLocation?.(result) || false;
    },
    revealMarket(result) {
      return window.__marketAtlasOddsBridges?.["market-atlas-sports"]?.revealMarket?.(result) || false;
    }
  };
  installMobileCalendarDropdown(view, lifecycle, { label: "Schedule date" });
  return lifecycle;
}

async function loadPoliticsView(view) {
  const [html, css, source] = await Promise.all([
    fetchText("/categories/politics/"),
    fetchText("/categories/politics/styles.css"),
    fetchText("/categories/politics/app.js")
  ]);
  const documentSource = sourceDocument(html);
  const app = documentSource.querySelector(".politics-app");
  if (!app) throw new Error("The Politics view contract could not be found");

  app.querySelector(".app-header")?.remove();
  app.querySelector(".prototype-strip")?.remove();
  appendStyle("integrated-politics-source-styles", `@scope (.politics-app) {\n${css}\n}`);
  view.appendChild(document.importNode(app, true));
  installMobileFilterDropdown(view, { label: "Markets", allLabel: "All politics" });
  installMobileMarketCarousel(view);

  const politicsDataUrl = new URL("/categories/politics/data.js", window.location.origin).href;
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
      '    renderTimeline();\n    const note = app.querySelector(".prototype-note");',
      `    renderTimeline();
    if (integratedPendingSearchResult) window.__integratedPoliticsView?.revealMarket?.(integratedPendingSearchResult);
    const note = app.querySelector(".prototype-note");`
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
let integratedPendingSearchResult = null;

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
  },
  getTimelineOptions() {
    return timelineStops.map((stop, index) => ({ value: index, label: stop.label, short: stop.short }));
  },
  getTimelineIndex() {
    return activeTimelineIndex;
  },
  setTimelineIndex(index) {
    activeTimelineIndex = Math.max(0, Math.min(timelineStops.length - 1, Number(index) || 0));
    renderTimeline();
  },
  revealLocation(result) {
    return animateToLocation(result?.lon, result?.lat, result?.scale || 1050, 380);
  },
  revealMarket(result) {
    const bundle = electionBundles.find(item => item.id === result?.bundleId)
      || electionBundles.find(item => item.markets.some(market => market.eventTicker === result?.eventTicker));
    if (!bundle) {
      integratedPendingSearchResult = result;
      return true;
    }
    integratedPendingSearchResult = null;
    selectedBundleId = bundle.id;
    renderDetail(bundle);
    projection.rotate([-bundle.lon, -bundle.lat, 0]);
    projection.scale(Math.max(420, Math.min(900, projection.scale())));
    hideTooltip();
    draw();
    return true;
  }
};`
    );

  await importSource(lifecycleSource);
  const lifecycle = window.__integratedPoliticsView;
  if (!lifecycle) throw new Error("Politics lifecycle initialization failed");
  installMobileCalendarDropdown(view, lifecycle, { label: "Election date" });
  view.classList.add("is-ready");
  return lifecycle;
}

async function loadWeatherView(view) {
  const [html, baseCss, weatherCss, source] = await Promise.all([
    fetchText("/categories/weather/"),
    fetchText("/categories/politics/styles.css"),
    fetchText("/categories/weather/styles.css"),
    fetchText("/categories/weather/app.js")
  ]);
  const documentSource = sourceDocument(html);
  const app = documentSource.querySelector(".weather-app");
  if (!app) throw new Error("The Weather view contract could not be found");

  app.querySelector(".app-header")?.remove();
  app.querySelector(".prototype-strip")?.remove();
  appendStyle("integrated-weather-source-styles", `@scope (.weather-app) {\n${baseCss}\n}\n${weatherCss}`);
  view.appendChild(document.importNode(app, true));
  installMobileFilterDropdown(view, { label: "Markets", allLabel: "All weather" });
  installMobileMarketCarousel(view);

  const weatherDataUrl = new URL("/categories/weather/data.js", window.location.origin).href;
  await importSource(source, [[
    'import { weatherBundles, weatherHorizons } from "./data.js";',
    `import { weatherBundles, weatherHorizons } from ${JSON.stringify(weatherDataUrl)};`
  ]]);
  const lifecycle = window.__integratedWeatherView;
  if (!lifecycle) throw new Error("Weather lifecycle initialization failed");
  installMobileCalendarDropdown(view, lifecycle, { label: "Weather horizon" });
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
  view.querySelectorAll(".mobile-filter-dropdown").forEach(panel => panel._closeMobileDropdown?.());
  view._closeMobileCalendar?.();
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
  const shellCopy = {
    sports: { placeholder: "Try ‘Dodgers tonight’", label: "Search markets, teams, and cities", title: "Market Atlas · Sports" },
    politics: { placeholder: "Try ‘close Senate races’", label: "Search elections, states, and countries", title: "Market Atlas · Politics" },
    weather: { placeholder: "Try ‘rain in New York’", label: "Search weather markets and locations", title: "Market Atlas · Weather" }
  }[category];
  search.placeholder = shellCopy.placeholder;
  search.setAttribute("aria-label", shellCopy.label);
  document.title = shellCopy.title;
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
      categoryViews.get(category)?._syncMobileCalendar?.();
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

shell.addEventListener("market-search:select", event => {
  const result = event.detail?.result;
  if (!result || !viewLoaders[result.category]) return;
  event.preventDefault();
  void activateCategory(result.category).then(() => {
    const lifecycle = loadedViews.get(result.category);
    const handled = result.type === "location" ? lifecycle?.revealLocation?.(result) : lifecycle?.revealMarket?.(result);
    if (!handled && result.type !== "location" && result.url) window.open(result.url, "_blank", "noopener,noreferrer");
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

const requestedCategory = new URL(window.location.href).searchParams.get("category");
const initialCategory = viewLoaders[requestedCategory] ? requestedCategory : "sports";
await activateCategory(initialCategory, { historyMode: "replace" });

const idle = window.requestIdleCallback || (callback => setTimeout(callback, 700));
idle(() => {
  Object.keys(viewLoaders).filter(category => category !== initialCategory).forEach(category => {
    void ensureView(category).catch(() => {});
  });
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
    return window.__marketAtlasOddsBridges?.["market-atlas-sports"] || null;
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

  document.querySelector('[data-category-view="sports"]').addEventListener("market-atlas:date", event => {
    if (!active || event.detail?.date === lastDate) return;
    void refresh();
  });

  document.querySelector('[data-category-view="sports"]').addEventListener("market-atlas:team", async event => {
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
    },
    getTimelineOptions() {
      return bridge()?.getTimelineOptions?.() || [];
    },
    getTimelineIndex() {
      return bridge()?.getTimelineIndex?.() ?? 0;
    },
    setTimelineIndex(index) {
      bridge()?.setTimelineIndex?.(index);
    }
  };
}
