// Robot Configuration Management

// Canonical default robot dimensions/position. Single source of truth shared by the
// constructor and getConfig()'s blank-field fallbacks so they can't drift apart.
const ROBOT_DEFAULTS = {
    length: 16.5,
    width: 15,
    wheelOffset: 3.1,
    wheelCircumference: 19.6,
    wheelBase: 13.3,
    startX: 30,  // Bottom-left corner X
    startY: 0,   // Bottom-left corner Y
    startAngle: 0
};

class RobotConfig {
    constructor() {
        this.config = {
            ...ROBOT_DEFAULTS,
            imageUrl: ''
        };

        // Calibration manager owns the calibration defaults and validation. Resolve it
        // from the browser global or, in tests, via require — the no-module pattern.
        const CalibrationManagerClass =
            (typeof CalibrationManager !== 'undefined') ? CalibrationManager :
            (typeof require !== 'undefined' ? require('./calibration.js') : null);
        this.calibrationManager = CalibrationManagerClass ? new CalibrationManagerClass() : null;

        // Robot presets library
        this.presets = {
            'dadbot': {
                name: 'DadBot',
                length: 16.5,
                width: 15,
                wheelOffset: 3.1,
                wheelCircumference: 19.6,
                wheelBase: 13.3,
                imageUrl: 'img/DadBot.png'
            },
            'coopbot': {
                name: 'Coop Bot (Arvind Seshan)',
                length: 12,
                width: 13.6,
                wheelOffset: 4,
                wheelCircumference: 17.5,
                wheelBase: 10.4,
                imageUrl: 'img/coop-bot.png'
            },
            'lego-advanced': {
                name: 'LEGO Advanced Driving Base',
                length: 20,
                width: 16.8,
                wheelOffset: 8.8,
                wheelCircumference: 27.6,
                wheelBase: 13.6,
                imageUrl: 'img/advanced-driving-base.png'
            }
        };
    }
    
    getPresets() {
        return this.presets;
    }
    
    loadPreset(presetId) {
        const preset = this.presets[presetId];
        if (preset) {
            // Load preset but keep current starting position
            const currentStartX = document.getElementById('startX').value;
            const currentStartY = document.getElementById('startY').value;
            const currentStartAngle = document.getElementById('startAngle').value;
            
            this.loadConfig({
                length: preset.length,
                width: preset.width,
                wheelOffset: preset.wheelOffset,
                wheelCircumference: preset.wheelCircumference,
                wheelBase: preset.wheelBase,
                imageUrl: preset.imageUrl,
                startX: currentStartX !== '' ? parseFloat(currentStartX) : 30,
                startY: currentStartY !== '' ? parseFloat(currentStartY) : 0,
                startAngle: currentStartAngle !== '' ? parseFloat(currentStartAngle) : 0
            });
            
            return true;
        }
        return false;
    }
    
    getConfig() {
        // Read current values from form inputs
        const startXValue = document.getElementById('startX').value;
        const startYValue = document.getElementById('startY').value;
        const startAngleValue = document.getElementById('startAngle').value;
        
        const lengthVal = document.getElementById('robotLength').value;
        const widthVal = document.getElementById('robotWidth').value;
        const wheelOffsetVal = document.getElementById('wheelOffset').value;
        const wheelCircumferenceVal = document.getElementById('wheelCircumference').value;
        const wheelBaseVal = document.getElementById('wheelBase').value;
        const imageUrlVal = document.getElementById('robotImageUrl').value;

        return {
            length: lengthVal === '' ? ROBOT_DEFAULTS.length : parseFloat(lengthVal),
            width: widthVal === '' ? ROBOT_DEFAULTS.width : parseFloat(widthVal),
            wheelOffset: wheelOffsetVal === '' ? ROBOT_DEFAULTS.wheelOffset : parseFloat(wheelOffsetVal),
            wheelCircumference: wheelCircumferenceVal === '' ? ROBOT_DEFAULTS.wheelCircumference : parseFloat(wheelCircumferenceVal),
            wheelBase: wheelBaseVal === '' ? ROBOT_DEFAULTS.wheelBase : parseFloat(wheelBaseVal),
            imageUrl: imageUrlVal || '',
            startX: startXValue !== '' ? parseFloat(startXValue) : ROBOT_DEFAULTS.startX,
            startY: startYValue !== '' ? parseFloat(startYValue) : ROBOT_DEFAULTS.startY,
            startAngle: startAngleValue !== '' ? parseFloat(startAngleValue) : ROBOT_DEFAULTS.startAngle,
            calibration: this.getCalibration()
        };
    }

    // Read the calibration profile from its three inputs, substituting defaults for any
    // missing/blank field. The inputs are the source of truth (no hidden field).
    getCalibration() {
        const defaults = this.calibrationManager
            ? this.calibrationManager.getDefault()
            : { distanceFactor: 1.0, turnFactor: 1.0, driftOffset: 0.0 };

        const readField = (id, fallback) => {
            const el = document.getElementById(id);
            const raw = el ? el.value : '';
            if (raw === '' || raw === null || raw === undefined) return fallback;
            const parsed = parseFloat(raw);
            return Number.isNaN(parsed) ? fallback : parsed;
        };

        return {
            distanceFactor: readField('calDistanceFactor', defaults.distanceFactor),
            turnFactor: readField('calTurnFactor', defaults.turnFactor),
            driftOffset: readField('calDriftOffset', defaults.driftOffset)
        };
    }
    
    loadConfig(config) {
        // Load configuration into form inputs
        if (config.length !== undefined) {
            document.getElementById('robotLength').value = config.length;
        }
        if (config.width !== undefined) {
            document.getElementById('robotWidth').value = config.width;
        }
        if (config.wheelOffset !== undefined) {
            document.getElementById('wheelOffset').value = config.wheelOffset;
        }
        if (config.wheelCircumference !== undefined) {
            document.getElementById('wheelCircumference').value = config.wheelCircumference;
        }
        if (config.wheelBase !== undefined) {
            document.getElementById('wheelBase').value = config.wheelBase;
        }
        if (config.imageUrl !== undefined) {
            document.getElementById('robotImageUrl').value = config.imageUrl;
        }
        if (config.startX !== undefined) {
            document.getElementById('startX').value = config.startX;
        }
        if (config.startY !== undefined) {
            document.getElementById('startY').value = config.startY;
        }
        if (config.startAngle !== undefined) {
            document.getElementById('startAngle').value = config.startAngle;
        }

        // Restore calibration, filling defaults for legacy configs that lack the field.
        const calibration = this.calibrationManager
            ? this.calibrationManager.normalize(config.calibration)
            : (config.calibration || { distanceFactor: 1.0, turnFactor: 1.0, driftOffset: 0.0 });
        const setField = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        setField('calDistanceFactor', calibration.distanceFactor);
        setField('calTurnFactor', calibration.turnFactor);
        setField('calDriftOffset', calibration.driftOffset);

        this.config = config;
    }
    
    validate() {
        const config = this.getConfig();
        const errors = [];
        
        if (config.length <= 0) errors.push('Robot length must be positive');
        if (config.width <= 0) errors.push('Robot width must be positive');
        if (config.wheelOffset < 0) errors.push('Wheel offset cannot be negative (tire overhang should be considered in robot length)');
        if (config.wheelCircumference <= 0) errors.push('Wheel circumference must be positive');
        if (config.wheelBase < 8) errors.push('Wheel base must be at least 8 cm');
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.RobotConfig = RobotConfig;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobotConfig;
}
