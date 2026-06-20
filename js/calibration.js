// Calibration Profile Management
// Owns the defaults, valid ranges, and validation for a robot's calibration profile.
// A profile is three numeric fields applied by PathCalculator to better match the
// physical robot's behavior:
//   - distanceFactor: multiplier on straight-line travel distance
//   - turnFactor:     multiplier on angular change during arcs and pivots
//   - driftOffset:    systematic straight-line heading drift, in degrees per metre
class CalibrationManager {
    constructor() {
        // Default profile: no correction.
        this.defaults = {
            distanceFactor: 1.0,
            turnFactor: 1.0,
            driftOffset: 0.0
        };

        // Valid ranges (inclusive).
        this.ranges = {
            distanceFactor: { min: 0.5, max: 2.0 },
            turnFactor: { min: 0.5, max: 2.0 },
            driftOffset: { min: -45.0, max: 45.0 }
        };

        // Human-readable labels for validation messages.
        this.labels = {
            distanceFactor: 'Distance Factor',
            turnFactor: 'Turn Factor',
            driftOffset: 'Drift Offset'
        };
    }

    // Returns a fresh profile with all three fields at their default values.
    getDefault() {
        return { ...this.defaults };
    }

    // Validates a profile. Every field must be present, numeric, and within range.
    // Returns { valid: boolean, errors: string[] }.
    validate(profile) {
        const errors = [];

        if (!profile || typeof profile !== 'object') {
            return { valid: false, errors: ['Calibration profile must be an object'] };
        }

        Object.keys(this.ranges).forEach((field) => {
            const value = profile[field];
            const { min, max } = this.ranges[field];
            const label = this.labels[field];

            if (typeof value !== 'number' || Number.isNaN(value)) {
                errors.push(`${label} must be a number`);
            } else if (value < min || value > max) {
                errors.push(`${label} must be between ${min} and ${max}`);
            }
        });

        return { valid: errors.length === 0, errors };
    }

    // Coerces a partial, legacy, or missing profile into a complete one, substituting
    // defaults for any field that is absent or non-numeric. Used when loading stored
    // robot configurations that may predate calibration.
    normalize(raw) {
        const result = this.getDefault();
        if (raw && typeof raw === 'object') {
            Object.keys(this.defaults).forEach((field) => {
                const value = raw[field];
                if (typeof value === 'number' && !Number.isNaN(value)) {
                    result[field] = value;
                }
            });
        }
        return result;
    }
}

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.CalibrationManager = CalibrationManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalibrationManager;
}
