// MOTT — Malayalam OTT catalog addon (Stremio/Nuvio protocol)
const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const TMDB_KEY = process.env.TMDB_API_KEY;
if (!TMDB_KEY) {
  console.error("Missing TMDB_API_KEY env var — get a free one at https://www.themoviedb.org/settings/api");
  process.exit(1);
}

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

// ---- tiny in-memory cache so we don't hammer TMDB on every scroll ----
const cache = new Map();
const TTL = 1000 * 60 * 60 * 6; // 6 hours
async function cachedGet(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < TTL) return hit.data;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  const data = await res.json();
  cache.set(url, { data, time: Date.now() });
  return data;
}

// TMDB id -> IMDb id, so Nuvio's other addons (stream sources, Cinemeta) recognize these titles
async function toImdbId(tmdbId) {
  try {
    const data = await cachedGet(`${TMDB}/movie/${tmdbId}/external_ids?api_key=${TMDB_KEY}`);
    return data.imdb_id || null;
  } catch {
    return null;
  }
}

async function discoverLatestOnOtt(skip) {
  const page = Math.floor((skip || 0) / 20) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const url = `${TMDB}/discover/movie?api_key=${TMDB_KEY}` +
    `&with_original_language=ml&primary_release_date.lte=${today}` +
    `&watch_region=IN&with_watch_monetization_types=flatrate|ads|rent|buy` +
    `&sort_by=primary_release_date.desc&page=${page}`;

  const data = await cachedGet(url);
  const results = data.results || [];

  // Resolve IMDb ids in small batches to stay under TMDB's rate limit
  const metas = [];
  const batchSize = 5;
  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize);
    const resolved = await Promise.all(batch.map(async m => {
      const imdbId = await toImdbId(m.id);
      return {
        id: imdbId || `tmdb:${m.id}`,
        type: "movie",
        name: m.title,
        poster: m.poster_path ? IMG + m.poster_path : undefined,
        background: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : undefined,
        description: m.overview,
        releaseInfo: (m.release_date || "").slice(0, 4)
      };
    }));
    metas.push(...resolved);
  }
  return metas.filter(m => m.name);
}

async function getMeta(imdbOrTmdbId) {
  // Prefer Cinemeta (richer, community metadata) when we have a real IMDb id
  if (imdbOrTmdbId.startsWith("tt")) {
    try {
      const data = await cachedGet(`https://v3-cinemeta.strem.io/meta/movie/${imdbOrTmdbId}.json`);
      if (data.meta) return data.meta;
    } catch {
      // fall through to TMDB
    }
  }
  const tmdbId = imdbOrTmdbId.replace("tmdb:", "");
  const item = await cachedGet(`${TMDB}/movie/${tmdbId}?api_key=${TMDB_KEY}`);
  return {
    id: imdbOrTmdbId,
    type: "movie",
    name: item.title,
    poster: item.poster_path ? IMG + item.poster_path : undefined,
    description: item.overview,
    releaseInfo: (item.release_date || "").slice(0, 4),
    genres: (item.genres || []).map(g => g.name),
    runtime: item.runtime ? `${item.runtime} min` : undefined
  };
}

const manifest = {
  id: "org.mott.malayalam",
  version: "1.0.0",
  name: "MOTT",
  description: "Malayalam movies currently on OTT in India, newest release first",
  resources: ["catalog", "meta"],
  types: ["movie"],
  idPrefixes: ["tt", "tmdb:"],
  catalogs: [
    {
      type: "movie",
      id: "mott-latest",
      name: "MOTT — Latest on OTT",
      extra: [{ name: "skip" }]
    }
  ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ id, extra }) => {
  if (id !== "mott-latest") return { metas: [] };
  const metas = await discoverLatestOnOtt(extra && extra.skip);
  return { metas };
});

builder.defineMetaHandler(async ({ id }) => {
  const meta = await getMeta(id);
  return { meta };
});

module.exports = builder.getInterface();
