# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Mission Path Planner is a client-side, zero-dependency web app for planning and visualizing FIRST LEGO League (FLL) robot paths for Spike Prime robots. It runs entirely in the browser (deployable as static files to GitHub Pages) — there is no build step and no backend. The "dev server" is only a static file host used for manual testing and Playwright.

## Commands

```bash
npm ci                      # install dependencies
npm run pw:install          # install Playwright Chromium (first time only)

npm run dev                 # static file server at http://localhost:5173

npm run test:unit           # Jest unit + integration tests (jsdom)
npm run test:e2e            # Playwright e2e tests (auto-starts dev server)
npm test                    # unit then e2e
npm run test:ci             # jest --coverage + playwright
npm run coverage            # unit tests with coverage report
npm run test:watch          # jest in watch mode

# Run a single unit test file / by name:
npx jest tests/unit/pathCalculator.spec.js
npx jest -t "calculates straight move"

# Run a single e2e test:
npx playwright test tests/e2e/program-blocks.spec.ts
```

Jest enforces coverage thresholds (branches 60%, functions 70%, lines/statements 75%) over `js/**/*.js` and `app.js`.

## Architecture

The app is plain ES6 with no module system. Each file in `js/` defines one class and exposes it via a dual-export pattern at the bottom of the file — `window.X` for the browser and `module.exports = X` for Jest. **When adding a new class file, replicate this footer and add a `<script>` tag to `index.html`** (load order matters; scripts are not modules).

- `app.js` — `MissionPlanner`, the top-level coordinator. Instantiates all the modules below, wires DOM event listeners, owns the debounced auto-save to `localStorage`, panel resize/collapse, and the central `update()` render loop. This is the only file that reads DOM input values and orchestrates the others.
- `js/robot.js` — `RobotConfig`: robot dimensions and wheel specs (the physical parameters that drive path math).
- `js/blocks.js` — `BlockManager`: the block-based program (text + move blocks), serialized as a program array.
- `js/pathCalculator.js` — `PathCalculator`: **pure domain logic.** Converts a program + robot config into a path. Models differential drive: `calculateStraightMove` (direction 0) vs `calculateArcMove` (turning), using wheel circumference and wheel base to compute turn radius. Direction ranges -100 (sharp left) to +100 (sharp right); ±100 pivots in place. No DOM access — easiest module to unit test.
- `js/canvas.js` — `CanvasRenderer`: HTML5 canvas drawing of the mat, robot, and path.
- `js/storage.js` — `StorageManager`: `localStorage` persistence — last-state auto-restore plus named saved robots and programs, with quota/usage tracking that surfaces a warning when storage fills.
- `js/print.js` — `PrintManager`: printable plan generation.

Data flows one way: DOM inputs → `MissionPlanner.getData()` → `PathCalculator` → `CanvasRenderer`. State round-trips through JSON (export/import files and `localStorage`).

Domain conversion constants (wheel circumferences, mat dimensions, cm/inch/rotation conversions) are documented in README.md "Unit Conversion Reference" — consult it before touching path math.

## Testing notes

- Unit/integration tests (`tests/unit/`, `tests/integration/`) run under Jest + jsdom; e2e tests (`tests/e2e/`) run under Playwright against the dev server.
- `tests/helpers/evalSource.js` loads a source file into a jsdom window by regex-extracting class names and attaching them to `window` — this is how DOM-coupled classes are tested without a module system. `createMinimalDOM()` provides a fixture with all required input elements.
- `tests/setup/jest.setup.js` mocks `Image`, `URL.createObjectURL`, `window.print`, and uses `jest-canvas-mock`; it clears mocks and `localStorage` after each test.
- CI (`.github/workflows`) runs unit-with-coverage then e2e on push/PR to `main`/`develop`.
