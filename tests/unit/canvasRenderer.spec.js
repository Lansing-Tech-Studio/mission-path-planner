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
});
