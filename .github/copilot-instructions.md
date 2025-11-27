# Mission Path Planner - AI Agent Instructions

## Project Overview

Browser-based FLL (FIRST LEGO League) robot path planner. Pure JavaScript, no frameworks - runs entirely client-side with GitHub Pages deployment.

## Git Conventions

- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/) format
  - `feat: add new block type` / `fix: correct arc calculation` / `docs: update README`
- **Branches**: Prefix with type: `feat/...`, `bug/...`, `docs/...`, `refactor/...`
- **CI/CD**: All tests run via GitHub Actions on PRs; deploys to GitHub Pages

## Architecture

### Core Modules (`js/`)

| Module | Class | Responsibility |
|--------|-------|----------------|
| `robot.js` | `RobotConfig` | Robot dimensions, wheel specs, presets (DadBot, CoopBot) |
| `canvas.js` | `CanvasRenderer` | Mat rendering, robot visualization, drag interactions |
| `blocks.js` | `BlockManager` | Program blocks (move/text), drag-and-drop reordering |
| `pathCalculator.js` | `PathCalculator` | Differential drive simulation, arc/straight movement |
| `storage.js` | `StorageManager` | JSON import/export, localStorage persistence |
| `print.js` | `PrintManager` | Print layout generation |

### Data Flow

```
User Input → BlockManager → PathCalculator → CanvasRenderer
                ↑                              ↓
            StorageManager ←──────────────── app.js (coordinator)
```

`app.js` contains `MissionPlanner` class that initializes and coordinates all modules. Global instance at `window.missionPlanner`.

### Coordinate System

- Origin (0,0) is **lower-left** corner of FLL mat
- X increases rightward, Y increases upward
- Angle 0° = facing **up/north** (not right)
- Robot position = bounding box lower-left corner; path uses axle center

## Development Environment

**Uses Nix flake** for reproducible environment (Node.js 24 + Playwright deps):

```bash
# Enter dev shell (auto-loads with direnv if configured)
nix develop

# First-time setup
npm install
npx playwright install chromium
```

**Without Nix**: Requires Node.js 18+ and system libraries for Playwright.

## Testing Commands

```bash
npm run test:unit      # Jest unit tests (121 tests)
npm run test:e2e       # Playwright e2e tests (19 tests)
npm test               # Both suites
npm run test:watch     # Jest watch mode
npm run coverage       # Unit tests with coverage report
npm run dev            # Dev server at http://localhost:5173
```

## Test Structure

- **Unit tests** (`tests/unit/`): Jest + jsdom, test pure logic
- **E2E tests** (`tests/e2e/`): Playwright + Chromium, test UI interactions
- **Helper** (`tests/helpers/evalSource.js`): Loads non-module JS into jsdom context

### Unit Test Pattern

```javascript
const { evalSourceInWindow, createMinimalDOM } = require('../helpers/evalSource');

describe('MyClass', () => {
  let instance, dom;
  beforeEach(() => {
    dom = createMinimalDOM();
    evalSourceInWindow(dom.window, 'js/myFile.js');
    instance = new dom.window.MyClass();
  });
  // tests...
});
```

### E2E Test Pattern

```typescript
test('feature', async ({ page }) => {
  await page.goto('/');
  // Program tab is default active - switch to Setup for config elements
  await page.locator('button[data-tab="setup"]').click();
  await page.locator('#robotPreset').selectOption('dadbot');
});
```

**Important**: Default active tab is **Program**, not Setup. Navigate to Setup tab before interacting with config elements (#teamName, #robotPreset, #matSelect, etc.).

## Code Conventions

- **No modules/bundlers**: Plain `<script>` tags, classes on global scope
- **Class-per-file**: Each `js/*.js` exports one class to `window`
- **DOM IDs match config**: `#robotLength` → `robotConfig.length`
- **Trigger updates**: Call `window.missionPlanner.update()` after state changes
- **Coverage thresholds**: 60% branches, 70% functions, 75% lines

## Key Implementation Details

### PathCalculator Math

- Uses differential drive kinematics for arc movement
- Direction -100 to +100 controls turn sharpness (±100 = pivot in place)
- Wheel positions tracked for accurate path visualization
- **Wheel calculations**: `distance = (degrees / 360) × wheelCircumference`

### FLL Dimensions

| Component | Dimensions |
|-----------|------------|
| FLL Table (inner) | 243.84cm × 121.92cm (96" × 48" / 8ft × 4ft) |
| FLL Mat | 236cm × 114cm (2360mm × 1140mm) |
| Spike Prime standard wheel | 17.5cm circumference |
| Spike Prime large wheel | 27.6cm circumference |
| LEGO 62.4mm tire | 19.6cm circumference |

### CanvasRenderer Scaling

- Table and mat dimensions defined above
- Mat positioned within table bounds (centered or right-aligned)
- Dynamic scale factor based on canvas size

### BlockManager Validation

Move blocks have `valid` property - invalid blocks stop path calculation. Text blocks are decorative (skipped in path calc).

## File Quick Reference

| Path | Purpose |
|------|---------|
| `index.html` | Single-page app, all sections in tabs |
| `styles.css` | Responsive layout, print styles |
| `app.js` | Main coordinator, panel resize logic |
| `jest.config.js` | Unit test config with coverage thresholds |
| `playwright.config.ts` | E2E config, auto-starts dev server |
| `flake.nix` | Nix dev environment with Playwright deps |
