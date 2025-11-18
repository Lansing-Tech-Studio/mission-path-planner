# Mission Path Planner - Test Suite

Robust testing infrastructure for the FLL Mission Path Planner application.

## Test Suite Overview

This project includes comprehensive testing with:
- **Unit Tests** (Jest + jsdom): Test pure logic in PathCalculator, BlockManager, RobotConfig, StorageManager
- **E2E Tests** (Playwright): Test full UI interactions, program blocks, import/export, print functionality
- **CI/CD**: GitHub Actions workflow for automated testing on PRs

## Quick Start

### Install Dependencies

```powershell
npm install
```

### Install Playwright Browsers

```powershell
npm run pw:install
```

### Run All Tests

```powershell
npm test
```

### Run Specific Test Suites

```powershell
# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run coverage
```

### Run Dev Server

```powershell
npm run dev
```

Server runs at `http://localhost:5173`

## Test Structure

```
tests/
├── unit/               # Jest unit tests
│   ├── pathCalculator.spec.js
│   ├── blocks.spec.js
│   ├── robot.spec.js
│   └── storage.spec.js
├── e2e/                # Playwright E2E tests
│   ├── basic-ui.spec.ts
│   ├── program-blocks.spec.ts
│   ├── canvas-interaction.spec.ts
│   ├── import-export.spec.ts
│   └── print.spec.ts
├── helpers/            # Test utilities
│   └── evalSource.js
└── setup/              # Test configuration
    └── jest.setup.js
```

## Coverage Goals

- **Branches**: 70%
- **Functions**: 75%
- **Lines**: 75%
- **Statements**: 75%

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

Coverage reports and Playwright test results are uploaded as artifacts.

## Known Issues

### Unit Test Setup

The unit tests require a helper to load non-module JavaScript files into jsdom. Currently the `evalSourceInWindow` function needs adjustment to properly expose classes to the test environment.

**Temporary workaround**: The classes in `js/*.js` files are declared at top-level but need to be explicitly attached to `window` to be accessible in tests. You can either:

1. Modify the helper to use `Function` constructor:
   ```javascript
   function evalSourceInWindow(window, filePath) {
     const absolutePath = path.join(__dirname, '../../', filePath);
     const source = fs.readFileSync(absolutePath, 'utf-8');
     const func = new Function('window', 'document', source);
     func(window, window.document);
   }
   ```

2. Or temporarily add `window.ClassName = ClassName;` exports to the source files for testing

### E2E Tests

E2E tests should work without modification once Playwright is installed.

## Writing Tests

### Unit Test Example

```javascript
const { evalSourceInWindow, createMinimalDOM } = require('../helpers/evalSource');

describe('MyClass', () => {
  let MyClass, instance, dom;

  beforeEach(() => {
    dom = createMinimalDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    
    evalSourceInWindow(dom.window, 'js/myFile.js');
    MyClass = dom.window.MyClass;
    instance = new MyClass();
  });

  it('should do something', () => {
    expect(instance.method()).toBe(expected);
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('should do something in the UI', async ({ page }) => {
  await page.goto('/');
  await page.locator('#myButton').click();
  await expect(page.locator('#result')).toHaveText('Expected');
});
```

## Debugging

### Jest Tests

```powershell
# Run with debugging
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Run specific test file
npm run test:unit -- tests/unit/pathCalculator.spec.js
```

### Playwright Tests

```powershell
# Run in headed mode
npx playwright test --headed

# Run with debug mode
npx playwright test --debug

# Run specific test file
npx playwright test tests/e2e/basic-ui.spec.ts
```

## Contributing

When adding new features:
1. Write unit tests for pure logic
2. Write E2E tests for user-facing features
3. Ensure coverage thresholds are met
4. Run all tests before submitting PR

## License

Same as parent project
