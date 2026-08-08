import { feature, geoDistance, geoGraticule10, geoOrthographic, geoPath, usStates as us, world } from "/assets/map-runtime.js";
import { globePanSensitivity, globeZoomMultiplier, isFrontHemisphere, markerIntersectsViewport, preferredZoomAnchor, publishGlobeDiagnostics } from "/assets/globe-interaction.js";
import { weatherBundles, weatherHorizons } from "./data.js";

const app = document.querySelector(".weather-app");
const svg = app.querySelector(".weather-globe");
const stage = app.querySelector(".globe-stage");
const tooltip = app.querySelector(".map-tooltip");
const markerLayer = app.querySelector(".markers-layer");
const countryLayer = app.querySelector(".countries-layer");
const stateLayer = app.querySelector(".states-layer");
const labelLayer = app.querySelector(".capital-labels-layer");
const detailName = app.querySelector(".detail-jurisdiction");
const detailCode = app.querySelector(".detail-code");
const detailLocation = app.querySelector(".detail-location");
const detailMeta = app.querySelector(".detail-meta");
const detailList = app.querySelector(".detail-market-list");
const detailPanel = app.querySelector(".election-detail");
const mobileDetailClose = app.querySelector(".mobile-market-sheet-close");
const hud = app.querySelector(".hud-summary");
const filterCount = app.querySelector(".filter-summary-number");
const range = app.querySelector(".timeline-range");
const stopsLayer = app.querySelector(".timeline-stops");
const horizonLabel = app.querySelector(".timeline-label");
const activity = app.querySelector(".timeline-activity");
const namedMarkerLabels = app.classList.contains("business-app");

const NS = "http://www.w3.org/2000/svg";
const WIDTH = 620;
const HEIGHT = 560;
const CENTER = [WIDTH / 2, HEIGHT / 2];
const MIN_SCALE = 235;
const MAX_SCALE = 7600;
const GLOBAL_ANCHOR_SCALE = 620;
const GLOBAL_ANCHOR_POINT = [WIDTH - 26, 28];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sphere = { type: "Sphere" };
const projection = geoOrthographic().translate(CENTER).scale(MIN_SCALE).clipAngle(90).precision(.35).rotate([92, -31, 0]);
const path = geoPath(projection);
const countries = feature(world, world.objects.features).features;
const states = feature(us, us.objects.states).features;
const countryNodes = countries.map(item => ({ item, node: appendSvg(countryLayer, "path", `country${item.properties?.id === "USA" ? " is-usa" : ""}`) }));
const stateNodes = states.map(item => ({ item, node: appendSvg(stateLayer, "path", "state-boundary") }));
const accents = { "Temperature": "#f0a15f", "Rain & Snow": "#74b9dc", "Hurricanes": "#b7a4e4", "Natural Disasters": "#dc7a70", "Climate Change": "#79c6a1" };
const BUSINESS_METROS = [
  { id: "business-metro-new-york", name: "New York", code: "NYC", location: "New York metropolitan area", lat: 40.7128, lon: -74.006, radiusKm: 70 },
  { id: "business-metro-bay-area", name: "San Francisco Bay Area", code: "SF", location: "San Francisco Bay Area", lat: 37.62, lon: -122.22, radiusKm: 90 },
  { id: "business-metro-los-angeles", name: "Los Angeles", code: "LA", location: "Los Angeles metropolitan area", lat: 34.0522, lon: -118.2437, radiusKm: 85 },
  { id: "business-metro-chicago", name: "Chicago", code: "CHI", location: "Chicago metropolitan area", lat: 41.8781, lon: -87.6298, radiusKm: 65 },
  { id: "business-metro-washington", name: "Washington, D.C.", code: "DC", location: "Washington metropolitan area", lat: 38.9072, lon: -77.0369, radiusKm: 60 },
  { id: "business-metro-miami", name: "Miami", code: "MIA", location: "Miami metropolitan area", lat: 25.7617, lon: -80.1918, radiusKm: 70 },
  { id: "business-metro-boston", name: "Boston", code: "BOS", location: "Boston metropolitan area", lat: 42.3601, lon: -71.0589, radiusKm: 55 },
  { id: "business-metro-austin", name: "Austin", code: "AUS", location: "Austin metropolitan area", lat: 30.2672, lon: -97.7431, radiusKm: 60, minMembers: 1 },
  { id: "business-metro-las-vegas", name: "Las Vegas", code: "LAS", location: "Las Vegas metropolitan area", lat: 36.1699, lon: -115.1398, radiusKm: 60, minMembers: 1 },
  { id: "business-metro-dallas-fort-worth", name: "Dallas–Fort Worth", code: "DFW", location: "Dallas–Fort Worth metropolitan area", lat: 32.84, lon: -97.1, radiusKm: 75, minMembers: 1 }
];

let horizonIndex = 0;
let selectedId = "los-angeles";
let pinnedSearchId = null;
let activeWeatherBundles = [...weatherBundles];
let activeWeatherHorizons = [...weatherHorizons];
let markerNodes = [];
let tooltipId = null;
let tooltipTimer = null;
let drag = null;
let drawFrame = null;
let zoomFrame = null;
let integratedActive = !app.closest("[data-category-view]");
let feedEtag = "";
let feedTimer = null;

const mobileMarketViewport = () => window.matchMedia("(max-width: 700px), (hover: none)").matches;
const preciseHoverViewport = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
function openMobileDetail() { if (mobileMarketViewport()) detailPanel?.classList.add("is-mobile-open"); }
function closeMobileDetail() { detailPanel?.classList.remove("is-mobile-open"); }
mobileDetailClose?.addEventListener("click", closeMobileDetail);
// Swipe down to close — same sleek handler as politics/sports
(() => {
  const panel = detailPanel;
  if (!panel) return;
  let startY = 0, deltaY = 0, dragging = false;
  const threshold = 64;
  panel.addEventListener("touchstart", e => {
    if (!panel.classList.contains("is-mobile-open")) return;
    const t = e.touches[0]; if (!t) return;
    const rect = panel.getBoundingClientRect();
    const atTop = panel.scrollTop <= 1;
    const nearTop = t.clientY - rect.top < 48 || e.target.closest(".mobile-sheet-handle");
    if (!atTop && !nearTop) return;
    startY = t.clientY; deltaY = 0; dragging = true;
  }, { passive: true });
  panel.addEventListener("touchmove", e => {
    if (!dragging) return;
    const t = e.touches[0]; if (!t) return;
    deltaY = t.clientY - startY;
    if (deltaY > 6) { panel.classList.add("is-dragging"); panel.style.transform = `translateY(${Math.min(deltaY,180)}px)`; if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  const end = () => { if (!dragging) return; dragging=false; panel.classList.remove("is-dragging"); panel.style.transform=""; if (deltaY>threshold) closeMobileDetail(); deltaY=0; };
  panel.addEventListener("touchend", end); panel.addEventListener("touchcancel", end);
})();
function appendSvg(parent, name, className = "") {
  const node = document.createElementNS(NS, name);
  if (className) node.setAttribute("class", className);
  parent.appendChild(node);
  return node;
}

function slug(value) {
  return String(value).toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function compactVolume(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 100000 ? 0 : 1)}K`;
  return String(value);
}

function bundleVolume(bundle) {
  return Math.max(0, ...bundle.markets.map(market => market.volume));
}

function volumeRadius(volume) {
  const base = Math.max(7, Math.min(15, 6.5 + (Math.log10(Math.max(1000, volume)) - 3) * 2.75));
  return window.matchMedia('(max-width: 768px)').matches ? base * 1.75 : base;
}

function activeKinds() {
  return new Set([...app.querySelectorAll("[data-kind]:checked")].map(input => input.dataset.kind));
}

function marketCode(market, fallback) {
  if (market?.markerCode) return market.markerCode;
  const outcomes = (market?.outcomes || []).filter(outcome => Number.isFinite(Number(outcome.price))).sort((left, right) => right.price - left.price);
  if (!outcomes.length) return fallback;
  if (market.kind === "Temperature") return String(outcomes[0].name).match(/-?\d{1,3}°/)?.[0] || fallback;
  const yes = outcomes.find(outcome => /^yes$/i.test(outcome.name));
  return `${Math.round(yes?.price ?? outcomes[0].price)}%`;
}

function clusterBusinessMetros(bundles) {
  if (!namedMarkerLabels) return bundles;
  const assigned = new Set();
  const metroBundles = [];
  for (const metro of BUSINESS_METROS) {
    const members = bundles.filter(bundle => !assigned.has(bundle.id)
      && geoDistance([metro.lon, metro.lat], [Number(bundle.lon), Number(bundle.lat)]) * 6371 <= metro.radiusKm);
    if (members.length < Number(metro.minMembers || 2)) continue;
    members.forEach(bundle => assigned.add(bundle.id));
    const markets = members.flatMap(bundle => bundle.markets.map(market => ({
      ...market,
      sourceBundleId: bundle.id,
      sourceBundleName: bundle.name,
      markerCode: metro.code
    })));
    const representative = markets.slice().sort((left, right) => right.volume - left.volume)[0];
    metroBundles.push({
      ...metro,
      location: `${metro.location} · ${members.length} mapped locations`,
      kind: representative?.kind || members[0].kind,
      horizon: representative?.horizon || members[0].horizon,
      isMetroCluster: true,
      memberIds: members.map(bundle => bundle.id),
      markets
    });
  }
  return [...metroBundles, ...bundles.filter(bundle => !assigned.has(bundle.id))]
    .sort((left, right) => bundleVolume(right) - bundleVolume(left));
}

function visibleBundles() {
  const horizon = activeWeatherHorizons[horizonIndex];
  const kinds = activeKinds();
  return clusterBusinessMetros(activeWeatherBundles).map(bundle => {
    const markets = bundle.markets.filter(market => {
      const marketKind = market.kind || bundle.kind;
      const marketHorizon = market.horizon || bundle.horizon;
      return kinds.has(marketKind) && (horizon === "All" || marketHorizon === horizon);
    });
    const sorted = sortWeatherMarkets(markets);
    const representative = sorted[0] || markets.slice().sort((left, right) => right.volume - left.volume)[0];
    return {
      ...bundle,
      markets: sorted,
      kind: representative?.kind || bundle.kind,
      horizon: representative?.horizon || bundle.horizon,
      code: bundle.isMetroCluster ? bundle.code : marketCode(representative, bundle.code)
    };
  }).filter(bundle => bundle.markets.length);
}

function uniqueMarketCount(bundles) {
  return new Set(bundles.flatMap(bundle => bundle.markets.map(market => market.id))).size;
}
function sortWeatherMarkets(markets) {
  // Weather tab: default preview is Temperature if present — most relevant
  if (namedMarkerLabels) return markets;
  return [...markets].sort((a, b) => {
    const aTemp = (a.kind || "") === "Temperature" ? 0 : 1;
    const bTemp = (b.kind || "") === "Temperature" ? 0 : 1;
    if (aTemp !== bTemp) return aTemp - bTemp;
    return (b.volume || 0) - (a.volume || 0);
  });
}

function outcomeMarkup(outcome, tooltipMode = false) {
  if (tooltipMode) return `<div class="tooltip-price"><span>${escapeHtml(outcome.name)}</span><strong>${Math.round(outcome.price)}¢</strong></div>`;
  return `<div class="market-outcome weather-outcome"><span class="outcome-fill" style="width:${outcome.price}%"></span><span class="outcome-name">${escapeHtml(outcome.name)}</span><strong class="outcome-price">${Math.round(outcome.price)}¢</strong></div>`;
}

function marketMarkup(market, kind, tooltipMode = false) {
  const color = accents[kind];
  if (tooltipMode) return `<section class="tooltip-market" style="--weather-accent:${color}"><a class="tooltip-market-title" href="${market.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(market.title)}</a>${market.outcomes.slice(0, 6).map(item => outcomeMarkup(item, true)).join("")}<div class="tooltip-stamp">${compactVolume(market.volume)} contracts · ${escapeHtml(market.eventTicker)}</div></section>`;
  const historyOutcome = market.outcomes.find(outcome => outcome.ticker);
  const history = "";
  return `<article class="market-card" data-outcome-count="${market.outcomes.length}" style="--weather-accent:${color}"><div class="market-card-heading"><a class="market-card-title" href="${market.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(market.title)}</a><span class="market-volume">${compactVolume(market.volume)} vol</span></div><div class="market-outcomes">${market.outcomes.map(item => outcomeMarkup(item)).join("")}</div><div class="market-footer"><span>${escapeHtml(market.eventTicker)}</span><span>Kalshi · ${market.updatedAt ? `cached ${snapshotAge(market.updatedAt)}` : "verified fallback"}</span></div>${history}</article>`;
}

let renderedDetailId = null;

function resetDetailScroll(bundle) {
  const nextId = bundle?.id || null;
  if (nextId === renderedDetailId) return;
  renderedDetailId = nextId;
  detailPanel.scrollTop = 0;
  detailList.scrollTop = 0;
  detailList.scrollLeft = 0;
}

function renderDetail(bundle) {
  resetDetailScroll(bundle);
  if (!bundle) {
    // Sleek empty state — same card language as Politics/Business single view (one element with header)
    const isBusiness = app.classList.contains("business-app");
    detailName.textContent = isBusiness ? "No business markets" : "No weather markets";
    detailCode.textContent = "—";
    detailLocation.textContent = isBusiness
      ? "No markets match these filters — try a different kind or horizon, or clear filters."
      : "Change the market type or horizon filters.";
    detailMeta.innerHTML = `<span class="meta-badge">0 markets</span>`;
    detailList.innerHTML = `<article class="market-card" style="--weather-accent:${isBusiness ? "var(--consumer, #d8a66c)" : (accents["Temperature"]||"#f0a15f")}"><div class="market-card-heading"><span class="market-card-title">Nothing to show</span><span class="market-volume">—</span></div><div class="market-outcomes"><div class="market-outcome" style="opacity:.72"><span class="outcome-name">Adjust filters or check back — live markets appear here.</span><strong class="outcome-price">—</strong></div></div><div class="market-footer"><span>${isBusiness ? "Business" : "Weather"} · cached</span><span>Kalshi</span></div></article>`;
    return;
  }
  detailName.textContent = bundle.name;
  detailCode.textContent = bundle.code;
  detailLocation.textContent = bundle.location;
  detailMeta.innerHTML = `<span class="meta-badge weather-category-badge" style="--weather-accent:${accents[bundle.kind]}">${bundle.kind}</span><span class="meta-badge">${bundle.horizon}</span><span class="meta-badge">${bundle.markets.length} market${bundle.markets.length === 1 ? "" : "s"}</span>`;
  detailList.innerHTML = sortWeatherMarkets(bundle.markets).map(market => marketMarkup(market, market.kind || bundle.kind)).join("");
  window.__marketAtlasPriceHistory?.wireCards(detailList);
}

function cancelTooltipHide() { clearTimeout(tooltipTimer); tooltipTimer = null; }
function hideTooltip() { cancelTooltipHide(); tooltipId = null; tooltip.hidden = true; }
function scheduleTooltipHide() { cancelTooltipHide(); tooltipTimer = setTimeout(hideTooltip, 150); }

function positionTooltip(point) {
  const svgRect = svg.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const anchorX = svgRect.left - stageRect.left + point[0] / WIDTH * svgRect.width;
  const anchorY = svgRect.top - stageRect.top + point[1] / HEIGHT * svgRect.height;
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const inset = 7;
  const topInset = 26;
  const maxLeft = Math.max(inset, stageRect.width - width - inset);
  const maxTop = Math.max(topInset, stageRect.height - height - inset);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const centerLeft = clamp(anchorX - width / 2, inset, maxLeft);
  const centerTop = clamp(anchorY - height / 2, topInset, maxTop);
  const candidates = [
    { edge: "left", distance: anchorX, left: inset, top: centerTop },
    { edge: "right", distance: stageRect.width - anchorX, left: maxLeft, top: centerTop },
    { edge: "top", distance: anchorY, left: centerLeft, top: topInset },
    { edge: "bottom", distance: stageRect.height - anchorY, left: centerLeft, top: maxTop }
  ];
  const penalty = Math.max(stageRect.width, stageRect.height) * 4;
  candidates.forEach(candidate => {
    const covers = anchorX >= candidate.left - 18 && anchorX <= candidate.left + width + 18 && anchorY >= candidate.top - 18 && anchorY <= candidate.top + height + 18;
    candidate.score = candidate.distance + (covers ? penalty : 0);
  });
  const placement = candidates.sort((a, b) => a.score - b.score)[0];
  tooltip.dataset.edge = placement.edge;
  tooltip.style.left = `${placement.left}px`;
  tooltip.style.top = `${placement.top}px`;
}

function showTooltip(bundle, point) {
  if (!preciseHoverViewport()) return;
  cancelTooltipHide();
  tooltipId = bundle.id;
  tooltip.innerHTML = `<div class="tooltip-heading"><div><div class="tooltip-title">${escapeHtml(bundle.name)}</div><div class="tooltip-subtitle">${escapeHtml(bundle.location)} · ${bundle.horizon}</div></div><span class="weather-category-badge" style="--weather-accent:${accents[bundle.kind]}">${escapeHtml(bundle.kind)}</span></div><div class="tooltip-market-list">${sortWeatherMarkets(bundle.markets).map(market => marketMarkup(market, market.kind || bundle.kind, true)).join("")}</div>`;
  tooltip.hidden = false;
  positionTooltip(point);
}

tooltip.addEventListener("mouseenter", cancelTooltipHide);
tooltip.addEventListener("mouseleave", scheduleTooltipHide);

function makeMarker(bundle) {
  const radius = volumeRadius(bundleVolume(bundle));
  const group = appendSvg(markerLayer, "g", `event-marker kind-${slug(bundle.kind)}`);
  group.dataset.id = bundle.id;
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute("aria-label", `${bundle.name}: ${bundle.markets.length} ${bundle.kind} market${bundle.markets.length === 1 ? "" : "s"}`);
  const hit = appendSvg(group, "circle", "marker-hit"); hit.setAttribute("r", String(radius + 9));
  const halo = appendSvg(group, "circle", "marker-halo"); halo.setAttribute("r", String(radius + 3));
  const core = appendSvg(group, "circle", "marker-core"); core.setAttribute("r", String(radius));
  const label = appendSvg(group, "text"); label.textContent = bundle.code; { const isMobile = window.matchMedia('(max-width: 768px)').matches; const isWeather = !app.classList.contains("business-app"); if (isWeather && isMobile) label.style.fontSize = `${0.7225 + radius * 0.0153}em`; else if (!isWeather) label.style.fontSize = `${(isMobile ? 0.68 : 0.38) + radius * 0.014}em`; else label.style.fontSize = `${(isMobile ? 0.85 : 0.48) + radius * 0.018}em`; }
  let nameLabel = null;
  if (namedMarkerLabels) {
    nameLabel = appendSvg(group, "text", "marker-name-label");
    nameLabel.textContent = bundle.name;
    { const isMobile = window.matchMedia('(max-width: 768px)').matches; nameLabel.style.fontSize = `${(isMobile ? 0.68 : 0.40) + radius * 0.014}em`; }
  }
  if (bundle.markets.length > 1) {
    const count = appendSvg(group, "circle", "market-count"); count.setAttribute("cx", String(radius)); count.setAttribute("cy", String(-radius)); count.setAttribute("r", "5.3");
    const countText = appendSvg(group, "text", "market-count-text"); countText.setAttribute("x", String(radius)); countText.setAttribute("y", String(-radius)); countText.textContent = String(bundle.markets.length);
  }
  const select = () => { hideTooltip(); pinnedSearchId = null; delete app.dataset.searchSelectedId; selectedId = bundle.id; renderDetail(bundle); openMobileDetail(); draw(); };
  group.addEventListener("pointerdown", event => event.stopPropagation());
  group.addEventListener("mouseenter", () => { if (!preciseHoverViewport()) return; const point = markerPoint(bundle); if (point) showTooltip(bundle, point); });
  group.addEventListener("mouseleave", scheduleTooltipHide);
  group.addEventListener("click", select);
  group.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } });
  return { bundle, group, radius, nameLabel, nameLabelWidth: Math.max(16, bundle.name.length * 4.15) };
}

function isGlobalClimate(bundle) {
  return bundle?.id === "global-climate" || bundle?.id === "global-temperature";
}

function markerPoint(bundle) {
  if (isGlobalClimate(bundle) && projection.scale() >= GLOBAL_ANCHOR_SCALE) return GLOBAL_ANCHOR_POINT;
  return projection([bundle.lon, bundle.lat]);
}

function markerSpacing() {
  const scale = projection.scale();
  const base = scale < 320 ? 30 : scale < 520 ? 24 : scale < 900 ? 18 : 10;
  if (!window.matchMedia('(max-width: 768px)').matches) return base;
  // Business dense metros need even more aggressive clustering on mobile than Weather
  const isBusiness = app.classList.contains("business-app");
  return base * (isBusiness ? 2.35 : 1.75);
}

function boxesOverlap(left, right, gap = 3) {
  return left.x < right.x + right.width + gap
    && left.x + left.width + gap > right.x
    && left.y < right.y + right.height + gap
    && left.y + left.height + gap > right.y;
}

function boxTouchesMarker(box, marker, gap = 2) {
  const closestX = Math.max(box.x, Math.min(marker.x, box.x + box.width));
  const closestY = Math.max(box.y, Math.min(marker.y, box.y + box.height));
  return Math.hypot(marker.x - closestX, marker.y - closestY) < marker.radius + gap;
}

function businessLabelCandidates(node, x, y) {
  const gap = 5;
  const height = 11;
  const rightX = x + node.radius + gap;
  const leftX = x - node.radius - gap - node.nameLabelWidth;
  const upperY = y - node.radius - gap - height;
  const lowerY = y + node.radius + gap;
  const makeBox = (side, boxX, boxY) => ({
    side,
    x: boxX,
    y: boxY,
    width: node.nameLabelWidth,
    height,
    textX: side === "right" ? boxX - x : boxX + node.nameLabelWidth - x,
    textY: boxY - y + 8,
    anchor: side === "right" ? "start" : "end"
  });
  return [
    makeBox("right", rightX, y - height / 2),
    makeBox("left", leftX, y - height / 2),
    makeBox("right", x + node.radius * .45 + gap, upperY),
    makeBox("left", x - node.radius * .45 - gap - node.nameLabelWidth, upperY),
    makeBox("right", x + node.radius * .45 + gap, lowerY),
    makeBox("left", x - node.radius * .45 - gap - node.nameLabelWidth, lowerY)
  ];
}

function businessLabelPlacement(node, x, y, accepted, allowOverlap = false) {
  const rawCandidates = businessLabelCandidates(node, x, y);
  const candidates = rawCandidates.filter(box => box.x >= 4
    && box.x + box.width <= WIDTH - 4
    && box.y >= 4
    && box.y + box.height <= HEIGHT - 4);
  const collisionCount = box => accepted.reduce((count, other) => count
    + Number(boxesOverlap(box, other.labelBox))
    + Number(boxTouchesMarker(box, other))
    + Number(boxTouchesMarker(other.labelBox, { x, y, radius: node.radius })), 0);
  const clear = candidates.find(box => collisionCount(box) === 0);
  if (clear || !allowOverlap) return clear || null;
  const leastCrowded = candidates.sort((left, right) => collisionCount(left) - collisionCount(right))[0];
  if (leastCrowded) return leastCrowded;
  const preferred = rawCandidates[x < WIDTH / 2 ? 0 : 1];
  const clampedX = Math.max(4, Math.min(WIDTH - preferred.width - 4, preferred.x));
  const clampedY = Math.max(4, Math.min(HEIGHT - preferred.height - 4, preferred.y));
  return {
    ...preferred,
    x: clampedX,
    y: clampedY,
    textX: preferred.anchor === "start" ? clampedX - x : clampedX + preferred.width - x,
    textY: clampedY - y + 8
  };
}

function placeMarkers() {
  const center = projection.invert(CENTER);
  const currentScale = projection.scale();
  const businessFullDetail = namedMarkerLabels && currentScale >= 700;
  const projectedNodes = markerNodes.map(node => {
    const anchored = isGlobalClimate(node.bundle) && projection.scale() >= GLOBAL_ANCHOR_SCALE;
    return { ...node, anchored, point: markerPoint(node.bundle), distance: anchored ? 0 : geoDistance(center, [node.bundle.lon, node.bundle.lat]), volume: bundleVolume(node.bundle) };
  });
  const horizonNodes = projectedNodes.filter(node => node.point && (node.anchored || isFrontHemisphere(node.distance)));
  const candidates = horizonNodes
    .filter(node => node.anchored || markerIntersectsViewport(node.point, node.radius + 5, WIDTH, HEIGHT))
    .sort((a, b) => Number(b.anchored) - Number(a.anchored)
      || Number(b.bundle.id === selectedId) - Number(a.bundle.id === selectedId)
      || b.volume - a.volume
      || a.bundle.id.localeCompare(b.bundle.id));
  markerNodes.forEach(node => {
    node.group.setAttribute("display", "none");
    node.group.classList.toggle("is-selected", node.bundle.id === selectedId);
    node.group.classList.toggle("is-viewport-anchor", isGlobalClimate(node.bundle) && projection.scale() >= GLOBAL_ANCHOR_SCALE);
  });
  const accepted = [];
  for (const node of candidates) {
    const [x, y] = node.point;
    const collision = accepted.some(other => Math.hypot(x - other.x, y - other.y) < markerSpacing() + Math.min(node.radius, other.radius) * .45);
    if (collision && !businessFullDetail && node.bundle.id !== selectedId) continue;
    const labelBox = namedMarkerLabels ? businessLabelPlacement(node, x, y, accepted, true) : null;
    if (namedMarkerLabels && !labelBox && node.bundle.id !== selectedId) continue;
    if (node.nameLabel) {
      const placement = labelBox || businessLabelCandidates(node, x, y)[x < WIDTH / 2 ? 0 : 1];
      node.nameLabel.setAttribute("x", String(placement.textX));
      node.nameLabel.setAttribute("y", String(placement.textY));
      node.nameLabel.style.textAnchor = placement.anchor;
    }
    const opacity = 1;
    node.group.removeAttribute("display");
    node.group.setAttribute("transform", `translate(${x},${y})`);
    node.group.style.opacity = String(opacity);
    node.group.style.pointerEvents = opacity < .12 ? "none" : "auto";
    accepted.push({
      x,
      y,
      radius: node.radius,
      anchored: node.anchored,
      id: node.bundle.id,
      labelBox: labelBox || { x, y, width: 0, height: 0 }
    });
  }
  hud.textContent = `${accepted.length} locations in frame · ${uniqueMarketCount(candidates.map(node => node.bundle))} individual markets`;
  publishGlobeDiagnostics(namedMarkerLabels ? "business" : "weather", {
    scale: projection.scale(),
    total: markerNodes.length,
    behindGlobe: projectedNodes.length - horizonNodes.length,
    offscreen: horizonNodes.length - candidates.length,
    collisionHidden: candidates.length - accepted.length,
    visible: accepted.length,
  });
}

function preferredMarketZoomAnchor() {
  const center = projection.invert(CENTER);
  const nodes = markerNodes.map(node => {
    const anchored = isGlobalClimate(node.bundle) && projection.scale() >= GLOBAL_ANCHOR_SCALE;
    return {
      id: node.bundle.id,
      point: markerPoint(node.bundle),
      radius: node.radius + 5,
      volume: bundleVolume(node.bundle),
      distance: anchored ? 0 : geoDistance(center, [node.bundle.lon, node.bundle.lat]),
      anchored,
    };
  }).filter(node => node.anchored || isFrontHemisphere(node.distance));
  return preferredZoomAnchor(nodes, { selectedId, fallback: CENTER, width: WIDTH, height: HEIGHT });
}

function placeLabels() {
  labelLayer.replaceChildren();
  return;
  if (namedMarkerLabels) return;
  if (projection.scale() < 760) return;
  const center = projection.invert(CENTER);
  const accepted = [];
  for (const bundle of visibleBundles().filter(item => !(isGlobalClimate(item) && projection.scale() >= GLOBAL_ANCHOR_SCALE) && geoDistance(center, [item.lon, item.lat]) < Math.PI / 2 - .035).sort((a, b) => bundleVolume(b) - bundleVolume(a))) {
    const point = projection([bundle.lon, bundle.lat]);
    const width = bundle.name.length * 5.5;
    const box = { x: point[0] + 6, y: point[1] - 13, width, height: 14 };
    if (box.x < 4 || box.y < 4 || box.x + width > WIDTH - 4 || accepted.some(other => box.x < other.x + other.width + 4 && box.x + width + 4 > other.x && box.y < other.y + other.height + 4 && box.y + 18 > other.y)) continue;
    const group = appendSvg(labelLayer, "g", "capital-label");
    const dot = appendSvg(group, "circle"); dot.setAttribute("cx", point[0]); dot.setAttribute("cy", point[1]); dot.setAttribute("r", "1.5");
    const text = appendSvg(group, "text"); text.setAttribute("x", point[0] + 6); text.setAttribute("y", point[1] - 3); text.textContent = bundle.name;
    accepted.push(box);
  }
}

function draw() {
  const zoomProgress = Math.max(0, Math.min(1, (projection.scale() - 300) / (700 - 300)));
  const mapBlend = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
  const markerZoomProgress = Math.max(0, Math.min(1, (projection.scale() - 380) / (950 - 380)));
  const markerReveal = markerZoomProgress * markerZoomProgress * (3 - 2 * markerZoomProgress);
  app.style.setProperty("--map-ocean-opacity", String(1 - mapBlend));
  app.style.setProperty("--map-rim-opacity", String(1 - mapBlend));
  app.style.setProperty("--map-grid-opacity", String(1 - mapBlend * 0.28));
  app.style.setProperty("--weather-marker-reveal", `${(markerReveal * 48).toFixed(1)}%`);
  const spherePath = path(sphere);
  app.querySelector(".sphere-clip-path").setAttribute("d", spherePath);
  app.querySelector(".globe-shadow").setAttribute("d", spherePath);
  app.querySelector(".globe-ocean").setAttribute("d", spherePath);
  app.querySelector(".globe-graticule").setAttribute("d", path(geoGraticule10()));
  countryNodes.forEach(({ item, node }) => node.setAttribute("d", path(item) || ""));
  stateNodes.forEach(({ item, node }) => node.setAttribute("d", path(item) || ""));
  placeMarkers();
  placeLabels();
  if (!tooltip.hidden && tooltipId) {
    const bundle = visibleBundles().find(item => item.id === tooltipId);
    const point = bundle && markerPoint(bundle);
    if (point) positionTooltip(point); else hideTooltip();
  }
}

function scheduleDraw() {
  if (drawFrame || !integratedActive) return;
  drawFrame = requestAnimationFrame(() => { drawFrame = null; draw(); });
}

function rebuild() {
  hideTooltip();
  const bundles = visibleBundles();
  markerLayer.replaceChildren();
  markerNodes = bundles.map(makeMarker);
  filterCount.textContent = String(bundles.length);
  activity.textContent = `${bundles.length} locations · ${uniqueMarketCount(bundles)} markets`;
  const searchSelectedId = app.dataset.searchSelectedId || pinnedSearchId;
  let selected = bundles.find(bundle => bundle.id === searchSelectedId || bundle.memberIds?.includes(searchSelectedId))
    || bundles.find(bundle => bundle.id === selectedId || bundle.memberIds?.includes(selectedId));
  if (pinnedSearchId && !selected) pinnedSearchId = null;
  if (searchSelectedId && !selected) delete app.dataset.searchSelectedId;
  if (!selected) selected = [...bundles].sort((a, b) => bundleVolume(b) - bundleVolume(a))[0] || null;
  selectedId = selected?.id || null;
  renderDetail(selected);
  draw();
}

function renderHorizon() {
  range.value = String(horizonIndex);
  horizonLabel.textContent = activeWeatherHorizons[horizonIndex];
  app.querySelector(".timeline-prev").disabled = horizonIndex === 0;
  app.querySelector(".timeline-next").disabled = horizonIndex === activeWeatherHorizons.length - 1;
  rebuild();
}

function renderHorizonStops() {
  stopsLayer.replaceChildren();
  range.max = String(activeWeatherHorizons.length - 1);
  activeWeatherHorizons.forEach((horizon, index) => {
    const stop = document.createElement("span");
    stop.className = "timeline-stop";
    stop.style.left = `${activeWeatherHorizons.length === 1 ? 0 : index / (activeWeatherHorizons.length - 1) * 100}%`;
    stop.textContent = horizon;
    stopsLayer.appendChild(stop);
  });
}
renderHorizonStops();
app.querySelectorAll("[data-kind]").forEach(input => input.addEventListener("change", rebuild));
range.addEventListener("input", () => { horizonIndex = Number(range.value); renderHorizon(); });
app.querySelector(".timeline-prev").addEventListener("click", () => { horizonIndex = Math.max(0, horizonIndex - 1); renderHorizon(); });
app.querySelector(".timeline-next").addEventListener("click", () => { horizonIndex = Math.min(activeWeatherHorizons.length - 1, horizonIndex + 1); renderHorizon(); });

svg.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  event.preventDefault(); hideTooltip(); cancelAnimationFrame(zoomFrame); zoomFrame = null;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: projection.rotate() };
  svg.setPointerCapture(event.pointerId);
});
svg.addEventListener("pointermove", event => {
  if (!drag || drag.id !== event.pointerId) return;
  const sensitivity = globePanSensitivity(projection.scale());
  projection.rotate([drag.rotation[0] + (event.clientX - drag.x) * sensitivity, Math.max(-84, Math.min(84, drag.rotation[1] - (event.clientY - drag.y) * sensitivity)), drag.rotation[2]]);
  scheduleDraw();
});
const endDrag = event => { if (drag?.id === event.pointerId) { drag = null; if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId); } };
svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);

function localPoint(event) { const rect = svg.getBoundingClientRect(); return [(event.clientX - rect.left) / rect.width * WIDTH, (event.clientY - rect.top) / rect.height * HEIGHT]; }
function zoomAt(nextScale, anchor = CENTER) {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
  const anchorGeo = projection.invert(anchor); projection.scale(scale);
  if (anchorGeo) for (let i = 0; i < 3; i += 1) { const point = projection(anchorGeo); if (!point) break; const rotation = projection.rotate(); projection.rotate([rotation[0] + (anchor[0] - point[0]) / scale * 180 / Math.PI, Math.max(-84, Math.min(84, rotation[1] - (anchor[1] - point[1]) / scale * 180 / Math.PI)), rotation[2]]); }
  draw();
}
svg.addEventListener("wheel", event => { event.preventDefault(); hideTooltip(); const scale = projection.scale(); const damping = Math.max(.18, Math.min(1, 520 / scale)); zoomAt(scale * Math.exp(-event.deltaY * .00135 * damping), localPoint(event)); }, { passive: false });
function animateZoom(multiplier, anchor = CENTER) {
  cancelAnimationFrame(zoomFrame); const start = projection.scale(); const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, start * multiplier)); const began = performance.now();
  const frame = now => { const p = Math.min(1, (now - began) / 180); zoomAt(start + (target - start) * (1 - Math.pow(1 - p, 3)), anchor); if (p < 1) zoomFrame = requestAnimationFrame(frame); else zoomFrame = null; };
  zoomFrame = requestAnimationFrame(frame);
}
function animateToLocation(lon, lat, targetScale = 1050, duration = 380) {
  const boundedLon = Number(lon);
  const boundedLat = Math.max(-84, Math.min(84, Number(lat)));
  if (!Number.isFinite(boundedLon) || !Number.isFinite(boundedLat)) return false;
  cancelAnimationFrame(zoomFrame);
  hideTooltip();
  const startRotation = projection.rotate();
  const targetRotation = [-boundedLon, -boundedLat, 0];
  const longitudeDelta = ((targetRotation[0] - startRotation[0] + 540) % 360) - 180;
  const latitudeDelta = targetRotation[1] - startRotation[1];
  const startScale = projection.scale();
  const boundedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(targetScale) || 1050));
  if (reduceMotion) {
    projection.rotate([startRotation[0] + longitudeDelta, targetRotation[1], 0]);
    projection.scale(boundedScale);
    draw();
    return true;
  }
  const startedAt = performance.now();
  const frame = now => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    projection.rotate([startRotation[0] + longitudeDelta * eased, startRotation[1] + latitudeDelta * eased, 0]);
    projection.scale(startScale + (boundedScale - startScale) * eased);
    draw();
    if (progress < 1) zoomFrame = requestAnimationFrame(frame);
    else zoomFrame = null;
  };
  zoomFrame = requestAnimationFrame(frame);
  return true;
}
app.querySelector(".zoom-in").addEventListener("click", () => animateZoom(globeZoomMultiplier(projection.scale()), preferredMarketZoomAnchor()));
app.querySelector(".zoom-out").addEventListener("click", () => animateZoom(1 / globeZoomMultiplier(projection.scale())));
window.addEventListener("resize", scheduleDraw);

function snapshotAge(value) {
  const elapsed = Math.max(0, Date.now() - new Date(value || 0).getTime());
  if (!Number.isFinite(elapsed)) return "cached";
  if (elapsed < 60_000) return "just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  return `${Math.floor(elapsed / 3_600_000)}h ago`;
}

async function loadWeatherFeed() {
  try {
    const headers = { Accept: "application/json" };
    if (feedEtag) headers["If-None-Match"] = feedEtag;
    const response = await fetch("/api/weather", { headers, cache: "no-cache" });
    if (response.status === 304) return;
    if (!response.ok) throw new Error(response.status === 503 ? "Weather cache is warming" : `Weather feed returned ${response.status}`);
    const payload = await response.json();
    const currentHorizon = activeWeatherHorizons[horizonIndex] || "All";
    feedEtag = response.headers.get("etag") || feedEtag;
    if (Array.isArray(payload.bundles) && payload.bundles.length) activeWeatherBundles = payload.bundles;
    if (Array.isArray(payload.horizons) && payload.horizons.length) activeWeatherHorizons = payload.horizons;
    horizonIndex = Math.max(0, activeWeatherHorizons.indexOf(currentHorizon));
    renderHorizonStops();
    renderHorizon();
    const note = app.querySelector(".feed-status-note");
    if (note) note.textContent = `${payload.marketCount || 0} live Kalshi markets · cached ${snapshotAge(payload.generatedAt)}`;
    const label = app.querySelector(".feed-status-label");
    if (label) label.textContent = "Live cached weather markets";
  } catch (error) {
    hud.textContent = `${error.message} · showing verified fallback`;
    const note = app.querySelector(".feed-status-note");
    if (note) note.textContent = `${error.message} · retrying`;
  }
}

renderHorizon();
if (integratedActive) {
  void loadWeatherFeed();
  feedTimer = setInterval(() => { if (!document.hidden) void loadWeatherFeed(); }, 60_000);
}

window.__integratedWeatherView = {
  activate() { integratedActive = true; clearInterval(feedTimer); scheduleDraw(); void loadWeatherFeed(); feedTimer = setInterval(() => { if (integratedActive && !document.hidden) void loadWeatherFeed(); }, 60_000); },
  deactivate() { integratedActive = false; clearInterval(feedTimer); hideTooltip(); if (drawFrame) cancelAnimationFrame(drawFrame); if (zoomFrame) cancelAnimationFrame(zoomFrame); drawFrame = null; zoomFrame = null; },
  getMapView() { return { rotate: [...projection.rotate()], scale: projection.scale() }; },
  setMapView(view) { if (!view || !Array.isArray(view.rotate)) return; projection.rotate(view.rotate.slice(0, 3)); projection.scale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(view.scale) || projection.scale()))); hideTooltip(); draw(); },
  getTimelineOptions() { return activeWeatherHorizons.map((label, index) => ({ value: index, label })); },
  getTimelineIndex() { return horizonIndex; },
  setTimelineIndex(index) { horizonIndex = Math.max(0, Math.min(activeWeatherHorizons.length - 1, Number(index) || 0)); renderHorizon(); },
  revealLocation(result) {
    const lon = Number(result?.lon), lat = Number(result?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return false;
    const ranked = visibleBundles().map(bundle => {
      const longitudeDelta = Math.abs(((Number(bundle.lon) - lon + 540) % 360) - 180);
      const latitudeDelta = Math.abs(Number(bundle.lat) - lat);
      return { bundle, distance: Math.hypot(longitudeDelta * Math.cos(lat * Math.PI / 180), latitudeDelta) };
    }).sort((left, right) => left.distance - right.distance || bundleVolume(right.bundle) - bundleVolume(left.bundle));
    const bundle = ranked[0]?.distance <= 5 ? ranked[0].bundle : null;
    if (drawFrame) cancelAnimationFrame(drawFrame); if (zoomFrame) cancelAnimationFrame(zoomFrame); drawFrame = null; zoomFrame = null;
    if (bundle) { app.dataset.searchSelectedId = bundle.id; pinnedSearchId = bundle.id; selectedId = bundle.id; renderDetail(bundle); openMobileDetail(); }
    animateToLocation(bundle?.lon ?? lon, bundle?.lat ?? lat, Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(result?.scale) || 1050)), 520); return true;
  },
  revealMarket(result) {
    const bundle = visibleBundles().find(item => item.id === result?.bundleId || item.memberIds?.includes(result?.bundleId))
      || visibleBundles().find(item => item.markets.some(market => market.eventTicker === result?.eventTicker));
    if (!bundle) return false;
    app.dataset.searchSelectedId = bundle.id; pinnedSearchId = bundle.id; selectedId = bundle.id; renderDetail(bundle); openMobileDetail(); animateToLocation(bundle.lon, bundle.lat, Math.max(420, Math.min(900, projection.scale())), 480); return true;
  }
};
