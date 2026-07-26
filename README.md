# weather-guesser

> Note: the repository name is historical. The app is now a **DMV Emergency
> Response** simulator.

A browser-based, **living CAD dispatch simulation** of the Washington, DC /
Northern Virginia / Southern Maryland (DMV) region:

1. **A living 3D map** — real DMV fire, EMS, police, and hospital facilities on
   an interactive [MapLibre](https://maplibre.org/) map with a tilted camera,
   terrain relief, and 3D building extrusions (zoom into DC to see them).
2. **Emergent incidents** — medical, fire, crime, traffic, and HazMat calls are
   generated over time, weighted by time-of-day (rush hour, overnight) and by
   **live DC weather** from [Open-Meteo](https://open-meteo.com/) (bad weather
   raises traffic-collision likelihood). Click the map to report your own.
3. **Automatic dispatch & response** — the nearest available appropriate unit is
   dispatched, drives to the scene, works the call, then returns to quarters.
   Units and incidents animate on the map; a CAD panel shows the clock, unit
   availability, an incident queue (with manual **Dispatch**), and a radio log.
4. **Traffic + weather** — a regional traffic index (by time-of-day, amplified
   by live weather), a **Traffic log** of corridor congestion (I-495, I-66,
   I-395, …), and an explicit weather→traffic impact readout.

> Rendering note: MapLibre renders on demand. In a normal focused browser the
> map shows tilted/3D on load; in an unfocused/automated browser the render loop
> can stay idle until you interact (scroll/drag/zoom), at which point the 3D
> view engages.

### Scope note

This is an achievable, web-scale slice of the "emergency response simulator"
concept — a real regional map with an unscripted incident/dispatch loop. It is
**not** a photorealistic 3D world: there is no ray tracing, no per-building
interiors, no millions-of-agents traffic sim, and no multiplayer. Those belong
to a native game engine and are out of scope for this repo.

Built with **Vite + React + TypeScript**, **MapLibre GL JS** (via
`react-map-gl`) for the map, and **Open-Meteo** for weather. **No API keys or
secrets are required** — by default the map uses the free, keyless
[Carto Voyager](https://carto.com/basemaps/) vector style rendered with a modern
**3D globe** projection, and Open-Meteo needs no key. If the weather API is ever
unreachable, the app falls back to a deterministic local weather **simulation**
so it keeps working offline.

### Map provider (optional)

The map provider is configurable via environment variables (create a `.env`
file or set them in your shell):

| Variable            | Effect                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| _(none)_            | Default: keyless MapLibre + Carto Voyager style + 3D globe.                               |
| `VITE_MAPBOX_TOKEN` | Switches to **Mapbox GL** with the `mapbox://styles/mapbox/standard` 3D style.            |
| `VITE_MAP_STYLE`    | Override the style URL for whichever provider is active (e.g. a MapTiler/Mapbox style).   |

`mapbox-gl` is loaded lazily, so it's only fetched when `VITE_MAPBOX_TOKEN` is
set. A Mapbox account/token is required to use the Mapbox provider.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm 10+
- Network access to `open-meteo.com` and `openfreemap.org` for live data/tiles
  (the app degrades gracefully to simulated weather if the API is blocked)

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Available scripts

| Script               | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with hot reload (port 5173) |
| `npm run build`      | Type-check (`tsc -b`) and build for production         |
| `npm run preview`    | Serve the production build locally                     |
| `npm run lint`       | Run ESLint over the project                            |
| `npm test`           | Run the Vitest unit/component suite once               |
| `npm run test:watch` | Run Vitest in watch mode                               |

## Project structure

```
index.html                     # Vite entry HTML
src/
  main.tsx                     # React entry point
  App.tsx                      # CAD dispatch UI (map + clock + incidents + radio log)
  game.ts                      # Seeded RNG helper + sample city list
  sim/
    geo.ts                     # Haversine distance + move-toward helpers
    types.ts                   # Station / Unit / Incident / SimState types
    stations.ts                # Real DMV facilities + incident hotspots
    engine.ts                  # Pure sim: spawn, dispatch, movement, resolution
  components/
    MapView.tsx                # Provider selector (MapLibre default, Mapbox if token)
    MapLibreMapView.tsx        # Keyless MapLibre map (Carto Voyager), renders markers
    MapboxMapView.tsx          # Mapbox GL map (used when VITE_MAPBOX_TOKEN is set)
    MarkerContent.tsx          # Shared marker rendering (stations/units/incidents)
    mapTypes.ts                # Shared map props/ref types + env config
  weather/
    openMeteo.ts               # Open-Meteo client + offline simulation fallback
  *.test.ts(x)                 # Vitest unit + component tests
  index.css                    # Styles
  test/setup.ts                # Test setup (jest-dom matchers)
```
