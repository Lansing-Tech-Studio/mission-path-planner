const PathCalculator = require('../../js/pathCalculator.js');
const CanvasRenderer = require('../../js/canvas.js');
const BlockManager = require('../../js/blocks.js');
const {
  robotFootprint,
  expectedAxleCenter,
  footprintFromAnchor
} = require('../helpers/footprint.js');

// startX/startY are the min corner of the robot's ROTATED footprint, so "X = 0"
// means the robot touches the mat's left edge at every heading. The production
// anchor -> axle conversion must therefore rotate with startAngle; historically it
// added width/2 and wheelOffset along the world axes, which only holds at 0°.

const PRESETS = [
  { name: 'DadBot', length: 16.5, width: 15, wheelOffset: 3.1, wheelCircumference: 19.6, wheelBase: 13.3 },
  { name: 'Coop Bot', length: 12, width: 13.6, wheelOffset: 4, wheelCircumference: 17.5, wheelBase: 10.4 },
  { name: 'LEGO Advanced', length: 20, width: 16.8, wheelOffset: 8.8, wheelCircumference: 27.6, wheelBase: 13.6 }
];

const ANGLES = [0, 30, -30, 45, -45, 90, -90, 135, -135, 180];

// Dragging writes the anchor back to 0.1cm number inputs, so "touching an edge" is
// only ever exact to half a step. 0.5mm is well below FLL placement accuracy.
const INPUT_RESOLUTION = 0.05;

// One case per preset/heading so a failure names the heading that is off.
const CASES = PRESETS.flatMap((preset) => ANGLES.map((angle) => ({ preset, angle })));

const config = (preset, startX, startY, startAngle) => ({
  ...preset,
  startX,
  startY,
  startAngle,
  distanceFactor: 1,
  turnFactor: 1,
  driftOffset: 0
});

// Any non-empty program yields points[0] = the starting axle center.
const startPose = (cfg) =>
  new PathCalculator().calculatePath([{ id: 1, type: 'text', content: '' }], cfg).points[0];

// Where the robot actually ends up: production turns the anchor into an axle center,
// the oracle turns that axle center into corners. Never derive both from the oracle,
// or the assertion becomes a tautology.
const actualFootprint = (cfg) => {
  const pose = startPose(cfg);
  return robotFootprint(cfg, pose.x, pose.y, pose.angle);
};

describe('robot alignment: the anchor is the rotated bounding-box corner', () => {
  it.each(CASES)('$preset.name @ $angle°: the footprint min corner lands on the anchor', ({ preset, angle }) => {
    const cfg = config(preset, 40, 25, angle);
    const fp = actualFootprint(cfg);

    expect(fp.minX).toBeCloseTo(cfg.startX, 6);
    expect(fp.minY).toBeCloseTo(cfg.startY, 6);
  });

  it.each(PRESETS)('$name: anchor semantics are unchanged at 0° so saved programs still load', (preset) => {
    const cfg = config(preset, 40, 25, 0);
    const pose = startPose(cfg);

    expect(pose.x).toBeCloseTo(cfg.startX + preset.width / 2, 6);
    expect(pose.y).toBeCloseTo(cfg.startY + preset.wheelOffset, 6);
  });

  it('DadBot at X=0 facing right touches the left edge instead of stopping 4.4cm short', () => {
    // The reported bug: width/2 - wheelOffset = 4.4cm of phantom gap at -90°.
    const cfg = config(PRESETS[0], 0, 25, -90);

    expect(actualFootprint(cfg).minX).toBeCloseTo(0, 6);
  });

  it.each(CASES)('$preset.name @ $angle°: a 0-degree move leaves the footprint where it started', ({ preset, angle }) => {
    const cfg = config(preset, 40, 25, angle);
    const path = new PathCalculator().calculatePath(
      [{ id: 1, type: 'move', direction: 0, degrees: 0, valid: true }],
      cfg
    );
    const last = path.points[path.points.length - 1];
    const fp = robotFootprint(cfg, last.x, last.y, last.angle);

    expect(fp.minX).toBeCloseTo(cfg.startX, 6);
    expect(fp.minY).toBeCloseTo(cfg.startY, 6);
  });
});

describe('robot alignment: modules agree on the starting pose', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="programBlocks"></div>';
  });

  it.each(CASES)('$preset.name @ $angle°: block positions start at the same axle center as the path', ({ preset, angle }) => {
    const cfg = config(preset, 40, 25, angle);
    window.missionPlanner = {
      pathCalculator: new PathCalculator(),
      robot: { getConfig: () => cfg }
    };
    const blocks = new BlockManager();
    blocks.blocks = [{ id: 1, type: 'move', direction: 0, degrees: 0, valid: true }];

    const pose = blocks.calculateAllBlockPositions()[0];
    const expected = expectedAxleCenter(cfg);

    expect(pose.x).toBeCloseTo(expected.x, 6);
    expect(pose.y).toBeCloseTo(expected.y, 6);
  });
});

describe('robot alignment: canvas', () => {
  let renderer;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="right-panel" style="width:800px;height:600px"><canvas id="missionCanvas"></canvas></div>
      <input type="number" id="startX" value="40" />
      <input type="number" id="startY" value="25" />
      <input type="number" id="startAngle" value="0" />
    `;
    window.missionPlanner = { update: jest.fn() };
    renderer = new CanvasRenderer();
    renderer.canvas.getBoundingClientRect = () => ({ left: 0, top: 0 });
  });

  // Drive onMouseMove with a pointer at a known mat coordinate.
  const movePointerTo = (matX, matY) =>
    renderer.onMouseMove({
      clientX: renderer.coordToCanvasX(matX),
      clientY: renderer.coordToCanvasY(matY)
    });

  const anchorFromInputs = (preset, angle) =>
    config(
      preset,
      parseFloat(document.getElementById('startX').value),
      parseFloat(document.getElementById('startY').value),
      angle
    );

  const startDrag = (preset, angle) => {
    document.getElementById('startX').value = '40';
    document.getElementById('startY').value = '25';
    renderer.robotConfig = config(preset, 40, 25, angle);
    renderer.isDragging = true;
    renderer.dragOffsetX = 0;
    renderer.dragOffsetY = 0;
  };

  describe('hit testing', () => {
    it.each(CASES)('$preset.name @ $angle°: the robot body matches the rotated footprint', ({ preset, angle }) => {
      const cfg = config(preset, 40, 25, angle);
      const fp = footprintFromAnchor(cfg);
      const axle = expectedAxleCenter(cfg);

      for (const [cx, cy] of fp.corners) {
        // Nudge each corner 0.2cm toward and away from the axle along the diagonal.
        const dx = axle.x - cx;
        const dy = axle.y - cy;
        const len = Math.hypot(dx, dy);
        const ux = (dx / len) * 0.2;
        const uy = (dy / len) * 0.2;

        expect(renderer.isPointInRobot(cx + ux, cy + uy, cfg)).toBe(true);
        expect(renderer.isPointInRobot(cx - ux, cy - uy, cfg)).toBe(false);
      }
    });
  });

  describe('drag clamping', () => {
    const EDGES = [
      { edge: 'left', target: [-500, 60], touching: (fp, r) => [fp.minX, 0] },
      { edge: 'right', target: [500, 60], touching: (fp, r) => [fp.maxX, r.matCoordWidth] },
      { edge: 'bottom', target: [120, -500], touching: (fp, r) => [fp.minY, 0] },
      { edge: 'top', target: [120, 500], touching: (fp, r) => [fp.maxY, r.matCoordHeight] }
    ];
    const EDGE_CASES = CASES.flatMap((c) => EDGES.map((e) => ({ ...c, ...e })));

    it.each(EDGE_CASES)('$preset.name @ $angle°: stops touching the $edge edge', ({ preset, angle, target, touching }) => {
      startDrag(preset, angle);

      movePointerTo(target[0], target[1]);

      const fp = actualFootprint(anchorFromInputs(preset, angle));
      const [actual, expected] = touching(fp, renderer);
      expect(Math.abs(actual - expected)).toBeLessThanOrEqual(INPUT_RESOLUTION);
    });

    it.each(CASES)('$preset.name @ $angle°: never hangs off a corner of the mat', ({ preset, angle }) => {
      for (const [tx, ty] of [[-500, -500], [500, 500], [-500, 500], [500, -500]]) {
        startDrag(preset, angle);
        movePointerTo(tx, ty);

        const fp = actualFootprint(anchorFromInputs(preset, angle));
        expect(fp.minX).toBeGreaterThanOrEqual(-INPUT_RESOLUTION);
        expect(fp.minY).toBeGreaterThanOrEqual(-INPUT_RESOLUTION);
        expect(fp.maxX).toBeLessThanOrEqual(renderer.matCoordWidth + INPUT_RESOLUTION);
        expect(fp.maxY).toBeLessThanOrEqual(renderer.matCoordHeight + INPUT_RESOLUTION);
      }
    });
  });

  describe('rotation', () => {
    it.each(PRESETS)('$name: rotating with the handle pivots about the axle, not the anchor', (preset) => {
      const cfg = config(preset, 40, 25, 0);
      const axleBefore = expectedAxleCenter(cfg);
      renderer.robotConfig = cfg;
      renderer.isRotating = true;

      // Drag the handle to the robot's right, which is a heading of -90°.
      movePointerTo(axleBefore.x + 30, axleBefore.y);

      const rotated = anchorFromInputs(preset, parseFloat(document.getElementById('startAngle').value));
      expect(rotated.startAngle).toBe(-90);

      const axleAfter = expectedAxleCenter(rotated);
      expect(Math.abs(axleAfter.x - axleBefore.x)).toBeLessThanOrEqual(INPUT_RESOLUTION);
      expect(Math.abs(axleAfter.y - axleBefore.y)).toBeLessThanOrEqual(INPUT_RESOLUTION);
    });
  });

  describe('drawing', () => {
    it('does not treat a path point that equals the anchor as the anchor', () => {
      const cfg = config(PRESETS[0], 40, 25, -90);
      const axle = expectedAxleCenter(cfg);
      // Silence everything that is not the robot itself so the spy below only sees
      // the two drawRobot calls.
      for (const m of ['drawMat', 'drawPathBodyAndLine', 'drawTextBlockPositions', 'drawWheelPaths', 'drawPathMarkers']) {
        jest.spyOn(renderer, m).mockImplementation(() => {});
      }
      const spy = jest.spyOn(renderer, 'coordToCanvasX');

      // The final pose lands exactly on the anchor coordinates: it must still be
      // drawn as an axle center, while the start pose is drawn from the anchor.
      renderer.render('', cfg, {
        valid: true,
        points: [
          { x: axle.x, y: axle.y, angle: -90, segmentEnd: false },
          { x: cfg.startX, y: cfg.startY, angle: -90, segmentEnd: true }
        ]
      });

      // [start pose converted from the anchor, final pose drawn as-is]
      const drawnAt = spy.mock.calls.map((c) => +c[0].toFixed(4));
      expect(drawnAt).toEqual([+axle.x.toFixed(4), +cfg.startX.toFixed(4)]);
    });
  });
});
