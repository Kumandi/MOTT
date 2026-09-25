# MOTT — Malayalam OTT Catalog

A from-scratch Nuvio/Stremio catalog addon: one catalog, "Latest on OTT",
pulling Malayalam movies currently streaming/rentable/buyable in India
(via TMDB), sorted newest release first. Each title resolves to a real
IMDb id where possible, so other addons (stream sources, Cinemeta) recognize
it automatically.

## 1. Get a free TMDB API key
https://www.themoviedb.org/settings/api → request a key (v3 auth).

## 2. Run locally
```
npm install
TMDB_API_KEY=your_key_here npm start
```
- Manifest: `http://127.0.0.1:7000/manifest.json`
- Homepage with live poster grid: `http://127.0.0.1:7000/`

## 3. Install in Nuvio
Settings → Addons → add addon by URL → paste your manifest URL.
Testing locally on a phone/TV needs both devices on the same network,
using your PC's local IP instead of `127.0.0.1`.

## 4. Deploy for free so the link always works
**Render.com** (recommended, same as before):
1. Push this folder to a new GitHub repo.
2. Render → New → Web Service → connect that repo.
3. Build command: `npm install` — Start command: `node server.js`.
4. Add environment variable `TMDB_API_KEY` with your key.
5. Deploy. Your manifest will be at `https://your-app.onrender.com/manifest.json`.

Free tier sleeps after ~15 min idle — first request after that takes
30-60s to wake up.

## Notes
- Catalog-only — no streams. Pair with a stream addon (e.g. Torrentio) in
  Nuvio for playback.
- 6-hour in-memory cache on TMDB responses, so repeated scrolling/browsing
  doesn't re-hit the API every time.
- `watch_region` is hardcoded to `IN` in `addon.js` — change it there for a
  different country's OTT availability.
