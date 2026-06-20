let RobotConfig;

describe('RobotConfig', () => {
  let robotConfig;
  let dom;

  beforeEach(() => {
    document.body.innerHTML = '' +
      '<input id="robotLength" value="16.5" />' +
      '<input id="robotWidth" value="15" />' +
      '<input id="wheelOffset" value="3.1" />' +
      '<input id="wheelCircumference" value="19.6" />' +
      '<input id="wheelBase" value="13.3" />' +
      '<input id="robotImageUrl" value="" />' +
      '<input id="startX" value="33" />' +
      '<input id="startY" value="3.3" />' +
      '<input id="startAngle" value="0" />' +
      '<input id="calDistanceFactor" value="1" />' +
      '<input id="calTurnFactor" value="1" />' +
      '<input id="calDriftOffset" value="0" />';
    RobotConfig = require('../../js/robot.js');
    robotConfig = new RobotConfig();
  });

  describe('getConfig', () => {
    it('should read config from DOM inputs', () => {
      const config = robotConfig.getConfig();
      
      expect(config.length).toBe(16.5);
      expect(config.width).toBe(15);
      expect(config.wheelOffset).toBe(3.1);
      expect(config.wheelCircumference).toBe(19.6);
      expect(config.wheelBase).toBe(13.3);
      expect(config.startX).toBe(33);
      expect(config.startY).toBe(3.3);
      expect(config.startAngle).toBe(0);
    });

    it('should use defaults for empty inputs', () => {
      document.getElementById('robotLength').value = '';
      const config = robotConfig.getConfig();
      expect(config.length).toBe(20);
    });

    it('should emit a calibration profile from the inputs (Req 2.1)', () => {
      document.getElementById('calDistanceFactor').value = '1.2';
      document.getElementById('calTurnFactor').value = '0.9';
      document.getElementById('calDriftOffset').value = '5';
      const config = robotConfig.getConfig();
      expect(config.calibration).toEqual({ distanceFactor: 1.2, turnFactor: 0.9, driftOffset: 5 });
    });

    it('should fall back to calibration defaults for blank inputs', () => {
      document.getElementById('calDistanceFactor').value = '';
      document.getElementById('calDriftOffset').value = '';
      const config = robotConfig.getConfig();
      expect(config.calibration).toEqual({ distanceFactor: 1.0, turnFactor: 1.0, driftOffset: 0.0 });
    });
  });

  describe('loadConfig', () => {
    it('should write config to DOM inputs', () => {
      const newConfig = {
        length: 18,
        width: 14,
        wheelOffset: 4,
        wheelCircumference: 20,
        wheelBase: 12,
        imageUrl: 'test.png',
        startX: 50,
        startY: 50,
        startAngle: 90
      };
      
      robotConfig.loadConfig(newConfig);
      
      expect(document.getElementById('robotLength').value).toBe('18');
      expect(document.getElementById('startX').value).toBe('50');
      expect(document.getElementById('startAngle').value).toBe('90');
    });

    it('should round-trip calibration through getConfig/loadConfig (Req 2.6)', () => {
      const profile = { distanceFactor: 1.3, turnFactor: 0.8, driftOffset: -10 };
      robotConfig.loadConfig({ ...robotConfig.getConfig(), calibration: profile });
      expect(robotConfig.getConfig().calibration).toEqual(profile);
    });

    it('should substitute calibration defaults for legacy configs lacking the field (Req 2.3)', () => {
      document.getElementById('calDistanceFactor').value = '1.5';
      robotConfig.loadConfig({ length: 18 }); // no calibration field
      expect(robotConfig.getConfig().calibration).toEqual({
        distanceFactor: 1.0,
        turnFactor: 1.0,
        driftOffset: 0.0
      });
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const result = robotConfig.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect negative wheel circumference', () => {
      document.getElementById('wheelCircumference').value = '-10';
      const result = robotConfig.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wheel circumference must be positive');
    });

    it('should detect zero wheel base', () => {
      document.getElementById('wheelBase').value = '0';
      const result = robotConfig.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wheel base must be at least 8 cm');
    });
    
    it('should detect wheel base less than minimum (e.g., 5)', () => {
      document.getElementById('wheelBase').value = '5';
      const result = robotConfig.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wheel base must be at least 8 cm');
    });
  });

  describe('loadPreset', () => {
    it('should load dadbot preset', () => {
      const success = robotConfig.loadPreset('dadbot');
      
      expect(success).toBe(true);
      
      const config = robotConfig.getConfig();
      expect(config.length).toBe(16.5);
      expect(config.wheelCircumference).toBe(19.6);
    });

    it('should load coopbot preset', () => {
      const success = robotConfig.loadPreset('coopbot');
      
      expect(success).toBe(true);
      
      const config = robotConfig.getConfig();
      expect(config.length).toBe(12);
      expect(config.wheelBase).toBe(10.4);
    });

    it('should preserve start position when loading preset', () => {
      document.getElementById('startX').value = '40';
      document.getElementById('startY').value = '50';
      document.getElementById('startAngle').value = '45';
      
      robotConfig.loadPreset('dadbot');
      
      const config = robotConfig.getConfig();
      expect(config.startX).toBe(40);
      expect(config.startY).toBe(50);
      expect(config.startAngle).toBe(45);
    });

    it('should return false for invalid preset', () => {
      const success = robotConfig.loadPreset('nonexistent');
      
      expect(success).toBe(false);
    });
  });
});
