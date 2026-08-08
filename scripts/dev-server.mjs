import { createServer } from "node:http";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker, { runFuturesMaintenance, runGeographicPoll, runPoll } from "../src/worker.js";

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = path.join(projectDirectory, "public");
const preferredListenPort = Number(process.env.MARKET_ATLAS_PORT || process.env.SPORTS_GLOBE_PORT || 8766);
let listenPort = preferredListenPort;
const cache = new Map();
const cacheFile = path.resolve(process.env.MARKET_ATLAS_CACHE_FILE || process.env.SPORTS_GLOBE_CACHE_FILE || path.join(projectDirectory, ".local-cache", "kalshi-kv.json"));
const cacheDirectory = path.dirname(cacheFile);
let pollPromise = null;
let futuresPromise = null;
let geographicPromise = null;
let persistTimer = null;
let persistPromise = Promise.resolve();

async function loadPersistentCache() {
  try {
    const payload = JSON.parse(await readFile(cacheFile, "utf8"));
    for (const [key, value] of Object.entries(payload.entries || {})) {
      if (typeof value === "string") cache.set(key, value);
    }
    console.log(`Restored ${cache.size} cached Kalshi records from disk`);
  } catch (error) {
    if (error?.code !== "ENOENT") console.warn("Could not restore the local Kalshi cache", error?.message || error);
  }
}

async function persistLocalCache() {
  await mkdir(cacheDirectory, { recursive: true });
  const temporaryFile = `${cacheFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, JSON.stringify({
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    entries: Object.fromEntries(cache)
  }), "utf8");
  await rename(temporaryFile, cacheFile);
}

function scheduleCachePersist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistPromise = persistPromise.then(persistLocalCache)
      .catch(error => console.warn("Could not persist the local Kalshi cache", error?.message || error));
  }, 100);
  persistTimer.unref();
}

await loadPersistentCache();

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

const localKv = {
  async get(key, type) {
    const value = cache.get(key);
    if (type === "json" && value) return JSON.parse(value);
    return value || null;
  },
  async put(key, value) {
    cache.set(key, value);
    scheduleCachePersist();
  }
};

async function assetResponse(request) {
  const url = new URL(request.url);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  let filePath = path.resolve(publicDirectory, `.${requestedPath}`);
  if (filePath !== publicDirectory && !filePath.startsWith(`${publicDirectory}${path.sep}`)) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const details = await stat(filePath);
    if (details.isDirectory()) filePath = path.join(filePath, "index.html");
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        "content-type": contentTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
        "cache-control": "no-cache"
      }
    });
  } catch (error) {
    if (error?.code === "ENOENT") return new Response("Not found", { status: 404 });
    throw error;
  }
}

const env = {
  ...process.env,
  ENVIRONMENT: process.env.ENVIRONMENT || "local",
  MARKET_ATLAS_CACHE: localKv,
  ASSETS: { fetch: assetResponse }
};

function updateOddsCache() {
  if (!pollPromise) {
    pollPromise = runPoll(env, Date.now())
      .then(result => {
        const state = cache.get("kalshi:sports:state:v2");
        const lastRunAt = state ? new Date(JSON.parse(state).lastRunAt).toLocaleTimeString() : "unknown";
        console.log(`Kalshi cache updated at ${lastRunAt} (${result.eventCount} events)`);
        return result;
      })
      .catch(error => {
        console.warn("Kalshi cache update failed", error?.message || error);
        throw error;
      })
      .finally(() => {
        pollPromise = null;
      });
  }
  return pollPromise;
}

function updateFuturesCaches() {
  if (!futuresPromise) {
    futuresPromise = (async () => {
      const result = await runFuturesMaintenance(env, Date.now());
      const manifest = cache.get("kalshi:team-futures:manifest:v3");
      const parsed = manifest ? JSON.parse(manifest) : {};
      console.log(`Kalshi futures cache ready (${parsed.seriesRequested || 0} series, ${parsed.eventCount || 0} events)`);
      return result;
    })().catch(error => {
      console.warn("Kalshi futures cache update failed", error?.message || error);
      throw error;
    }).finally(() => {
      futuresPromise = null;
    });
  }
  return futuresPromise;
}

function updateGeographicCaches() {
  if (!geographicPromise) {
    geographicPromise = runGeographicPoll(env, Date.now())
      .then(result => {
        console.log(`Kalshi geographic cache ready (${result.politics.bundleCount} politics locations, ${result.politics.marketCount} politics markets; ${result.weather.bundleCount} weather locations, ${result.weather.marketCount} weather markets)`);
        return result;
      })
      .catch(error => {
        console.warn("Kalshi geographic cache update failed", error?.message || error);
        throw error;
      })
      .finally(() => {
        geographicPromise = null;
      });
  }
  return geographicPromise;
}

const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url?.startsWith("/api/odds") && !cache.has("kalshi:sports:public:v2")) {
      updateOddsCache().catch(() => null);
    }
    const requestHost = incoming.headers.host || `127.0.0.1:${listenPort}`;
    const requestUrl = new URL(incoming.url || "/", `http://${requestHost}`);
    const request = new Request(requestUrl, { method: incoming.method, headers: incoming.headers });
    const response = await worker.fetch(request, env, {
      waitUntil(promise) {
        Promise.resolve(promise).catch(error => console.warn("Background task failed", error?.message || error));
      }
    });
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end("Local server error");
  }
});

function startListening() {
  server.listen(listenPort, "0.0.0.0");
}

server.on("listening", () => {
  console.log(`Market Atlas: http://localhost:${listenPort}`);
  if (listenPort !== preferredListenPort) console.log(`Port ${preferredListenPort} was occupied; selected ${listenPort} instead`);
  console.log("Kalshi cache: hourly baseline · 15m game day · 5m pregame · 1m live");
  updateGeographicCaches().catch(() => null)
    .finally(() => updateOddsCache().catch(() => null))
    .finally(() => updateFuturesCaches().catch(() => null));
});

server.on("error", error => {
  if (error?.code === "EADDRINUSE" && listenPort < preferredListenPort + 20) {
    listenPort += 1;
    startListening();
    return;
  }
  console.error("Market Atlas server failed", error);
  process.exitCode = 1;
});

startListening();

const pollTimer = setInterval(() => updateOddsCache().catch(() => null), 60 * 1000);
pollTimer.unref();
const geographicTimer = setInterval(() => updateGeographicCaches().catch(() => null), 60 * 1000);
geographicTimer.unref();
const futuresTimer = setInterval(() => {
  updateOddsCache().catch(() => null).finally(() => updateFuturesCaches().catch(() => null));
}, 60 * 60 * 1000);
futuresTimer.unref();

async function stopServer() {
  clearInterval(pollTimer);
  clearInterval(geographicTimer);
  clearInterval(futuresTimer);
  clearTimeout(persistTimer);
  await persistPromise;
  await persistLocalCache().catch(error => console.warn("Could not persist cache during shutdown", error?.message || error));
  server.close();
}

process.once("SIGINT", () => void stopServer());
process.once("SIGTERM", () => void stopServer());
