# AGENTS.md

## Cursor Cloud specific instructions

`weather-guesser` is a single-service front-end web app (Vite + React +
TypeScript). There is no backend or database. It calls two **keyless** external
services at runtime:

- **Open-Meteo** (`api.open-meteo.com`, `geocoding-api.open-meteo.com`) for live
  weather + geocoding.
- **Carto basemaps** (`basemaps.cartocdn.com`) for the default keyless MapLibre
  vector style (Voyager), rendered with a 3D globe projection.

No API keys or secrets are required for the default setup. This environment has
unrestricted egress, so both services are reachable; if they were ever blocked,
the weather layer falls back to a deterministic local simulation
(`simulateWeather` in `src/weather/openMeteo.ts`), but the **map tiles have no
offline fallback** and would appear blank without network.

**Map provider selection** lives in `src/components/`: `MapView.tsx` picks
`MapboxMapView` when `VITE_MAPBOX_TOKEN` is set (Mapbox GL, lazily imported so
`mapbox-gl` stays out of the default bundle) and otherwise `MapLibreMapView`
(keyless default). `VITE_MAP_STYLE` overrides the style URL. The Mapbox path
requires a Mapbox token and is not exercised without one, so test map changes
against the default MapLibre path unless a token is provided.

Standard commands live in `package.json` (`dev`, `build`, `lint`, `test`,
`preview`); see `README.md` for the full table. Non-obvious notes:

- The dev server is `npm run dev` on port `5173` with `server.host: true`
  (bound to `0.0.0.0`). It's long-running — start it in tmux/background, not a
  blocking foreground call.
- On dev-server startup Vite may print a one-time warning about
  `maplibre-gl-worker.mjs` "does not exist" in the optimize-deps directory. This
  is benign: Vite optimizes the MapLibre worker on demand when a real browser
  first loads the page, and the map renders correctly. `curl` cannot verify this
  (it doesn't execute JS) — check in a real browser.
- Tests run under Vitest with the `jsdom` environment; config lives inside
  `vite.config.ts` (via `defineConfig` from `vitest/config`), not a separate
  `vitest.config.ts`. MapLibre uses WebGL and does not run in jsdom, so
  component tests mock `./components/MapView` and stub `fetch`.
- `npm run build` runs `tsc -b` first; the TS project references
  (`tsconfig.app.json` / `tsconfig.node.json`) use `composite: true` with
  `emitDeclarationOnly` writing to `node_modules/.tmp`. The build warns that the
  MapLibre chunk is >500 kB — this is expected for the map library and not an
  error.
