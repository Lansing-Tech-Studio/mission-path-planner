// Ground truth for "where does the robot physically sit on the mat".
// Derived independently of the production conversion code on purpose: tests that
// call the production anchor->axle math to check the production anchor->axle math
// prove nothing.
//
// Anchor semantics (option A): robotConfig.startX/startY are the minimum X and
// minimum Y of the robot's ROTATED footprint, i.e. the corner of its axis-aligned
// bounding box nearest the mat's origin at the current startAngle.

// Corners of the robot footprint given the axle center, in mat cm.
// Local frame: +forward is length-wise (wheelOffset behind the axle, length-wheelOffset
// ahead), +left is width-wise (±width/2). 0° faces up (+Y), positive angles turn CCW.
function robotFootprint(config, axleX, axleY, angleDeg) {
  const { length, width, wheelOffset } = config;
  const a = ((angleDeg + 90) * Math.PI) / 180;
  const f = [Math.cos(a), Math.sin(a)];
  const p = [-Math.sin(a), Math.cos(a)];

  const corners = [];
  for (const d of [-wheelOffset, length - wheelOffset]) {
    for (const s of [-width / 2, width / 2]) {
      corners.push([axleX + d * f[0] + s * p[0], axleY + d * f[1] + s * p[1]]);
    }
  }

  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return {
    corners,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

// Where the axle center must be so the footprint's min corner lands on the anchor.
function expectedAxleCenter(config) {
  const zero = robotFootprint(config, 0, 0, config.startAngle);
  return { x: config.startX - zero.minX, y: config.startY - zero.minY };
}

// Footprint implied by an anchor + angle, under option A.
function footprintFromAnchor(config) {
  const axle = expectedAxleCenter(config);
  return robotFootprint(config, axle.x, axle.y, config.startAngle);
}

module.exports = { robotFootprint, expectedAxleCenter, footprintFromAnchor };
