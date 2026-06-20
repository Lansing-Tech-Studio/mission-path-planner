# Robot Calibration — Design

Implements the [requirements](./requirements.md). This document records the concrete
approach, the locked decisions, and where each correction is applied.

## Data model

A calibration profile is a plain object carried as `robotConfig.calibration`:

```js
{ distanceFactor: 1.0, turnFactor: 1.0, driftOffset: 0.0 }
```

`js/calibration.js` (`CalibrationManager`) owns this model:

- `getDefault()` → fresh profile at defaults.
- `validate(profile)` → `{ valid, errors }`; each field must be numeric and within range
  (`distanceFactor`/`turnFactor` ∈ `[0.5, 2.0]`, `driftOffset` ∈ `[-45, 45]`).
- `normalize(raw)` → coerces a partial/legacy/missing object to a complete profile,
  substituting defaults for any absent or non-numeric field (used when loading legacy configs).

It follows the repo's dual-export footer (`window.X` + `module.exports`) and is loaded via a
`<script>` tag in `index.html` before `app.js`.

## Persistence flow

The calibration object rides along with the robot configuration through the existing pipeline,
so most of the persistence layer needs no change:

- `RobotConfig.getConfig()` reads the three UI inputs (the source of truth, no hidden field)
  and emits `calibration`. `loadConfig()` writes the inputs via `CalibrationManager.normalize`,
  so legacy configs without the field get defaults silently (Req 2.3).
- `app.js getData()/loadData()` already pass `robot` wholesale, so **export/import**,
  **`saveLastState`/`loadLastState`** (session auto-restore), and **`saveProgram`** carry
  `calibration` automatically.
- The one place that whitelists robot fields, `StorageManager.saveRobotConfig`, was updated to
  include `calibration`.

This satisfies the round-trip property (Req 2.6): any valid profile survives
serialize → deserialize unchanged.

## Path-calculation injection points

All factors are read inside `PathCalculator`'s leaf methods with safe defaults
(`robotConfig.calibration?.field ?? default`), so uncalibrated configs — including the entire
pre-existing test suite — behave byte-identically.

### Distance (Req 4) — `calculateStraightMove`

`distanceCm = wheelRotations × wheelCircumference × distanceFactor`. Linear scaling gives the
identity, `k × d` end position, and monotonicity for free. **Scoped to straight moves only**
(decision): arc wheel travel is left unscaled.

### Turn (Req 5) — `calculateArcMove`

`turnFactor` is applied **once per branch**:

- Pivot-in-place branch: `angle = startAngle + deltaAngle × turnFactor × t`.
- Arc branch: the per-step `deltaTheta` is scaled by `turnFactor`.

Position integrates from the running heading, so scaling the heading increment yields a
self-consistent path (the robot follows the arc implied by its calibrated turn rate),
satisfying the geometric-consistency requirement (Req 5.5). The raw `deltaAngle` line is left
unscaled to keep each branch multiplied exactly once.

### Drift (Req 6) — `calculateStraightMove`

When `driftOffset !== 0` the "straight" move becomes a gentle arc. The method branches:

- `driftOffset === 0`: the original closed-form interpolation, verbatim — guarantees the
  identity property and keeps the common path cheap.
- `driftOffset !== 0`: incremental forward-Euler integration (mirroring the arc branch's update
  order). Each step moves `deltaDistance = distanceCm / numSteps` along the current heading,
  then updates `currentAngle += -1 × driftOffset × (deltaDistance / 100)`.

**Sign:** in this file's convention a right turn is a *negative* angle change, so positive
`driftOffset` (curves right, Req 6.3) uses `driftSign = -1`. **Backward moves:** `deltaDistance`
is signed, so reversing mirrors the drift's rotational sense — the locked "signed" decision,
modelling a fixed mechanical bias.

## Dimensions unaffected (Req 7)

`PathCalculator` only ever reads dimension fields. `CanvasRenderer` draws the robot from the
unchanged `robotConfig`, so the outline is invariant under calibration. The per-point `angle`
now varies across a drifted straight move; downstream consumers (next block's start heading,
position readout, canvas) already consume per-point angle generically, which is the intended
behaviour — drift error carries into subsequent moves.

## UI (Req 3, 8)

A collapsible **Calibration** section in the Robot/Setup tab (matching the existing
`.section` / `.form-group` markup) with three numeric inputs, range helper text, a
"Reset to Defaults" button, and a nested collapsible **How to Calibrate** help section.
Inputs are added to `app.js`'s calibration listener; on each edit the values are validated via
`CalibrationManager` — invalid values show an inline error and are **not** applied to the path
calc (Req 3.8). Valid edits trigger the existing debounced `update()` (recalc + autosave).
