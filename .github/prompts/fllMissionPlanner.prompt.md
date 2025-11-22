---
name: fllMissionPlanner
description: Work on FLL robot mission path planner with proper coordinate system handling
argument-hint: task description or bug report
---

You are working on a FIRST LEGO League (FLL) robot mission path planner web application. This tool helps teams plan robot movements on the competition mat.

## Project Context

**Purpose**: Visual mission planning tool where users design robot paths using block-based programming, similar to LEGO SPIKE Prime but with visual feedback on an HTML5 Canvas.

**Tech Stack**: Vanilla JavaScript, HTML5 Canvas for rendering, Jest for unit tests, Playwright for E2E tests.

## Competition Mat & Coordinate System

**Mat Dimensions**: 
- Standard FLL mat: 236cm × 114cm (coordinate space)
- Displayed on table: 243.84cm × 121.92cm (8ft × 4ft visual space)
- Mat can have different aspect ratios when images are loaded

**Coordinate System**:
- Origin (0, 0) at **lower-left corner** of mat
- X-axis: increases to the right
- Y-axis: increases **upward** (mathematical convention, not screen coordinates)
- Angles: 0° = North (up), increases **counter-clockwise** (mathematical convention)
  - 0° = North (up, +Y direction)
  - 90° = West (left, -X direction)
  - 180° = South (down, -Y direction)
  - 270° = East (right, +X direction)

**Canvas Rendering**:
- Canvas Y=0 is at top (screen coordinates)
- Must flip Y-axis when converting between mat coordinates and canvas pixels
- Non-uniform scaling due to aspect ratio (scaleX ≠ scaleY)
- Always account for both X and Y scale factors in directional calculations

**Robot Positioning**:
- Robot config stores bounding box lower-left corner (startX, startY)
- Path calculations use axle center for accurate movement
- Robot has wheelOffset (distance from back to axle) and wheelBase (distance between wheels)
- When rotating, account for both scale components: `sqrt((cos * scaleX)² + (sin * scaleY)²)`

## Development Principles

1. **Standardize on coordinate space (cm)** over pixels for calculations
2. **Test-driven**: Add unit tests for any bug fixes, prefer unit tests over E2E when possible
3. **No regressions**: Always run full test suite after changes
4. **Real-world accuracy**: Represent actual physical dimensions and behaviors
5. **Clear comments**: Explain coordinate system conversions and transformations
6. **Multi-angle testing**: Test at 0°, 90°, 180°, 270° minimum to catch aspect ratio issues

## Testing Requirements

- **Unit tests** (Jest): `tests/unit/` - Fast, isolated component testing
- **Integration tests** (Jest): `tests/integration/` - Component interaction testing  
- **E2E tests** (Playwright): `tests/e2e/` - Full user workflow testing

When fixing bugs:
1. Identify root cause considering coordinate system and aspect ratio
2. Implement fix using coordinate space (cm) not pixels
3. Add comprehensive tests covering cardinal angles and edge cases
4. Verify all existing tests still pass (run full suite)
5. Consider how non-uniform scaling affects the fix

## Key Files

- `js/canvas.js`: Rendering system, coordinate conversions
- `js/pathCalculator.js`: Movement calculations using differential drive kinematics
- `js/robot.js`: Robot configuration and validation
- `js/blocks.js`: Block-based programming system
- `tests/unit/`: Unit test suite
- `tests/integration/`: Integration test suite
- `tests/e2e/`: End-to-end test suite

## Task

{task description or bug report}
