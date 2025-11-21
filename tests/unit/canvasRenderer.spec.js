const CanvasRenderer = require('../../js/canvas.js');

describe('CanvasRenderer', () => {
  let canvasEl;
  let renderer;

  beforeEach(() => {
    document.body.innerHTML = '<div class="right-panel" style="width:800px;height:600px"><canvas id="missionCanvas"></canvas></div>';
    canvasEl = document.getElementById('missionCanvas');
    // Stub missionPlanner to avoid recursion on resize
    window.missionPlanner = { update: jest.fn() };
    renderer = new CanvasRenderer();
  });

  it('updates mat alignment and offsets correctly', () => {
    renderer.matVisualWidth = renderer.tableWidth / 2; // simulate narrower mat
    renderer.updateMatAlignment('centered');
    expect(renderer.matOffsetX).toBeCloseTo((renderer.tableWidth - renderer.matVisualWidth) / 2, 5);

    renderer.updateMatAlignment('right');
    expect(renderer.matOffsetX).toBeCloseTo(renderer.tableWidth - renderer.matVisualWidth, 5);
  });

  it('converts coordinates to canvas and back consistently', () => {
    renderer.matVisualWidth = renderer.tableWidth; // 1:1 aspect to simplify
    renderer.updateMatAlignment('centered');
    const x = 120;
    const y = 60; // middle
    const cx = renderer.coordToCanvasX(x);
    const cy = renderer.coordToCanvasY(y);
    // reverse using canvasToCoord should approximate originals
    const rx = renderer.canvasToCoordX(cx);
    const ry = renderer.canvasToCoordY(cy);
    expect(rx).toBeCloseTo(x, 1);
    expect(ry).toBeCloseTo(y, 1);
  });

  it('detects point in robot body and rotation handle position', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    const inside = renderer.isPointInRobot(30, 30, robot);
    const outside = renderer.isPointInRobot(0, 0, robot);
    expect(inside).toBe(true);
    expect(outside).toBe(false);

    const handle = renderer.getRotationHandlePosition(robot);
    expect(handle.x).toBeGreaterThanOrEqual(robot.startX - 1e-6);
  });

  it('starts drag on robot body and rotation on handle', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    // Compute a screen coordinate over the robot center
    const cx = renderer.coordToCanvasX(30);
    const cy = renderer.coordToCanvasY(30);
    // Stub rect to meaningful size
    canvasEl.width = 600; canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    // synthesize event with correct client coords (invert css scale in handler)
    const eDrag = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseDown(eDrag);
    expect(renderer.isDragging || renderer.isRotating).toBe(true);
    renderer.onMouseUp();

    const handle = renderer.getRotationHandlePosition(robot);
    const hx = renderer.coordToCanvasX(handle.x);
    const hy = renderer.coordToCanvasY(handle.y);
    const eRotate = { clientX: rect.left + (hx / (renderer.canvas.width / rect.width)), clientY: rect.top + (hy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseDown(eRotate);
    expect(renderer.isRotating || renderer.isDragging).toBe(true);
  });

  it('renders mat, robots, wheels, and markers', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, wheelCircumference: 19.6, wheelBase: 12, startX: 30, startY: 30, startAngle: 0 };
    const path = {
      points: [
        { x: 30, y: 30, angle: 0, leftWheelX: 29, leftWheelY: 30, rightWheelX: 31, rightWheelY: 30, segmentEnd: false },
        { x: 35, y: 35, angle: 10, leftWheelX: 34, leftWheelY: 35, rightWheelX: 36, rightWheelY: 35, segmentEnd: true }
      ],
      valid: true
    };
    // Use blank mat URL
    renderer.render('', robot, path);
    // Assert some ctx calls occurred (jest-canvas-mock collects calls)
    expect(renderer.ctx.__getEvents()).not.toHaveLength(0);
  });

  it('handles mat image load error and resets visual width', () => {
    const OriginalImage = global.Image;
    class ErrorImage {
      constructor() { this.onerror = null; this.onload = null; }
      set src(v) { if (this.onerror) this.onerror(new Error('boom')); }
      get src() { return ''; }
    }
    global.Image = ErrorImage;

    const spyErr = jest.spyOn(console, 'error');
    const prevWidth = renderer.tableWidth;
    renderer.matVisualWidth = 123; // non-default to see reset
    renderer.loadMatImage('http://invalid.example/mat.png');
    expect(spyErr).toHaveBeenCalled();
    expect(renderer.matImage).toBeNull();
    expect(renderer.matVisualWidth).toBe(prevWidth);

    global.Image = OriginalImage;
  });

  it('uses cached mat image path to draw immediately', () => {
    // Simulate an already loaded image with known dimensions
    renderer.currentMatUrl = 'http://example.com/mat.png';
    const imgCanvas = document.createElement('canvas');
    imgCanvas.width = 2000;
    imgCanvas.height = 1000;
    renderer.matImage = imgCanvas;
    const drawSpy = jest.spyOn(renderer.ctx, 'drawImage');
    renderer.loadMatImage('http://example.com/mat.png');
    expect(drawSpy).toHaveBeenCalledTimes(1);
    // matVisualWidth should be tableHeight * aspect (2.0 here)
    expect(renderer.matVisualWidth).toBeCloseTo(renderer.tableHeight * 2, 5);
  });

  it('logs when wheel coordinates are missing', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const path = { points: [ { x: 10, y: 10, angle: 0 } ] }; // no wheel coords
    renderer.drawWheelPaths(path);
    expect(logSpy).toHaveBeenCalledWith('No left wheel coordinates in path points');
    expect(logSpy).toHaveBeenCalledWith('No right wheel coordinates in path points');
  });

  it('handles robot image load error gracefully', () => {
    const OriginalImage = global.Image;
    class ErrorImage {
      constructor() { this.onerror = null; this.onload = null; }
      set src(v) { if (this.onerror) this.onerror(new Error('robot fail')); }
      get src() { return ''; }
    }
    global.Image = ErrorImage;

    const errSpy = jest.spyOn(console, 'error');
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0, imageUrl: 'http://bad/robot.png' };
    renderer.drawRobot(robot, 30, 30, 0);
    expect(errSpy).toHaveBeenCalledWith('Failed to load robot image:', robot.imageUrl);
    expect(renderer.robotImage).toBeNull();

    global.Image = OriginalImage;
  });

  it('updates cursor to grab when hovering over robot', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    
    const cx = renderer.coordToCanvasX(30);
    const cy = renderer.coordToCanvasY(30);
    canvasEl.width = 600;
    canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    
    const e = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseMove(e);
    
    expect(renderer.canvas.style.cursor).toBe('grab');
  });

  it('updates cursor to grab when hovering over rotation handle', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    
    const handle = renderer.getRotationHandlePosition(robot);
    const cx = renderer.coordToCanvasX(handle.x);
    const cy = renderer.coordToCanvasY(handle.y);
    canvasEl.width = 600;
    canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    
    const e = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseMove(e);
    
    expect(renderer.canvas.style.cursor).toBe('grab');
  });

  it('handles mouse move during rotation', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    renderer.isRotating = true;
    
    document.body.innerHTML = '<input id="startAngle" value="0" />';
    canvasEl = document.createElement('canvas');
    renderer.canvas = canvasEl;
    
    const cx = renderer.coordToCanvasX(40);
    const cy = renderer.coordToCanvasY(40);
    canvasEl.width = 600;
    canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    
    const e = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseMove(e);
    
    expect(window.missionPlanner.update).toHaveBeenCalled();
  });

  it('handles mouse move during dragging', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    renderer.isDragging = true;
    renderer.dragOffsetX = 0;
    renderer.dragOffsetY = 0;
    
    document.body.innerHTML = '<input id="startX" value="30" /><input id="startY" value="30" />';
    canvasEl = document.createElement('canvas');
    renderer.canvas = canvasEl;
    
    const cx = renderer.coordToCanvasX(35);
    const cy = renderer.coordToCanvasY(35);
    canvasEl.width = 600;
    canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    
    const e = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseMove(e);
    
    expect(window.missionPlanner.update).toHaveBeenCalled();
  });

  it('clamps robot position to mat bounds during drag', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    renderer.robotConfig = robot;
    renderer.isDragging = true;
    renderer.dragOffsetX = 0;
    renderer.dragOffsetY = 0;
    
    document.body.innerHTML = '<input id="startX" value="30" /><input id="startY" value="30" />';
    canvasEl = document.createElement('canvas');
    renderer.canvas = canvasEl;
    
    // Try to drag outside bounds (negative coordinates)
    const cx = renderer.coordToCanvasX(-10);
    const cy = renderer.coordToCanvasY(-10);
    canvasEl.width = 600;
    canvasEl.height = 400;
    const rect = { left: 0, top: 0, width: canvasEl.width, height: canvasEl.height, right: canvasEl.width, bottom: canvasEl.height };
    canvasEl.getBoundingClientRect = () => rect;
    
    const e = { clientX: rect.left + (cx / (renderer.canvas.width / rect.width)), clientY: rect.top + (cy / (renderer.canvas.height / rect.height)) };
    renderer.onMouseMove(e);
    
    const startX = parseFloat(document.getElementById('startX').value);
    const startY = parseFloat(document.getElementById('startY').value);
    
    expect(startX).toBeGreaterThanOrEqual(0);
    expect(startY).toBeGreaterThanOrEqual(0);
  });

  it('updates mat alignment to left (defaults to centered)', () => {
    renderer.matVisualWidth = renderer.tableWidth / 2;
    renderer.updateMatAlignment('left');
    // 'left' is not specifically handled, so it defaults to centered
    expect(renderer.matOffsetX).toBeCloseTo((renderer.tableWidth - renderer.matVisualWidth) / 2, 1);
    expect(renderer.matOffsetY).toBe(0);
  });

  it('handles different mat alignments properly', () => {
    renderer.matVisualWidth = renderer.tableWidth / 2;
    
    renderer.updateMatAlignment('centered');
    const centeredOffset = renderer.matOffsetX;
    
    renderer.updateMatAlignment('something-else');
    // Unknown alignment defaults to centered
    expect(renderer.matOffsetX).toBeCloseTo(centeredOffset, 1);
    
    renderer.updateMatAlignment('right');
    expect(renderer.matOffsetX).toBeGreaterThan(centeredOffset);
  });

  describe('Rotation handle position with aspect ratio', () => {
    it('positions handle correctly at 0° (north) with non-square aspect ratio', () => {
      renderer.matVisualWidth = renderer.tableWidth;
      renderer.matVisualHeight = renderer.tableHeight;
      renderer.updateMatAlignment('centered');
      
      const robot = { 
        length: 20, 
        width: 15, 
        wheelOffset: 3, 
        startX: 100, 
        startY: 50, 
        startAngle: 0
      };
      
      const handle = renderer.getRotationHandlePosition(robot);
      const axleCenterX = robot.startX + robot.width / 2;
      const axleCenterY = robot.startY + robot.wheelOffset;
      
      expect(handle.x).toBeCloseTo(axleCenterX, 2);
      expect(handle.y).toBeGreaterThan(axleCenterY);
      expect(renderer.isPointInRotationHandle(handle.x, handle.y, robot)).toBe(true);
    });
    
    it('positions handle correctly at 90° (west - counterclockwise)', () => {
      renderer.matVisualWidth = renderer.tableWidth;
      renderer.matVisualHeight = renderer.tableHeight;
      renderer.updateMatAlignment('centered');
      
      const robot = { 
        length: 20, 
        width: 15, 
        wheelOffset: 3, 
        startX: 100, 
        startY: 50, 
        startAngle: 90
      };
      
      const handle = renderer.getRotationHandlePosition(robot);
      const axleCenterX = robot.startX + robot.width / 2;
      const axleCenterY = robot.startY + robot.wheelOffset;
      
      // At 90° (counterclockwise from north), robot faces west (left), handle is further left
      expect(handle.y).toBeCloseTo(axleCenterY, 2);
      expect(handle.x).toBeLessThan(axleCenterX);
      expect(renderer.isPointInRotationHandle(handle.x, handle.y, robot)).toBe(true);
    });
    
    it('positions handle correctly at 180° (south)', () => {
      renderer.matVisualWidth = renderer.tableWidth;
      renderer.matVisualHeight = renderer.tableHeight;
      renderer.updateMatAlignment('centered');
      
      const robot = { 
        length: 20, 
        width: 15, 
        wheelOffset: 3, 
        startX: 100, 
        startY: 50, 
        startAngle: 180
      };
      
      const handle = renderer.getRotationHandlePosition(robot);
      const axleCenterX = robot.startX + robot.width / 2;
      const axleCenterY = robot.startY + robot.wheelOffset;
      
      expect(handle.x).toBeCloseTo(axleCenterX, 2);
      expect(handle.y).toBeLessThan(axleCenterY);
      expect(renderer.isPointInRotationHandle(handle.x, handle.y, robot)).toBe(true);
    });
    
    it('positions handle correctly at 270° (east - counterclockwise)', () => {
      renderer.matVisualWidth = renderer.tableWidth;
      renderer.matVisualHeight = renderer.tableHeight;
      renderer.updateMatAlignment('centered');
      
      const robot = { 
        length: 20, 
        width: 15, 
        wheelOffset: 3, 
        startX: 100, 
        startY: 50, 
        startAngle: 270
      };
      
      const handle = renderer.getRotationHandlePosition(robot);
      const axleCenterX = robot.startX + robot.width / 2;
      const axleCenterY = robot.startY + robot.wheelOffset;
      
      // At 270° (counterclockwise from north), robot faces east (right), handle is further right
      expect(handle.y).toBeCloseTo(axleCenterY, 2);
      expect(handle.x).toBeGreaterThan(axleCenterX);
      expect(renderer.isPointInRotationHandle(handle.x, handle.y, robot)).toBe(true);
    });
    
    it('maintains consistent handle distance across all angles', () => {
      renderer.matVisualWidth = renderer.tableWidth;
      renderer.matVisualHeight = renderer.tableHeight;
      renderer.updateMatAlignment('centered');
      
      const robot = { 
        length: 20, 
        width: 15, 
        wheelOffset: 3, 
        startX: 100, 
        startY: 50, 
        startAngle: 0
      };
      
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const distances = [];
      
      angles.forEach(angle => {
        robot.startAngle = angle;
        const handle = renderer.getRotationHandlePosition(robot);
        const axleCenterX = robot.startX + robot.width / 2;
        const axleCenterY = robot.startY + robot.wheelOffset;
        
        const dx = handle.x - axleCenterX;
        const dy = handle.y - axleCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        distances.push(distance);
        
        expect(renderer.isPointInRotationHandle(handle.x, handle.y, robot)).toBe(true);
      });
      
      const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
      distances.forEach(distance => {
        expect(Math.abs(distance - avgDistance) / avgDistance).toBeLessThan(0.05);
      });
    });
  });

  it('draws path points and handles empty errors array', () => {
    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0 };
    const path = {
      points: [
        { x: 30, y: 30, angle: 0, leftWheelX: 29, leftWheelY: 30, rightWheelX: 31, rightWheelY: 30, segmentEnd: false }
      ],
      valid: true,
      errors: []
    };
    
    const strokeSpy = jest.spyOn(renderer.ctx, 'stroke');
    renderer.render('', robot, path);
    
    expect(strokeSpy).toHaveBeenCalled();
  });

  it('draws robot image when loaded successfully', () => {
    const OriginalImage = global.Image;
    class SuccessImage {
      constructor() { this.onload = null; this.onerror = null; this.width = 100; this.height = 100; }
      set src(v) { 
        this._src = v;
        if (this.onload) setTimeout(() => this.onload(), 0); 
      }
      get src() { return this._src; }
    }
    global.Image = SuccessImage;

    const robot = { length: 20, width: 15, wheelOffset: 3, startX: 30, startY: 30, startAngle: 0, imageUrl: 'http://example.com/robot.png' };
    
    renderer.drawRobot(robot, 30, 30, 0);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(renderer.robotImage).not.toBeNull();
        global.Image = OriginalImage;
        resolve();
      }, 50);
    });
  });
});
