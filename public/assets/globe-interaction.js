export const GLOBE_HORIZON = Math.PI / 2;

export function isFrontHemisphere(distance) {
  return Number.isFinite(distance) && distance <= GLOBE_HORIZON + 1e-6;
}

export function markerIntersectsViewport(point, radius, width, height) {
  if (!Array.isArray(point) || point.length < 2) return false;
  const [x, y] = point;
  const visualRadius = Math.max(0, Number(radius) || 0);
  return Number.isFinite(x) && Number.isFinite(y)
    && x >= -visualRadius
    && x <= width + visualRadius
    && y >= -visualRadius
    && y <= height + visualRadius;
}

export function globePanSensitivity(scale, baseScale = 235) {
  const boundedScale = Math.max(1, Number(scale) || baseScale);
  const scaleFactor = Math.max(0.12, Math.min(1, baseScale / boundedScale));
  return 0.22 * Math.pow(scaleFactor, 0.76);
}

export function globeZoomMultiplier(scale) {
  const currentScale = Math.max(1, Number(scale) || 1);
  if (currentScale < 600) return 1.3;
  if (currentScale < 1400) return 1.25;
  if (currentScale < 3000) return 1.2;
  return 1.16;
}

export function preferredZoomAnchor(nodes, {
  selectedId = null,
  fallback = [310, 280],
  width = 620,
  height = 560,
} = {}) {
  const visible = (nodes || []).filter(node => markerIntersectsViewport(node.point, node.radius || 0, width, height));
  const selected = visible.find(node => node.id === selectedId);
  if (selected) return [...selected.point];
  if (!visible.length) return [...fallback];
  let totalWeight = 0;
  let x = 0;
  let y = 0;
  visible.forEach(node => {
    const weight = Math.max(1, Math.log10(Math.max(0, Number(node.volume) || 0) + 10));
    totalWeight += weight;
    x += node.point[0] * weight;
    y += node.point[1] * weight;
  });
  return [x / totalWeight, y / totalWeight];
}

export function stableDistanceClusters(points, distanceThreshold) {
  const sorted = [...(points || [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const parent = sorted.map((_, index) => index);
  const find = index => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const join = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (leftRoot < rightRoot) parent[rightRoot] = leftRoot;
    else parent[leftRoot] = rightRoot;
  };
  for (let left = 0; left < sorted.length; left += 1) {
    for (let right = left + 1; right < sorted.length; right += 1) {
      if (Math.hypot(sorted[left].anchorX - sorted[right].anchorX, sorted[left].anchorY - sorted[right].anchorY) < distanceThreshold) {
        join(left, right);
      }
    }
  }
  const groups = new Map();
  sorted.forEach((point, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(point);
  });
  return [...groups.values()].map(members => ({
    members,
    x: members.reduce((sum, member) => sum + member.anchorX, 0) / members.length,
    y: members.reduce((sum, member) => sum + member.anchorY, 0) / members.length,
  }));
}

export function publishGlobeDiagnostics(category, diagnostics) {
  if (typeof window === "undefined") return;
  const payload = {
    ...diagnostics,
    updatedAt: Date.now(),
  };
  window.__marketAtlasGlobeDiagnostics ||= {};
  window.__marketAtlasGlobeDiagnostics[category] = payload;
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(`data-globe-diagnostics-${category}`, JSON.stringify(payload));
  }
}
