const { JSDOM } = require('jsdom');
let PathCalculator;

describe('PathCalculator', () => {
  let PathCalculator;
  let calculator;
  let robotConfig;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    PathCalculator = require('../../js/pathCalculator.js');
    calculator = new PathCalculator();
    
    robotConfig = {
      startX: 30,
      startY: 30,
      startAngle: 0,
      wheelCircumference: 17.6,
      wheelBase: 12,
      length: 20,
      width: 15,
      wheelOffset: 5
    };
  });

  describe('calculateStraightMove', () => {
    it('should move forward in a straight line at 0 degrees', () => {
      const points = calculator.calculateStraightMove(30, 30, 0, 360, robotConfig);
      
      expect(points.length).toBeGreaterThan(1);
      expect(points[0].x).toBeCloseTo(30, 1);
      expect(points[0].y).toBeCloseTo(30, 1);
      expect(points[0].angle).toBe(0);
      
      const lastPoint = points[points.length - 1];
      expect(lastPoint.y).toBeGreaterThan(30); // Moving up (0° = north)
      expect(lastPoint.x).toBeCloseTo(30, 1); // X unchanged
      expect(lastPoint.angle).toBe(0); // Angle unchanged
    });

    it('should move backward when degrees are negative', () => {
      const points = calculator.calculateStraightMove(30, 30, 0, -360, robotConfig);
      
      const lastPoint = points[points.length - 1];
      expect(lastPoint.y).toBeLessThan(30); // Moving down (backward)
    });

    it('should maintain wheel positions perpendicular to movement', () => {
      const points = calculator.calculateStraightMove(30, 30, 0, 360, robotConfig);
      
      points.forEach(point => {
        expect(point.leftWheelX).toBeDefined();
        expect(point.leftWheelY).toBeDefined();
        expect(point.rightWheelX).toBeDefined();
        expect(point.rightWheelY).toBeDefined();
        
        // Wheels should be equidistant from center
        const leftDist = Math.hypot(point.leftWheelX - point.x, point.leftWheelY - point.y);
        const rightDist = Math.hypot(point.rightWheelX - point.x, point.rightWheelY - point.y);
        expect(leftDist).toBeCloseTo(rightDist, 1);
      });
    });
  });

  describe('calculateArcMove', () => {
    it('should turn right when direction is positive', () => {
      const points = calculator.calculateArcMove(30, 30, 0, 50, 720, robotConfig);
      
      expect(points.length).toBeGreaterThan(1);
      const lastPoint = points[points.length - 1];
      
        // Should turn right (angle changes)
        expect(Math.abs(lastPoint.angle)).toBeGreaterThan(0);
      
      // Should move generally forward and right
      expect(lastPoint.y).toBeGreaterThan(30);
    });

    it('should turn left when direction is negative', () => {
      const points = calculator.calculateArcMove(30, 30, 0, -50, 720, robotConfig);
      
      const lastPoint = points[points.length - 1];
      
        // Should turn left (angle changes)
        expect(Math.abs(lastPoint.angle)).toBeGreaterThan(0);
      
      // Should move generally forward and left
      expect(lastPoint.y).toBeGreaterThan(30);
    });

    it('should turn in place when direction creates opposing wheel movements', () => {
      // Direction 100 means one wheel forward, one backward at equal speeds
      const points = calculator.calculateArcMove(30, 30, 0, 100, 360, robotConfig);
      
      const lastPoint = points[points.length - 1];
      
      // Position should stay roughly the same (turning in place)
      expect(lastPoint.x).toBeCloseTo(30, 1);
      expect(lastPoint.y).toBeCloseTo(30, 1);
      
      // Angle should change significantly
      expect(Math.abs(lastPoint.angle)).toBeGreaterThan(10);
    });

    it('should handle gentle curves with small direction values', () => {
      const points = calculator.calculateArcMove(30, 30, 0, 10, 360, robotConfig);
      
      const lastPoint = points[points.length - 1];
      
      // Should move mostly forward with slight turn
      expect(lastPoint.y).toBeGreaterThan(30);
      expect(Math.abs(lastPoint.angle)).toBeLessThan(30); // Gentle turn
    });
  });

  describe('calibration', () => {
    const withCal = (cal) => ({ ...robotConfig, calibration: cal });
    const last = (points) => points[points.length - 1];

    describe('distanceFactor (Req 4)', () => {
      it('is identity at 1.0', () => {
        const base = calculator.calculateStraightMove(30, 30, 0, 360, robotConfig);
        const cal = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ distanceFactor: 1.0 }));
        expect(last(cal).x).toBeCloseTo(last(base).x, 5);
        expect(last(cal).y).toBeCloseTo(last(base).y, 5);
      });

      it('ends at distance k x d from the start', () => {
        // 360 deg = one rotation = wheelCircumference cm; start y = 30, heading up.
        const k = 1.5;
        const points = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ distanceFactor: k }));
        expect(last(points).y).toBeCloseTo(30 + robotConfig.wheelCircumference * k, 4);
        expect(last(points).x).toBeCloseTo(30, 4);
      });

      it('is monotonic: larger factor travels farther', () => {
        const near = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ distanceFactor: 0.8 }));
        const far = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ distanceFactor: 1.6 }));
        expect(last(far).y).toBeGreaterThan(last(near).y);
      });
    });

    describe('turnFactor (Req 5)', () => {
      it('is identity at 1.0 for an arc', () => {
        const base = calculator.calculateArcMove(30, 30, 0, 50, 720, robotConfig);
        const cal = calculator.calculateArcMove(30, 30, 0, 50, 720, withCal({ turnFactor: 1.0 }));
        expect(last(cal).angle).toBeCloseTo(last(base).angle, 5);
        expect(last(cal).x).toBeCloseTo(last(base).x, 5);
        expect(last(cal).y).toBeCloseTo(last(base).y, 5);
      });

      it('scales pivot heading change by k (final heading = k x theta)', () => {
        const base = calculator.calculateArcMove(30, 30, 0, 100, 360, withCal({ turnFactor: 1.0 }));
        const scaled = calculator.calculateArcMove(30, 30, 0, 100, 360, withCal({ turnFactor: 2.0 }));
        expect(last(scaled).angle).toBeCloseTo(last(base).angle * 2, 4);
      });

      it('is monotonic on a pivot', () => {
        const small = calculator.calculateArcMove(30, 30, 0, 100, 360, withCal({ turnFactor: 0.6 }));
        const big = calculator.calculateArcMove(30, 30, 0, 100, 360, withCal({ turnFactor: 1.8 }));
        expect(Math.abs(last(big).angle)).toBeGreaterThan(Math.abs(last(small).angle));
      });
    });

    describe('driftOffset (Req 6)', () => {
      it('is identity at 0.0', () => {
        const base = calculator.calculateStraightMove(30, 30, 0, 360, robotConfig);
        const cal = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: 0.0 }));
        expect(last(cal).x).toBeCloseTo(last(base).x, 5);
        expect(last(cal).y).toBeCloseTo(last(base).y, 5);
        expect(last(cal).angle).toBe(last(base).angle);
      });

      it('curves right for positive drift (x increases, heading negative)', () => {
        const points = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: 30 }));
        expect(last(points).x).toBeGreaterThan(30);
        expect(last(points).angle).toBeLessThan(0);
      });

      it('curves left for negative drift (x decreases, heading positive)', () => {
        const points = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: -30 }));
        expect(last(points).x).toBeLessThan(30);
        expect(last(points).angle).toBeGreaterThan(0);
      });

      it('total heading change = -driftOffset x (distance/100) degrees', () => {
        const drift = 45;
        const points = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: drift }));
        const expected = -1 * drift * (robotConfig.wheelCircumference / 100);
        expect(last(points).angle).toBeCloseTo(expected, 5);
      });

      it('heading change is proportional to distance (linearity)', () => {
        const oneRot = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: 20 }));
        const twoRot = calculator.calculateStraightMove(30, 30, 0, 720, withCal({ driftOffset: 20 }));
        expect(last(twoRot).angle).toBeCloseTo(last(oneRot).angle * 2, 4);
      });

      it('is signed with travel direction: reverse mirrors the drift (decision 2)', () => {
        const forward = calculator.calculateStraightMove(30, 30, 0, 360, withCal({ driftOffset: 45 }));
        const backward = calculator.calculateStraightMove(30, 30, 0, -360, withCal({ driftOffset: 45 }));
        expect(last(forward).angle).toBeCloseTo(-last(backward).angle, 5);
        expect(last(forward).angle).toBeLessThan(0);
        expect(last(backward).angle).toBeGreaterThan(0);
      });
    });

    it('does not mutate robotConfig dimensions (Req 7)', () => {
      const cfg = withCal({ distanceFactor: 1.5, turnFactor: 1.5, driftOffset: 20 });
      calculator.calculatePath([
        { type: 'move', direction: 0, degrees: 360, valid: true },
        { type: 'move', direction: 50, degrees: 360, valid: true }
      ], cfg);
      expect(cfg.wheelBase).toBe(robotConfig.wheelBase);
      expect(cfg.wheelCircumference).toBe(robotConfig.wheelCircumference);
    });
  });

  describe('calculatePath', () => {
    it('should return empty path for empty program', () => {
      const result = calculator.calculatePath([], robotConfig);
      
      expect(result.valid).toBe(true);
      expect(result.points.length).toBe(0);
    });

    it('should skip invalid move blocks', () => {
      const program = [
        { type: 'move', direction: 0, degrees: 360, valid: true },
        { type: 'move', direction: 150, degrees: 360, valid: false }, // Invalid
        { type: 'move', direction: 0, degrees: 180, valid: true }
      ];
      
      const result = calculator.calculatePath(program, robotConfig);
      
      expect(result.valid).toBe(false);
      // Should stop at invalid block
      expect(result.points.length).toBeGreaterThan(0);
      expect(result.points.length).toBeLessThan(100); // Not full path
    });

    it('should skip text blocks', () => {
      const program = [
        { type: 'text', content: 'Move forward' },
        { type: 'move', direction: 0, degrees: 360, valid: true },
        { type: 'text', content: 'Turn around' }
      ];
      
      const result = calculator.calculatePath(program, robotConfig);
      
      expect(result.valid).toBe(true);
      expect(result.points.length).toBeGreaterThan(0);
    });

    it('should mark segment end points', () => {
      const program = [
        { type: 'move', direction: 0, degrees: 360, valid: true },
        { type: 'move', direction: 50, degrees: 360, valid: true }
      ];
      
      const result = calculator.calculatePath(program, robotConfig);
      
      const segmentEnds = result.points.filter(p => p.segmentEnd);
      expect(segmentEnds.length).toBe(2); // One per move block
    });

    it('should accumulate position through multiple moves', () => {
      const program = [
        { type: 'move', direction: 0, degrees: 360, valid: true }, // Forward
        { type: 'move', direction: 100, degrees: 720, valid: true }, // Turn 180°
        { type: 'move', direction: 0, degrees: 360, valid: true }  // Forward again
      ];
      
      const result = calculator.calculatePath(program, robotConfig);
      
      expect(result.valid).toBe(true);
      expect(result.points.length).toBeGreaterThan(10);
      
      // First point should be at axle center (startX/startY is bounding box corner)
      // Axle center = (startX + width/2, startY + wheelOffset)
      const expectedX = robotConfig.startX + robotConfig.width / 2; // 30 + 15/2 = 37.5
      const expectedY = robotConfig.startY + robotConfig.wheelOffset; // 30 + 5 = 35
      expect(result.points[0].x).toBeCloseTo(expectedX, 1);
      expect(result.points[0].y).toBeCloseTo(expectedY, 1);
    });
  });
});
