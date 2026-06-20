# Robot Calibration — Requirements

## Introduction

Real-world FLL robots rarely behave exactly as the differential-drive kinematic model
predicts. Wheels slip, motor torque varies, and physical asymmetries cause straight-line
drift and turn-radius error. This feature adds a per-robot **calibration profile** — a small
set of correction factors that the user measures from their physical robot and stores
alongside the robot configuration. The `PathCalculator` applies these factors at calculation
time so the simulated path more closely matches what the robot actually does on the mat.

Calibration data is stored as part of the robot configuration object and persists through the
existing save/load and import/export mechanisms. No server or external service is required.

## Glossary

- **Calibration Profile**: A set of numeric correction factors attached to a robot
  configuration that adjust the path calculation to match observed real-world behavior.
- **Distance Factor**: A multiplier applied to the computed straight-line travel distance to
  correct for wheel slip or inaccurate wheel-circumference measurement. `1.0` = no correction;
  `0.95` = the robot travels 5% less than predicted.
- **Turn Factor**: A multiplier applied to the computed angular change during arc and pivot
  moves to correct for turning-radius error. `1.0` = no correction; `1.05` = the robot turns
  5% more than predicted.
- **Drift Offset**: A signed angular offset (degrees per metre of straight travel) that models
  systematic left/right drift during straight-line moves. `0.0` = no drift; a positive value
  drifts right.
- **PathCalculator**: `js/pathCalculator.js` — converts a program of move blocks into a
  sequence of `(x, y, angle)` points.
- **RobotConfig**: `js/robot.js` — holds robot dimensions and starting position.
- **CalibrationManager**: `js/calibration.js` — owns calibration defaults and validation.
- **Calibration UI**: The Calibration section of the Robot/Setup tab.

## Requirements

### Requirement 1: Calibration Profile Data Model

As a team member, I want each robot configuration to carry its own calibration profile, so
that switching between robots automatically uses the correct correction factors.

1. A calibration profile contains exactly three numeric fields: `distanceFactor`,
   `turnFactor`, `driftOffset`.
2. Defaults are `distanceFactor = 1.0`, `turnFactor = 1.0`, `driftOffset = 0.0` when no
   profile is present.
3. `distanceFactor` is accepted in `[0.5, 2.0]`.
4. `turnFactor` is accepted in `[0.5, 2.0]`.
5. `driftOffset` is accepted in `[-45.0, 45.0]` degrees per metre.
6. A field outside its valid range is rejected with a descriptive validation error message.
7. `CalibrationManager.getDefault()` returns a profile with all three fields at defaults.
8. For all valid profiles `p`, `CalibrationManager.validate(p)` returns `{ valid: true, errors: [] }`.

### Requirement 2: Calibration Profile Persistence

As a team member, I want calibration data saved with the robot configuration, so I don't
re-enter correction factors every session.

1. Serializing a robot config (`getData()` / `StorageManager.saveRobotConfig()`) includes the
   `calibration` object as a field of the robot config.
2. Deserializing a robot config restores the `calibration` field.
3. A stored config without a `calibration` field (legacy data) silently substitutes defaults.
4. Exporting a full plan to JSON includes `calibration` inside the `robot` object.
5. Importing a JSON plan restores `calibration` if present, else applies defaults.
6. For all valid profiles `p`, serialize → deserialize produces a profile equal to `p`
   (round-trip property).

### Requirement 3: Calibration UI Controls

As a team member, I want to enter calibration values in the Robot tab without editing JSON.

1. A numeric input for `distanceFactor` labelled "Distance Factor".
2. A numeric input for `turnFactor` labelled "Turn Factor".
3. A numeric input for `driftOffset` labelled "Drift Offset (°/m)".
4. The valid range for each field is shown as helper text adjacent to the input.
5. Changing any calibration input recalculates and re-renders the path within 500 ms.
6. A "Reset to Defaults" button sets all three fields to their default values.
7. Clicking "Reset to Defaults" updates the inputs and triggers a path recalculation.
8. An input value outside its valid range shows an inline validation error and is not applied
   to the path calculation.

### Requirement 4: Distance Correction in Path Calculation

As a team member, I want the simulated straight-line distance to match my robot's actual
travel distance.

1. A straight-line move multiplies the computed travel distance by `distanceFactor`.
2. At `distanceFactor = 1.0`, the straight-line path equals the uncalibrated path (identity).
3. At `distanceFactor = k` with uncalibrated distance `d`, the end position is at distance
   `k × d` from the start.
4. For valid `k1 < k2`, factor `k1` yields a shorter path than `k2` (monotonicity).

### Requirement 5: Turn Correction in Path Calculation

As a team member, I want the simulated turning angle to match my robot's actual rotation.

1. An arc or pivot move multiplies the computed angular change (`deltaAngle` / `deltaTheta`)
   by `turnFactor` before integrating the heading.
2. At `turnFactor = 1.0`, the arc path equals the uncalibrated path (identity).
3. At `turnFactor = k` with uncalibrated heading change `θ`, the final heading differs from
   the start by `k × θ` degrees.
4. For valid `k1 < k2`, a pivot with `k1` yields a smaller absolute heading change than `k2`
   (monotonicity).
5. Applying `turnFactor` keeps position and heading geometrically consistent.

### Requirement 6: Drift Correction in Path Calculation

As a team member, I want the simulation to model my robot's straight-line drift.

1. A straight-line move accumulates a heading change equal to
   `driftOffset × (distanceTravelled_cm / 100)` degrees.
2. At `driftOffset = 0.0`, the straight-line path equals the uncalibrated path (identity).
3. Positive `driftOffset` curves the path right relative to the initial heading.
4. Negative `driftOffset` curves the path left relative to the initial heading.
5. For non-zero `driftOffset`, total heading change is proportional to total distance
   (linearity).

> Decision: drift is **signed** with respect to travel direction — driving in reverse mirrors
> the rotational sense, modelling a fixed mechanical bias.

### Requirement 7: Calibration Does Not Affect Robot Dimensions

As a team member, I want calibration to affect only the simulated path, not the robot outline.

1. `PathCalculator` applies calibration only to distance, heading change, and drift; it does
   not modify `wheelBase`, `wheelCircumference`, or any other dimension field.
2. `CanvasRenderer` draws the robot outline using the original, uncalibrated dimensions.
3. For all profiles, the rendered robot bounding-box dimensions equal the stored
   `robotConfig` values (invariant).

### Requirement 8: Calibration Guidance Text

As a team member, I want in-app guidance on how to measure calibration values.

1. A collapsible "How to Calibrate" help section within the Calibration UI.
2. A step-by-step procedure for measuring `distanceFactor` from a known straight-line distance.
3. A step-by-step procedure for measuring `turnFactor` from a known pivot rotation.
4. A step-by-step procedure for measuring `driftOffset` from a straight run of at least 100 cm.
