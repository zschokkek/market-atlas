import { feature, geoDistance, geoGraticule10, geoOrthographic, geoPath, usCounties as us, world } from "/assets/map-runtime.js";
import { globePanSensitivity, globeZoomMultiplier, isFrontHemisphere, markerIntersectsViewport, preferredZoomAnchor, publishGlobeDiagnostics } from "/assets/globe-interaction.js";
import { majorWorldCapitals, stateCapitals } from "./data.js";

const app = document.querySelector(".politics-app");
const svg = app.querySelector(".politics-globe");
const stage = app.querySelector(".globe-stage");
const tooltip = app.querySelector(".map-tooltip");
const sphereClipPath = app.querySelector(".sphere-clip-path");
const shadowPath = app.querySelector(".globe-shadow");
const oceanPath = app.querySelector(".globe-ocean");
const graticulePath = app.querySelector(".globe-graticule");
const countriesLayer = app.querySelector(".countries-layer");
const statesLayer = app.querySelector(".states-layer");
const capitalLabelsLayer = app.querySelector(".capital-labels-layer");
const leadersLayer = app.querySelector(".leaders-layer");
const markersLayer = app.querySelector(".markers-layer");
const hudSummary = app.querySelector(".hud-summary");
const filterSummary = app.querySelector(".filter-summary-number");
const detailJurisdiction = app.querySelector(".detail-jurisdiction");
const detailCode = app.querySelector(".detail-code");
const detailLocation = app.querySelector(".detail-location");
const detailMeta = app.querySelector(".detail-meta");
const detailMarketList = app.querySelector(".detail-market-list");
const detailPanel = app.querySelector(".election-detail");
const mobileDetailClose = app.querySelector(".mobile-market-sheet-close");
const timelineRange = app.querySelector(".timeline-range");
const timelineStopLayer = app.querySelector(".timeline-stops");
const timelineEyebrow = app.querySelector(".timeline-eyebrow");
const timelineLabel = app.querySelector(".timeline-label");
const timelineActivity = app.querySelector(".timeline-activity");
const timelinePrev = app.querySelector(".timeline-prev");
const timelineNext = app.querySelector(".timeline-next");

const NS = "http://www.w3.org/2000/svg";
const WIDTH = 620;
const HEIGHT = 560;
const CENTER = [WIDTH / 2, HEIGHT / 2];
const MIN_SCALE = 235;
const MAX_SCALE = 7600;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const graticule = geoGraticule10();
const sphere = { type: "Sphere" };
const projection = geoOrthographic()
  .translate(CENTER)
  .scale(MIN_SCALE)
  .clipAngle(90)
  .precision(0.35)
  .rotate([24, -20, 0]);
const path = geoPath(projection);
const countries = feature(world, world.objects.features).features;
const states = feature(us, us.objects.states).features;
const countryPaths = [];
const statePaths = [];
const markerNodes = [];

let activeTimelineIndex = 0;
let selectedBundleId = null;
let activeBundles = [];
let electionBundles = [];
let timelineStops = [{ id: "upcoming", eyebrow: "Market horizon", label: "All upcoming", short: "Upcoming" }];
let feedEtag = "";
let tooltipBundleId = null;
let tooltipHideTimer = null;
let dragState = null;
let drawFrame = null;
let zoomFrame = null;

const mobileMarketViewport = () => window.matchMedia("(max-width: 700px), (hover: none)").matches;
const preciseHoverViewport = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
function openMobileDetail() {
  if (mobileMarketViewport()) detailPanel?.classList.add("is-mobile-open");
}
function closeMobileDetail() {
  detailPanel?.classList.remove("is-mobile-open");
}
mobileDetailClose?.addEventListener("click", closeMobileDetail);

function renderTimelineStops() {
  timelineStopLayer.replaceChildren();
  timelineRange.max = String(Math.max(0, timelineStops.length - 1));
  timelineStops.forEach((stop, index) => {
    const label = document.createElement("span");
    label.className = "timeline-stop";
    label.style.left = `${timelineStops.length === 1 ? 0 : index / (timelineStops.length - 1) * 100}%`;
    label.textContent = stop.short;
    timelineStopLayer.appendChild(label);
  });
}

for (const country of countries) {
  const element = document.createElementNS(NS, "path");
  const iso = country.properties?.id || country.id || "";
  element.setAttribute("class", `country${iso === "USA" ? " is-usa" : ""}`);
  countriesLayer.appendChild(element);
  countryPaths.push({ element, feature: country });
}

for (const state of states) {
  const element = document.createElementNS(NS, "path");
  element.setAttribute("class", "state-boundary");
  statesLayer.appendChild(element);
  statePaths.push({ element, feature: state });
}

function svgElement(name, className) {
  const element = document.createElementNS(NS, name);
  if (className) element.setAttribute("class", className);
  return element;
}

function compactVolume(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}K`;
  return String(value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function displayPrice(outcome) {
  const value = outcome.price ?? outcome.lastPrice ?? (outcome.yesBid != null && outcome.yesAsk != null ? (outcome.yesBid + outcome.yesAsk) / 2 : outcome.yesAsk ?? outcome.yesBid);
  return Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : null;
}

function marketUrl(market) {
  if (market?.url) return market.url;
  const seriesTicker = String(market?.seriesTicker || "").trim().toLowerCase();
  const seriesSlug = String(market?.seriesSlug || "").trim().toLowerCase();
  const eventTicker = String(market?.eventTicker || (typeof market === "string" ? market : "")).trim().toLowerCase();
  if (seriesTicker && seriesSlug && eventTicker) {
    return `https://kalshi.com/markets/${encodeURIComponent(seriesTicker)}/${encodeURIComponent(seriesSlug)}/${encodeURIComponent(eventTicker)}`;
  }
  return seriesTicker ? `https://kalshi.com/markets/${encodeURIComponent(seriesTicker)}` : "https://kalshi.com/markets";
}

function snapshotAge(value) {
  const age = Math.max(0, Date.now() - new Date(value || 0).getTime());
  if (!Number.isFinite(age)) return "cached";
  if (age < 60_000) return "just now";
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
  return `${Math.floor(age / 3_600_000)}h ago`;
}

function bundleVolume(bundle) {
  return Math.max(0, ...bundle.markets.map(market => market.volume));
}

function volumeRadius(value) {
  const normalized = Math.max(0, Math.log10(Math.max(1000, value)) - 3);
  return Math.max(7, Math.min(15, 6.5 + normalized * 2.75));
}

function currentGeographies() {
  return new Set([...app.querySelectorAll("[data-geography]:checked")].map(input => input.dataset.geography));
}

function currentOffices() {
  return new Set([...app.querySelectorAll("[data-office]:checked")].map(input => input.dataset.office));
}

function visibleBundleData() {
  const geography = currentGeographies();
  const offices = currentOffices();
  const timelineId = timelineStops[activeTimelineIndex]?.id || "upcoming";
  return electionBundles
    .filter(bundle => geography.has(bundle.geography))
    .filter(bundle => timelineId === "upcoming" || bundle.dateKey === timelineId)
    .map(bundle => ({ ...bundle, markets: bundle.markets.filter(market => offices.has(market.office)) }))
    .filter(bundle => bundle.markets.length > 0);
}

function uniqueMarketCount(bundles) {
  return new Set(bundles.flatMap(bundle => bundle.markets.map(market => market.id))).size;
}

function marketCardMarkup(market) {
  const historyOutcome = market.outcomes.find(outcome => outcome.ticker);
  const outcomes = market.outcomes.map(outcome => {
    const price = displayPrice(outcome);
    const partyClass = outcome.party === "D" ? " party-dem" : outcome.party === "R" ? " party-rep" : " party-neutral";
    const partyBadge = outcome.party === "D" || outcome.party === "R" ? `<span class="party-badge" aria-label="${outcome.party === "D" ? "Democratic" : "Republican"}">${outcome.party}</span>` : "";
    return `
    <div class="market-outcome${partyClass}">
      <span class="outcome-fill" style="width:${price ?? 0}%"></span>
      <span class="outcome-name">${partyBadge}${escapeHtml(outcome.name)}</span>
      <strong class="outcome-price">${price == null ? "—" : `${Math.round(price)}¢`}</strong>
    </div>`;
  }).join("");
  return `
    <article class="market-card" data-outcome-count="${market.outcomes.length}">
      <div class="market-card-heading">
        <a class="market-card-title" href="${marketUrl(market)}" target="_blank" rel="noopener noreferrer">${escapeHtml(market.title)}</a>
        <span class="market-volume">${compactVolume(market.volume)} vol</span>
      </div>
      <div class="market-outcomes">${outcomes}</div>
      <div class="market-footer"><span>${escapeHtml(market.eventTicker)}</span><span>Kalshi · ${snapshotAge(market.updatedAt)}</span></div>

    </article>`;
}

let renderedDetailId = null;

function resetDetailScroll(bundle) {
  const nextId = bundle?.id || null;
  if (nextId === renderedDetailId) return;
  renderedDetailId = nextId;
  detailPanel.scrollTop = 0;
  detailMarketList.scrollTop = 0;
  detailMarketList.scrollLeft = 0;
}

function renderDetail(bundle) {
  resetDetailScroll(bundle);
  if (!bundle) {
    detailJurisdiction.textContent = "No markets in view";
    detailCode.textContent = "—";
    detailLocation.textContent = "Adjust the geography, office, or election date filters.";
    detailMeta.replaceChildren();
    detailMarketList.innerHTML = '<div class="empty-detail">No live Kalshi markets match these filters.</div>';
    return;
  }

  detailJurisdiction.textContent = bundle.jurisdiction;
  detailCode.textContent = bundle.code;
  detailLocation.textContent = `${bundle.capital} · ${bundle.scope} markets`;
  detailMeta.innerHTML = `
    <span class="meta-badge">${bundle.dateLabel}</span>
    <span class="meta-badge${bundle.confidence.startsWith("Provisional") ? " is-provisional" : ""}">${bundle.confidence}</span>
    <span class="meta-badge">${bundle.markets.length} market${bundle.markets.length === 1 ? "" : "s"}</span>`;
  detailMarketList.innerHTML = bundle.markets.map(marketCardMarkup).join("");
  window.__marketAtlasPriceHistory?.wireCards(detailMarketList);
}

function tooltipMarketMarkup(market) {
  const prices = market.outcomes.slice(0, 8).map(outcome => {
    const price = displayPrice(outcome);
    const partyClass = outcome.party === "D" ? " party-dem" : outcome.party === "R" ? " party-rep" : "";
    return `<div class="tooltip-price${partyClass}"><span>${escapeHtml(outcome.name)}</span><strong>${price == null ? "—" : `${Math.round(price)}¢`}</strong></div>`;
  }).join("");
  return `
    <section class="tooltip-market">
      <a class="tooltip-market-title" href="${marketUrl(market)}" target="_blank" rel="noopener noreferrer">${escapeHtml(market.title)}</a>
      ${prices}
      <div class="tooltip-stamp">${compactVolume(market.volume)} contracts · ${escapeHtml(market.eventTicker)}</div>
    </section>`;
}

function cancelTooltipHide() {
  clearTimeout(tooltipHideTimer);
  tooltipHideTimer = null;
}

function hideTooltip() {
  cancelTooltipHide();
  tooltipBundleId = null;
  tooltip.hidden = true;
}

function scheduleTooltipHide() {
  cancelTooltipHide();
  tooltipHideTimer = setTimeout(hideTooltip, 150);
}

function positionTooltip(point) {
  const svgRect = svg.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const anchorX = svgRect.left - stageRect.left + point[0] / WIDTH * svgRect.width;
  const anchorY = svgRect.top - stageRect.top + point[1] / HEIGHT * svgRect.height;
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;
  const leftInset = 7;
  const rightInset = 7;
  const topInset = 26;
  const bottomInset = 8;
  const markerClearance = 18;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const maxLeft = Math.max(leftInset, stageRect.width - tooltipWidth - rightInset);
  const maxTop = Math.max(topInset, stageRect.height - tooltipHeight - bottomInset);
  const centeredLeft = clamp(anchorX - tooltipWidth / 2, leftInset, maxLeft);
  const centeredTop = clamp(anchorY - tooltipHeight / 2, topInset, maxTop);
  const edgeCandidates = [
    { edge: "left", distance: anchorX, left: leftInset, top: centeredTop },
    { edge: "right", distance: stageRect.width - anchorX, left: maxLeft, top: centeredTop },
    { edge: "top", distance: anchorY, left: centeredLeft, top: topInset },
    { edge: "bottom", distance: stageRect.height - anchorY, left: centeredLeft, top: maxTop }
  ];
  const obstructionPenalty = Math.max(stageRect.width, stageRect.height) * 4;
  edgeCandidates.forEach(candidate => {
    const coversMarker = anchorX >= candidate.left - markerClearance &&
      anchorX <= candidate.left + tooltipWidth + markerClearance &&
      anchorY >= candidate.top - markerClearance &&
      anchorY <= candidate.top + tooltipHeight + markerClearance;
    candidate.score = candidate.distance + (coversMarker ? obstructionPenalty : 0);
  });
  edgeCandidates.sort((left, right) => left.score - right.score);
  const placement = edgeCandidates[0];
  tooltip.dataset.edge = placement.edge;
  tooltip.style.left = `${placement.left}px`;
  tooltip.style.top = `${placement.top}px`;
}

function showTooltip(bundle, point) {
  if (!preciseHoverViewport()) return;
  cancelTooltipHide();
  tooltipBundleId = bundle.id;
  tooltip.innerHTML = `
    <div class="tooltip-heading">
      <div>
        <div class="tooltip-title">${bundle.jurisdiction}</div>
        <div class="tooltip-subtitle">${bundle.capital} · ${bundle.dateLabel}</div>
      </div>
      <span class="detail-code">${bundle.code}</span>
    </div>
    <div class="tooltip-market-list">${bundle.markets.map(tooltipMarketMarkup).join("")}</div>`;
  tooltip.hidden = false;
  positionTooltip(point);
}

tooltip.addEventListener("mouseenter", cancelTooltipHide);
tooltip.addEventListener("mouseleave", scheduleTooltipHide);

function createMarker(bundle) {
  const isHouseRace = bundle.scope === "Congressional district";
  const standardRadius = volumeRadius(bundleVolume(bundle));
  const radius = isHouseRace ? Math.max(5.25, Math.min(8.5, standardRadius * 0.68)) : standardRadius;
  const leaderClass = bundle.leaderParty === "D" ? " leader-dem" : bundle.leaderParty === "R" ? " leader-rep" : " leader-neutral";
  const group = svgElement("g", `event-marker${bundle.geography === "Global" ? " is-global" : ""}${isHouseRace ? " is-house-race" : ""}${leaderClass}`);
  group.dataset.id = bundle.id;
  group.dataset.scope = bundle.scope || "";
  group.setAttribute("role", "button");
  group.setAttribute("tabindex", "0");
  group.setAttribute("aria-label", `${bundle.jurisdiction}, ${bundle.markets.length} election market${bundle.markets.length === 1 ? "" : "s"}, largest volume ${compactVolume(bundleVolume(bundle))}`);

  const hit = svgElement("circle", "marker-hit");
  hit.setAttribute("r", String(radius + 9));
  const halo = svgElement("circle", "marker-halo");
  halo.setAttribute("r", String(radius + 3));
  const core = svgElement("circle", "marker-core");
  core.setAttribute("r", String(radius));
  const label = svgElement("text");
  label.textContent = isHouseRace ? bundle.code.replace(/^[A-Z]{2}/, "") : bundle.code;
  group.append(hit, halo, core, label);

  if (bundle.markets.length > 1) {
    const count = svgElement("circle", "market-count");
    count.setAttribute("cx", String(radius));
    count.setAttribute("cy", String(-radius));
    count.setAttribute("r", "5.3");
    const countText = svgElement("text", "market-count-text");
    countText.setAttribute("x", String(radius));
    countText.setAttribute("y", String(-radius));
    countText.textContent = String(bundle.markets.length);
    group.append(count, countText);
  }

  markersLayer.appendChild(group);

  const activate = () => {
    selectedBundleId = bundle.id;
    renderDetail(bundle);
    openMobileDetail();
    draw();
  };
  group.addEventListener("pointerdown", event => event.stopPropagation());
  group.addEventListener("mouseenter", () => {
    if (!preciseHoverViewport()) return;
    const point = projection([bundle.lon, bundle.lat]);
    if (point) showTooltip(bundle, point);
  });
  group.addEventListener("mouseleave", scheduleTooltipHide);
  group.addEventListener("click", activate);
  group.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
      const point = projection([bundle.lon, bundle.lat]);
      if (point) showTooltip(bundle, point);
    }
  });
  return { bundle, group, radius };
}

function overlap(left, right, padding = 0) {
  return left.x < right.x + right.width + padding &&
    left.x + left.width + padding > right.x &&
    left.y < right.y + right.height + padding &&
    left.y + left.height + padding > right.y;
}

function markerSpacing() {
  const scale = projection.scale();
  if (scale < 320) return 31;
  if (scale < 520) return 26;
  if (scale < 900) return 20;
  if (scale < 1500) return 14;
  return 8;
}

function placeMarkers() {
  const centerGeo = projection.invert(CENTER);
  const zoomEligibleNodes = markerNodes.filter(node => projection.scale() >= Number(node.bundle.minZoomScale || 0));
  const zoomEligibleBundles = zoomEligibleNodes.map(node => node.bundle);
  filterSummary.textContent = String(zoomEligibleBundles.length);
  timelineActivity.textContent = `${zoomEligibleBundles.length} jurisdictions · ${uniqueMarketCount(zoomEligibleBundles)} markets`;
  const projectedNodes = zoomEligibleNodes.map(node => {
    const distance = geoDistance(centerGeo, [node.bundle.lon, node.bundle.lat]);
    const point = projection([node.bundle.lon, node.bundle.lat]);
    return { ...node, distance, point, volume: bundleVolume(node.bundle) };
  });
  const horizonNodes = projectedNodes.filter(node => node.point && isFrontHemisphere(node.distance));
  const candidates = horizonNodes.filter(node => markerIntersectsViewport(node.point, node.radius + 5, WIDTH, HEIGHT))
    .sort((left, right) => {
      const selectedDifference = Number(right.bundle.id === selectedBundleId) - Number(left.bundle.id === selectedBundleId);
      if (selectedDifference) return selectedDifference;
      const nationalDifference = Number(right.bundle.scope === "National") - Number(left.bundle.scope === "National");
      if (nationalDifference) return nationalDifference;
      return right.volume - left.volume || left.bundle.id.localeCompare(right.bundle.id);
    });

  markerNodes.forEach(node => {
    node.group.setAttribute("display", "none");
    node.group.classList.toggle("is-selected", node.bundle.id === selectedBundleId);
  });
  leadersLayer.replaceChildren();

  const accepted = [];
  const spacing = markerSpacing();
  for (const node of candidates) {
    const [x, y] = node.point;
    const collides = accepted.some(other => Math.hypot(x - other.x, y - other.y) < spacing + Math.min(node.radius, other.radius) * 0.45);
    if (collides && node.bundle.id !== selectedBundleId) continue;

    node.group.removeAttribute("display");
    node.group.setAttribute("transform", `translate(${x},${y})`);
    node.group.style.opacity = "1";
    node.group.style.pointerEvents = "auto";
    accepted.push({ x, y, radius: node.radius, id: node.bundle.id });
  }

  const marketsVisible = uniqueMarketCount(candidates.map(node => node.bundle));
  hudSummary.textContent = `${accepted.length} markers in frame · ${marketsVisible} individual markets`;
  publishGlobeDiagnostics("politics", {
    scale: projection.scale(),
    total: markerNodes.length,
    zoomGated: markerNodes.length - zoomEligibleNodes.length,
    behindGlobe: projectedNodes.length - horizonNodes.length,
    offscreen: horizonNodes.length - candidates.length,
    collisionHidden: candidates.length - accepted.length,
    visible: accepted.length,
  });
}

function politicsPreferredZoomAnchor() {
  const centerGeo = projection.invert(CENTER);
  const nodes = markerNodes.filter(node => projection.scale() >= Number(node.bundle.minZoomScale || 0)).map(node => ({
    id: node.bundle.id,
    point: projection([node.bundle.lon, node.bundle.lat]),
    radius: node.radius + 5,
    volume: bundleVolume(node.bundle),
    distance: geoDistance(centerGeo, [node.bundle.lon, node.bundle.lat]),
  })).filter(node => isFrontHemisphere(node.distance));
  return preferredZoomAnchor(nodes, { selectedId: selectedBundleId, fallback: CENTER, width: WIDTH, height: HEIGHT });
}

function capitalLabelCandidates() {
  const scale = projection.scale();
  const labels = [];
  if (scale >= 760) labels.push(...stateCapitals.map(capital => ({ ...capital, priority: 2 })));
  if (scale >= 1120) labels.push(...majorWorldCapitals.map(capital => ({ ...capital, code: "", priority: 1 })));
  return labels;
}

function placeCapitalLabels() {
  capitalLabelsLayer.replaceChildren();
  return;
  const labels = capitalLabelCandidates();
  if (!labels.length) return;
  const centerGeo = projection.invert(CENTER);
  const markerBoxes = markerNodes.filter(node => node.group.getAttribute("display") !== "none").map(node => {
    const point = projection([node.bundle.lon, node.bundle.lat]);
    return { x: point[0] - node.radius - 7, y: point[1] - node.radius - 7, width: node.radius * 2 + 14, height: node.radius * 2 + 14 };
  });
  const accepted = [];
  const candidates = labels.filter(label => geoDistance(centerGeo, [label.lon, label.lat]) < Math.PI / 2 - 0.035)
    .sort((left, right) => right.priority - left.priority);

  for (const capital of candidates) {
    const point = projection([capital.lon, capital.lat]);
    if (!point) continue;
    const text = projection.scale() >= 1500 && capital.code ? `${capital.name} ${capital.code}` : capital.name;
    const width = Math.max(26, text.length * 5.55);
    const box = { x: point[0] + 6, y: point[1] - 12, width, height: 14 };
    if (box.x < 4 || box.y < 4 || box.x + box.width > WIDTH - 4 || box.y + box.height > HEIGHT - 4) continue;
    if (accepted.some(other => overlap(box, other, 3))) continue;
    if (markerBoxes.some(other => overlap(box, other, 2))) continue;
    const group = svgElement("g", "capital-label");
    const dot = svgElement("circle");
    dot.setAttribute("cx", String(point[0]));
    dot.setAttribute("cy", String(point[1]));
    dot.setAttribute("r", "1.5");
    const label = svgElement("text");
    label.setAttribute("x", String(point[0] + 6));
    label.setAttribute("y", String(point[1] - 3));
    label.textContent = text;
    group.append(dot, label);
    capitalLabelsLayer.appendChild(group);
    accepted.push(box);
  }
}

function draw() {
  const spherePath = path(sphere);
  sphereClipPath.setAttribute("d", spherePath);
  shadowPath.setAttribute("d", spherePath);
  oceanPath.setAttribute("d", spherePath);
  graticulePath.setAttribute("d", path(graticule));
  countryPaths.forEach(item => item.element.setAttribute("d", path(item.feature) || ""));
  statePaths.forEach(item => item.element.setAttribute("d", path(item.feature) || ""));
  placeMarkers();
  placeCapitalLabels();
  if (!tooltip.hidden && tooltipBundleId) {
    const bundle = activeBundles.find(item => item.id === tooltipBundleId);
    const point = bundle && projection([bundle.lon, bundle.lat]);
    if (point) positionTooltip(point);
    else hideTooltip();
  }
}

function scheduleDraw() {
  if (drawFrame) return;
  drawFrame = requestAnimationFrame(() => {
    drawFrame = null;
    draw();
  });
}

function rebuildMarkers() {
  hideTooltip();
  activeBundles = visibleBundleData();
  markersLayer.replaceChildren();
  markerNodes.splice(0, markerNodes.length, ...activeBundles.map(createMarker));
  filterSummary.textContent = String(activeBundles.length);
  const marketCount = uniqueMarketCount(activeBundles);
  timelineActivity.textContent = `${activeBundles.length} jurisdictions · ${marketCount} markets`;

  let selected = activeBundles.find(bundle => bundle.id === selectedBundleId);
  if (!selected) {
    selected = [...activeBundles].sort((left, right) => bundleVolume(right) - bundleVolume(left))[0] || null;
    selectedBundleId = selected?.id || null;
  }
  renderDetail(selected);
  draw();
}

function renderTimeline() {
  const stop = timelineStops[activeTimelineIndex] || timelineStops[0];
  timelineRange.value = String(activeTimelineIndex);
  timelineEyebrow.textContent = stop.eyebrow;
  timelineLabel.textContent = stop.label;
  timelinePrev.disabled = activeTimelineIndex === 0;
  timelineNext.disabled = activeTimelineIndex === timelineStops.length - 1;
  rebuildMarkers();
}

app.querySelectorAll("[data-geography], [data-office]").forEach(input => input.addEventListener("change", rebuildMarkers));
timelineRange.addEventListener("input", () => {
  activeTimelineIndex = Number(timelineRange.value);
  renderTimeline();
});
timelinePrev.addEventListener("click", () => {
  activeTimelineIndex = Math.max(0, activeTimelineIndex - 1);
  renderTimeline();
});
timelineNext.addEventListener("click", () => {
  activeTimelineIndex = Math.min(timelineStops.length - 1, activeTimelineIndex + 1);
  renderTimeline();
});

svg.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  event.preventDefault();
  cancelAnimationFrame(zoomFrame);
  zoomFrame = null;
  hideTooltip();
  dragState = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    rotation: projection.rotate(),
  };
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("is-dragging");
});

svg.addEventListener("pointermove", event => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const dx = event.clientX - dragState.x;
  const dy = event.clientY - dragState.y;
  const scaleSensitivity = globePanSensitivity(projection.scale());
  projection.rotate([
    dragState.rotation[0] + dx * scaleSensitivity,
    Math.max(-84, Math.min(84, dragState.rotation[1] - dy * scaleSensitivity)),
    dragState.rotation[2],
  ]);
  scheduleDraw();
});

function endDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  dragState = null;
  svg.classList.remove("is-dragging");
  if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
}

svg.addEventListener("pointerup", endDrag);
svg.addEventListener("pointercancel", endDrag);

function localSvgPoint(clientX, clientY) {
  const rect = svg.getBoundingClientRect();
  return [(clientX - rect.left) / rect.width * WIDTH, (clientY - rect.top) / rect.height * HEIGHT];
}

function zoomAt(nextScale, anchor = CENTER) {
  const priorScale = projection.scale();
  const boundedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
  if (Math.abs(boundedScale - priorScale) < 0.01) return;
  const anchorGeo = projection.invert(anchor);
  projection.scale(boundedScale);
  if (anchorGeo) {
    for (let index = 0; index < 3; index += 1) {
      const projected = projection(anchorGeo);
      if (!projected) break;
      const rotation = projection.rotate();
      const radiansToDegrees = 180 / Math.PI;
      projection.rotate([
        rotation[0] + (anchor[0] - projected[0]) / boundedScale * radiansToDegrees,
        Math.max(-84, Math.min(84, rotation[1] - (anchor[1] - projected[1]) / boundedScale * radiansToDegrees)),
        rotation[2],
      ]);
    }
  }
  draw();
}

svg.addEventListener("wheel", event => {
  event.preventDefault();
  hideTooltip();
  const scale = projection.scale();
  const deepZoomDamping = Math.max(0.18, Math.min(1, 520 / scale));
  const factor = Math.exp(-event.deltaY * 0.00135 * deepZoomDamping);
  zoomAt(scale * factor, localSvgPoint(event.clientX, event.clientY));
}, { passive: false });

function animateZoom(multiplier, anchor = CENTER) {
  cancelAnimationFrame(zoomFrame);
  const startScale = projection.scale();
  const targetScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale * multiplier));
  const startedAt = performance.now();
  const duration = 180;
  const frame = now => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    zoomAt(startScale + (targetScale - startScale) * eased, anchor);
    if (progress < 1) zoomFrame = requestAnimationFrame(frame);
    else zoomFrame = null;
  };
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

app.querySelector(".zoom-in").addEventListener("click", () => animateZoom(globeZoomMultiplier(projection.scale()), politicsPreferredZoomAnchor()));
app.querySelector(".zoom-out").addEventListener("click", () => animateZoom(1 / globeZoomMultiplier(projection.scale())));

window.addEventListener("resize", () => {
  hideTooltip();
  scheduleDraw();
});

async function loadPoliticsFeed() {
  try {
    const headers = { Accept: "application/json" };
    if (feedEtag) headers["If-None-Match"] = feedEtag;
    const response = await fetch("/api/politics", { headers });
    if (response.status === 304) return;
    if (!response.ok) throw new Error(response.status === 503 ? "Politics cache is warming" : `Politics feed returned ${response.status}`);
    const payload = await response.json();
    const currentPeriodId = timelineStops[activeTimelineIndex]?.id || "upcoming";
    feedEtag = response.headers.get("etag") || feedEtag;
    electionBundles = Array.isArray(payload.bundles) ? payload.bundles : [];
    timelineStops = Array.isArray(payload.periods) && payload.periods.length ? payload.periods : timelineStops;
    activeTimelineIndex = Math.max(0, timelineStops.findIndex(stop => stop.id === currentPeriodId));
    if (!selectedBundleId && electionBundles.length) selectedBundleId = electionBundles[0].id;
    renderTimelineStops();
    renderTimeline();
    const note = app.querySelector(".feed-status-note");
    if (note) note.textContent = `${payload.marketCount || 0} live Kalshi markets · cached ${snapshotAge(payload.generatedAt)}`;
    const stripLabel = app.querySelector(".feed-status-label");
    if (stripLabel) stripLabel.textContent = "Live cached politics markets";
  } catch (error) {
    hudSummary.textContent = error.message;
    timelineActivity.textContent = "Retrying live feed";
    const note = app.querySelector(".feed-status-note");
    if (note) note.textContent = `${error.message} · retrying`;
    setTimeout(() => void loadPoliticsFeed(), 5000);
  }
}

renderTimelineStops();
renderTimeline();
void loadPoliticsFeed();
setInterval(() => {
  if (!document.hidden) void loadPoliticsFeed();
}, 60_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void loadPoliticsFeed();
});
