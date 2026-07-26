# AGENTS.md

## Cursor Cloud specific instructions

`weather-guesser` is a single-service front-end web app (Vite + React +
TypeScript). There is no backend, database, or external API — the game data is
bundled in `src/game.ts`, so everything runs client-side.

Standard commands live in `package.json` (`dev`, `build`, `lint`, `test`,
`preview`); see `README.md` for the full table. Notes that aren't obvious from
those files:

- The dev server is `npm run dev` and listens on port `5173` with
  `server.host: true` (bound to `0.0.0.0`) so it is reachable from outside the
  VM. It is a long-running process — start it in a background/tmux session, not
  a blocking foreground call.
- `npm run build` runs `tsc -b` first. The TypeScript project references
  (`tsconfig.app.json` / `tsconfig.node.json`) use `composite: true` with
  `emitDeclarationOnly` writing to `node_modules/.tmp`; a clean `node_modules`
  (i.e. after the update script) is enough and no committed build artifacts are
  needed.
- Tests use Vitest with the `jsdom` environment; config lives inside
  `vite.config.ts` (via `defineConfig` from `vitest/config`), not a separate
  `vitest.config.ts`.
