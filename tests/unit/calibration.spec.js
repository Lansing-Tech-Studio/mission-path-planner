const CalibrationManager = require('../../js/calibration.js');

describe('CalibrationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new CalibrationManager();
  });

  describe('getDefault', () => {
    it('returns the neutral profile', () => {
      expect(manager.getDefault()).toEqual({
        distanceFactor: 1.0,
        turnFactor: 1.0,
        driftOffset: 0.0
      });
    });

    it('returns a fresh copy each call', () => {
      const a = manager.getDefault();
      a.distanceFactor = 1.5;
      expect(manager.getDefault().distanceFactor).toBe(1.0);
    });
  });

  describe('validate', () => {
    it('accepts a valid profile (Req 1.8)', () => {
      const result = manager.validate({ distanceFactor: 1.2, turnFactor: 0.9, driftOffset: 5 });
      expect(result).toEqual({ valid: true, errors: [] });
    });

    it('accepts the default profile', () => {
      expect(manager.validate(manager.getDefault()).valid).toBe(true);
    });

    it('accepts inclusive range boundaries', () => {
      expect(manager.validate({ distanceFactor: 0.5, turnFactor: 2.0, driftOffset: -45 }).valid).toBe(true);
      expect(manager.validate({ distanceFactor: 2.0, turnFactor: 0.5, driftOffset: 45 }).valid).toBe(true);
    });

    it('rejects distanceFactor below range with a descriptive message (Req 1.3, 1.6)', () => {
      const result = manager.validate({ distanceFactor: 0.4, turnFactor: 1, driftOffset: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distance Factor must be between 0.5 and 2');
    });

    it('rejects turnFactor above range (Req 1.4)', () => {
      const result = manager.validate({ distanceFactor: 1, turnFactor: 2.5, driftOffset: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Turn Factor must be between 0.5 and 2');
    });

    it('rejects driftOffset outside range (Req 1.5)', () => {
      const result = manager.validate({ distanceFactor: 1, turnFactor: 1, driftOffset: 60 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Drift Offset must be between -45 and 45');
    });

    it('rejects non-numeric fields', () => {
      const result = manager.validate({ distanceFactor: NaN, turnFactor: 'x', driftOffset: 0 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Distance Factor must be a number');
      expect(result.errors).toContain('Turn Factor must be a number');
    });

    it('rejects a non-object profile', () => {
      expect(manager.validate(null).valid).toBe(false);
      expect(manager.validate(undefined).valid).toBe(false);
    });
  });

  describe('normalize', () => {
    it('returns defaults for missing/legacy data (Req 2.3)', () => {
      expect(manager.normalize(undefined)).toEqual(manager.getDefault());
      expect(manager.normalize(null)).toEqual(manager.getDefault());
      expect(manager.normalize({})).toEqual(manager.getDefault());
    });

    it('fills only the absent fields', () => {
      expect(manager.normalize({ distanceFactor: 1.3 })).toEqual({
        distanceFactor: 1.3,
        turnFactor: 1.0,
        driftOffset: 0.0
      });
    });

    it('ignores non-numeric fields, substituting defaults', () => {
      expect(manager.normalize({ turnFactor: 'oops', driftOffset: 10 })).toEqual({
        distanceFactor: 1.0,
        turnFactor: 1.0,
        driftOffset: 10
      });
    });

    it('passes a full valid profile through unchanged', () => {
      const profile = { distanceFactor: 1.1, turnFactor: 0.95, driftOffset: -3 };
      expect(manager.normalize(profile)).toEqual(profile);
    });
  });
});
