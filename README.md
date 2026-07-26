# weather-guesser

An interactive browser game built around **live weather** and **simulation**:

1. **Pick a location** on a world map (click the map, search a city, or hit
   “Surprise me”).
2. **Predict the temperature** there with a slider.
3. **Reveal & score** — the app pulls the *live* current temperature and short
   forecast from [Open-Meteo](https://open-meteo.com/) and scores how close you
   were.
4. **See the ripple effects** — a response/impact simulation shows how that
   weather drives modelled systems (energy demand, irrigation need, traffic
   risk).

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
  App.tsx                      # Orchestrates map, prediction, scoring, panels
  game.ts                      # Scoring + RNG + city list (quick-pick)
  components/
    MapView.tsx                # Provider selector (MapLibre default, Mapbox if token)
    MapLibreMapView.tsx        # Keyless MapLibre map (Carto Voyager + 3D globe)
    MapboxMapView.tsx          # Mapbox GL map (used when VITE_MAPBOX_TOKEN is set)
    mapTypes.ts                # Shared map props/ref types + env config
    ForecastStrip.tsx          # 5-day forecast strip
    SimulationPanel.tsx        # Response/impact simulation bars
  weather/
    openMeteo.ts               # Open-Meteo client + offline simulation fallback
  simulation/
    response.ts                # Pure weather-response models (energy/irrigation/traffic)
  *.test.ts(x)                 # Vitest unit + component tests
  index.css                    # Styles
  test/setup.ts                # Test setup (jest-dom matchers)
```
