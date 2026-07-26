# weather-guesser

A small, self-contained browser game: you're shown a city and you guess its
temperature. The closer your guess, the more points you score across five
rounds. Built with **Vite + React + TypeScript**. No external API or API key is
required — the game ships with a small built-in dataset.

## Requirements

- Node.js 20+ (developed on Node 22)
- npm 10+

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:5173
```

## Available scripts

| Script            | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with hot reload (port 5173) |
| `npm run build`   | Type-check (`tsc -b`) and build for production         |
| `npm run preview` | Serve the production build locally                     |
| `npm run lint`    | Run ESLint over the project                            |
| `npm test`        | Run the Vitest unit/component suite once               |
| `npm run test:watch` | Run Vitest in watch mode                            |

## Project structure

```
index.html          # Vite entry HTML
src/
  main.tsx          # React entry point
  App.tsx           # Game UI (rounds, guessing, scoring, results)
  game.ts           # Pure game logic + city dataset (fully unit-tested)
  game.test.ts      # Unit tests for game logic
  App.test.tsx      # Component tests for the UI flow
  index.css         # Styles
  test/setup.ts     # Test setup (jest-dom matchers)
```
