// Robot Configuration Management
class RobotConfig {
    constructor() {
        this.config = {
            length: 16.5,
            width: 15,
            wheelOffset: 3.1,
            wheelCircumference: 19.6,
            wheelBase: 13.3,
            imageUrl: '',
            startX: 33,
            startY: 3.3,
            startAngle: 0
        };
        
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
                startX: currentStartX !== '' ? parseFloat(currentStartX) : 33,
                startY: currentStartY !== '' ? parseFloat(currentStartY) : 3.3,
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
        
        return {
            length: parseFloat(document.getElementById('robotLength').value) || 20,
            width: parseFloat(document.getElementById('robotWidth').value) || 15,
            wheelOffset: parseFloat(document.getElementById('wheelOffset').value) || 5,
            wheelCircumference: parseFloat(document.getElementById('wheelCircumference').value) || 17.6,
            wheelBase: parseFloat(document.getElementById('wheelBase').value) || 12,
            imageUrl: document.getElementById('robotImageUrl').value || '',
            startX: startXValue !== '' ? parseFloat(startXValue) : 30,
            startY: startYValue !== '' ? parseFloat(startYValue) : 30,
            startAngle: startAngleValue !== '' ? parseFloat(startAngleValue) : 0
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
        
        this.config = config;
    }
    
    validate() {
        const config = this.getConfig();
        const errors = [];
        
        if (config.length <= 0) errors.push('Robot length must be positive');
        if (config.width <= 0) errors.push('Robot width must be positive');
        if (config.wheelOffset < 0) errors.push('Wheel offset cannot be negative (tire overhang should be considered in robot length)');
        if (config.wheelCircumference <= 0) errors.push('Wheel circumference must be positive');
        if (config.wheelBase <= 0) errors.push('Wheel base must be positive');
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}
