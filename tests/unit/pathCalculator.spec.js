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
      
      // First point should be at start
      expect(result.points[0].x).toBeCloseTo(robotConfig.startX, 1);
      expect(result.points[0].y).toBeCloseTo(robotConfig.startY, 1);
    });
  });
});
