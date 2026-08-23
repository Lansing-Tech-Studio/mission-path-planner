// Path Calculation Engine
class PathCalculator {
    constructor() {
        this.pathResolution = 1; // Calculate path point every 1 degree of wheel rotation
    }
    
    // Offsets of the robot's rotated bounding box relative to its axle center, in cm.
    // Local frame: wheelOffset behind the axle, length-wheelOffset ahead, +/-width/2
    // across. 0 degrees faces up (+Y), positive angles turn counter-clockwise.
    footprintExtents(robotConfig, angleDeg) {
        const angleRad = ((angleDeg + 90) * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const halfWidth = robotConfig.width / 2;

        const xs = [];
        const ys = [];
        for (const along of [-robotConfig.wheelOffset, robotConfig.length - robotConfig.wheelOffset]) {
            for (const across of [-halfWidth, halfWidth]) {
                xs.push(along * cos - across * sin);
                ys.push(along * sin + across * cos);
            }
        }

        return {
            minX: Math.min(...xs), maxX: Math.max(...xs),
            minY: Math.min(...ys), maxY: Math.max(...ys)
        };
    }

    // robotConfig.startX/startY are the minimum X and Y of the robot's ROTATED
    // footprint, so X=0 means touching the mat's left edge at any heading. The
    // offset to the axle center must rotate with startAngle; assuming it is always
    // (width/2, wheelOffset) leaves the robot short of, or hanging over, the edge.
    anchorToAxle(robotConfig) {
        const extents = this.footprintExtents(robotConfig, robotConfig.startAngle);
        return { x: robotConfig.startX - extents.minX, y: robotConfig.startY - extents.minY };
    }

    axleToAnchor(robotConfig, axleX, axleY, angleDeg) {
        const extents = this.footprintExtents(robotConfig, angleDeg);
        return { x: axleX + extents.minX, y: axleY + extents.minY };
    }

    calculatePath(program, robotConfig) {
        if (!program || program.length === 0) {
            return { points: [], valid: true };
        }
        
        const axleCenter = this.anchorToAxle(robotConfig);
        let x = axleCenter.x;
        let y = axleCenter.y;
        let angle = robotConfig.startAngle;
        
        // Calculate initial wheel positions
        // Add 90° so that 0° points up instead of right
        const angleRad = ((angle + 90) * Math.PI) / 180;
        const perpAngleRad = angleRad + Math.PI / 2;
        const halfWheelBase = robotConfig.wheelBase / 2;
        
        const points = [{
            x: x,
            y: y,
            angle: angle,
            segmentEnd: false,
            leftWheelX: x + halfWheelBase * Math.cos(perpAngleRad),
            leftWheelY: y + halfWheelBase * Math.sin(perpAngleRad),
            rightWheelX: x - halfWheelBase * Math.cos(perpAngleRad),
            rightWheelY: y - halfWheelBase * Math.sin(perpAngleRad)
        }];
        
        let allValid = true;
        
        // Process each move block
        for (let i = 0; i < program.length; i++) {
            const block = program[i];
            
            // Skip text blocks
            if (block.type === 'text') {
                continue;
            }
            
            // Skip invalid move blocks
            if (block.type === 'move' && !block.valid) {
                allValid = false;
                break;
            }
            
            if (block.type === 'move') {
                const newPoints = this.calculateMoveBlock(
                    x, y, angle,
                    block.direction,
                    block.degrees,
                    robotConfig
                );
                
                // Add new points to path (skip first point as it's the same as last)
                for (let j = 1; j < newPoints.length; j++) {
                    const point = newPoints[j];
                    // Mark the last point of each segment
                    point.segmentEnd = (j === newPoints.length - 1);
                    points.push(point);
                }
                
                // Update current position
                if (newPoints.length > 0) {
                    const lastPoint = newPoints[newPoints.length - 1];
                    x = lastPoint.x;
                    y = lastPoint.y;
                    angle = lastPoint.angle;
                }
            }
        }
        
        return {
            points: points,
            valid: allValid
        };
    }
    
    calculateMoveBlock(startX, startY, startAngle, direction, degrees, robotConfig) {
        // Convert direction to a value between -100 and 100
        direction = Math.max(-100, Math.min(100, direction));
        
        if (direction === 0) {
            // Straight line movement
            return this.calculateStraightMove(startX, startY, startAngle, degrees, robotConfig);
        } else {
            // Arc movement
            return this.calculateArcMove(startX, startY, startAngle, direction, degrees, robotConfig);
        }
    }
    
    calculateStraightMove(startX, startY, startAngle, degrees, robotConfig) {
        const points = [];

        // Calibration factors (default to no correction for legacy/uncalibrated configs)
        const cal = robotConfig.calibration || {};
        const distanceFactor = cal.distanceFactor ?? 1.0;
        const driftOffset = cal.driftOffset ?? 0.0;

        // Calculate distance traveled (scaled by the distance calibration factor)
        const wheelRotations = degrees / 360;
        const distanceCm = wheelRotations * robotConfig.wheelCircumference * distanceFactor;

        const halfWheelBase = robotConfig.wheelBase / 2;

        if (driftOffset === 0) {
            // No drift: the move is a true straight line. Closed-form interpolation.
            const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 10));

            // Generate points along the straight line
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                const distance = distanceCm * t;

                // Calculate position
                // Add 90° so that 0° points up instead of right
                const angleRad = ((startAngle + 90) * Math.PI) / 180;
                const x = startX + distance * Math.cos(angleRad);
                // Y-axis increases upward, use standard mathematical convention
                const y = startY + distance * Math.sin(angleRad);

                // Calculate wheel positions for visualization
                const perpAngleRad = angleRad + Math.PI / 2;

                points.push({
                    x: x,
                    y: y,
                    angle: startAngle,
                    leftWheelX: x + halfWheelBase * Math.cos(perpAngleRad),
                    leftWheelY: y + halfWheelBase * Math.sin(perpAngleRad),
                    rightWheelX: x - halfWheelBase * Math.cos(perpAngleRad),
                    rightWheelY: y - halfWheelBase * Math.sin(perpAngleRad)
                });
            }
        } else {
            // Drift present: the heading evolves as the robot travels, so the "straight"
            // move becomes a gentle arc. Integrate incrementally (forward Euler), matching
            // the arc branch's update order. driftOffset is degrees per metre; the heading
            // change after travelling d cm is driftOffset * (d / 100) degrees. A positive
            // driftOffset must curve right, and in this file's convention a right turn is a
            // NEGATIVE angle change, so the drift sign is -1.
            const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 5));
            const deltaDistance = distanceCm / numSteps; // signed (negative for backward moves)

            let currentX = startX;
            let currentY = startY;
            let currentAngle = startAngle;

            for (let i = 0; i <= numSteps; i++) {
                if (i > 0) {
                    // Drift turns this "straight" move into a gentle arc. Translate along the
                    // heading at the step's midpoint (current + half the step's drift) for the
                    // same on-arc accuracy as the arc branch, then apply the full heading change.
                    const dThetaDeg = -1 * driftOffset * (deltaDistance / 100);
                    const midAngleRad = ((currentAngle + dThetaDeg / 2 + 90) * Math.PI) / 180;
                    currentX += deltaDistance * Math.cos(midAngleRad);
                    currentY += deltaDistance * Math.sin(midAngleRad);
                    currentAngle += dThetaDeg;
                }

                // Calculate wheel positions for visualization
                const angleRad = ((currentAngle + 90) * Math.PI) / 180;
                const perpAngleRad = angleRad + Math.PI / 2;

                points.push({
                    x: currentX,
                    y: currentY,
                    angle: currentAngle,
                    leftWheelX: currentX + halfWheelBase * Math.cos(perpAngleRad),
                    leftWheelY: currentY + halfWheelBase * Math.sin(perpAngleRad),
                    rightWheelX: currentX - halfWheelBase * Math.cos(perpAngleRad),
                    rightWheelY: currentY - halfWheelBase * Math.sin(perpAngleRad)
                });
            }
        }

        return points;
    }
    
    calculateArcMove(startX, startY, startAngle, direction, degrees, robotConfig) {
        const points = [];

        // Calibration: turnFactor scales the angular change (default 1.0 = no correction).
        const cal = robotConfig.calibration || {};
        const turnFactor = cal.turnFactor ?? 1.0;

        // Spike Prime movement behavior:
        // - "degrees" parameter specifies the FASTER motor's rotation
        // - The slower motor gets reduced by: (100 - direction * 2) / 100
        // - For direction = 30: slower motor = (100 - 60) / 100 = 40% of faster motor
        // - Positive direction = turn right (right motor slower)
        // - Negative direction = turn left (left motor slower)
        
        let leftWheelDegrees, rightWheelDegrees;
        
        if (direction === 0) {
            // This shouldn't happen as straight moves are handled separately
            leftWheelDegrees = degrees;
            rightWheelDegrees = degrees;
        } else if (direction > 0) {
            // Turning right: left motor is faster, right motor is slower
            leftWheelDegrees = degrees;
            const reductionFactor = (100 - direction * 2) / 100;
            rightWheelDegrees = degrees * reductionFactor; // Can be negative for sharp turns (>50)
        } else {
            // Turning left: right motor is faster, left motor is slower
            rightWheelDegrees = degrees;
            const reductionFactor = (100 - Math.abs(direction) * 2) / 100;
            leftWheelDegrees = degrees * reductionFactor; // Can be negative for sharp turns (<-50)
        }
        
        // Convert wheel rotations to distances
        const leftWheelDist = (leftWheelDegrees / 360) * robotConfig.wheelCircumference;
        const rightWheelDist = (rightWheelDegrees / 360) * robotConfig.wheelCircumference;
        
        // Calculate angular change using differential drive kinematics
        // deltaAngle = (rightDist - leftDist) / wheelBase
        const deltaAngle = ((rightWheelDist - leftWheelDist) / robotConfig.wheelBase) * (180 / Math.PI);
        
        // Generate points along the path using proper differential drive kinematics
        const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 5));
        
        if (Math.abs(leftWheelDist + rightWheelDist) < 0.01) {
            // Turning in place (both wheels move equal distances in opposite directions)
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                const angle = startAngle + deltaAngle * turnFactor * t;
                
                // Calculate wheel positions for visualization
                // Add 90° so that 0° points up instead of right
                const angleRad = ((angle + 90) * Math.PI) / 180;
                const perpAngleRad = angleRad + Math.PI / 2;
                const halfWheelBase = robotConfig.wheelBase / 2;
                
                points.push({
                    x: startX,
                    y: startY,
                    angle: angle,
                    leftWheelX: startX + halfWheelBase * Math.cos(perpAngleRad),
                    leftWheelY: startY + halfWheelBase * Math.sin(perpAngleRad),
                    rightWheelX: startX - halfWheelBase * Math.cos(perpAngleRad),
                    rightWheelY: startY - halfWheelBase * Math.sin(perpAngleRad)
                });
            }
        } else {
            // Moving in an arc or straight
            // Use incremental simulation for accurate path tracking
            let currentX = startX;
            let currentY = startY;
            let currentAngle = startAngle;
            
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                
                // Calculate incremental wheel movements
                const leftDist = leftWheelDist * t;
                const rightDist = rightWheelDist * t;
                
                if (i > 0) {
                    const prevT = (i - 1) / numSteps;
                    const prevLeftDist = leftWheelDist * prevT;
                    const prevRightDist = rightWheelDist * prevT;
                    
                    const deltaLeft = leftDist - prevLeftDist;
                    const deltaRight = rightDist - prevRightDist;
                    
                    // Calculate change in angle (scaled by the turn calibration factor)
                    const deltaTheta = ((deltaRight - deltaLeft) / robotConfig.wheelBase) * turnFactor;

                    // Calculate change in position (using average distance).
                    // Translate along the heading at the MIDPOINT of this step (current
                    // heading + half the step's turn) rather than the start-of-step heading.
                    // This midpoint rule keeps points on the true circular arc (O(δ³) error)
                    // instead of drifting off it as start-of-step forward-Euler does (O(δ²)).
                    const deltaDistance = (deltaLeft + deltaRight) / 2;
                    // Add 90° so that 0° points up instead of right
                    const midAngleRad = ((currentAngle + 90) * Math.PI) / 180 + deltaTheta / 2;

                    currentX += deltaDistance * Math.cos(midAngleRad);
                    // Y-axis increases upward, use standard mathematical convention
                    currentY += deltaDistance * Math.sin(midAngleRad);
                    currentAngle += deltaTheta * (180 / Math.PI);
                }
                
                // Calculate wheel positions for visualization
                // Add 90° so that 0° points up instead of right
                const angleRad = ((currentAngle + 90) * Math.PI) / 180;
                const perpAngleRad = angleRad + Math.PI / 2;
                const halfWheelBase = robotConfig.wheelBase / 2;
                
                const leftWheelX = currentX + halfWheelBase * Math.cos(perpAngleRad);
                const leftWheelY = currentY + halfWheelBase * Math.sin(perpAngleRad);
                const rightWheelX = currentX - halfWheelBase * Math.cos(perpAngleRad);
                const rightWheelY = currentY - halfWheelBase * Math.sin(perpAngleRad);
                
                points.push({
                    x: currentX,
                    y: currentY,
                    angle: currentAngle,
                    leftWheelX: leftWheelX,
                    leftWheelY: leftWheelY,
                    rightWheelX: rightWheelX,
                    rightWheelY: rightWheelY
                });
            }
        }
        
        return points;
    }
}

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.PathCalculator = PathCalculator;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PathCalculator;
}
