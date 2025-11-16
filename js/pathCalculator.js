// Path Calculation Engine
class PathCalculator {
    constructor() {
        this.pathResolution = 1; // Calculate path point every 1 degree of wheel rotation
    }
    
    calculatePath(program, robotConfig) {
        if (!program || program.length === 0) {
            return { points: [], valid: true };
        }
        
        // Starting position and orientation
        let x = robotConfig.startX;
        let y = robotConfig.startY;
        let angle = robotConfig.startAngle;
        
        const points = [{
            x: x,
            y: y,
            angle: angle,
            segmentEnd: false
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
        const points = [];
        
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
        
        // Calculate distance traveled
        const wheelRotations = degrees / 360;
        const distanceCm = wheelRotations * robotConfig.wheelCircumference;
        
        // Calculate number of steps
        const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 10));
        
        // Generate points along the straight line
        for (let i = 0; i <= numSteps; i++) {
            const t = i / numSteps;
            const distance = distanceCm * t;
            
            // Calculate position
            const angleRad = (startAngle * Math.PI) / 180;
            const x = startX + distance * Math.cos(angleRad);
            const y = startY + distance * Math.sin(angleRad);
            
            points.push({
                x: x,
                y: y,
                angle: startAngle
            });
        }
        
        return points;
    }
    
    calculateArcMove(startX, startY, startAngle, direction, degrees, robotConfig) {
        const points = [];
        
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
            rightWheelDegrees = degrees * Math.max(0, reductionFactor); // Ensure non-negative
        } else {
            // Turning left: right motor is faster, left motor is slower
            rightWheelDegrees = degrees;
            const reductionFactor = (100 - Math.abs(direction) * 2) / 100;
            leftWheelDegrees = degrees * Math.max(0, reductionFactor); // Ensure non-negative
        }
        
        // Handle special cases where one motor goes backwards (direction >= 50 or <= -50)
        if (direction >= 50) {
            // Right motor reverses
            const reductionFactor = (100 - direction * 2) / 100;
            rightWheelDegrees = degrees * reductionFactor; // Will be negative
        } else if (direction <= -50) {
            // Left motor reverses
            const reductionFactor = (100 - Math.abs(direction) * 2) / 100;
            leftWheelDegrees = degrees * reductionFactor; // Will be negative
        }
        
        // Convert wheel rotations to distances
        const leftWheelDist = (leftWheelDegrees / 360) * robotConfig.wheelCircumference;
        const rightWheelDist = (rightWheelDegrees / 360) * robotConfig.wheelCircumference;
        
        // Calculate angular change using differential drive kinematics
        // deltaAngle = (rightDist - leftDist) / wheelBase
        const deltaAngleCm = rightWheelDist - leftWheelDist;
        const deltaAngle = (deltaAngleCm / robotConfig.wheelBase) * (180 / Math.PI);
        
        // Calculate the average distance traveled (center of robot)
        const avgDistance = (leftWheelDist + rightWheelDist) / 2;
        
        // Generate points along the arc
        const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 5));
        
        if (Math.abs(deltaAngle) < 0.01) {
            // Essentially straight (shouldn't happen but handle gracefully)
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                const distance = avgDistance * t;
                
                const angleRad = (startAngle * Math.PI) / 180;
                const x = startX + distance * Math.cos(angleRad);
                const y = startY + distance * Math.sin(angleRad);
                
                points.push({
                    x: x,
                    y: y,
                    angle: startAngle
                });
            }
        } else if (Math.abs(leftWheelDist + rightWheelDist) < 0.01) {
            // Turning in place (both wheels move equal distances in opposite directions)
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                points.push({
                    x: startX,
                    y: startY,
                    angle: startAngle + deltaAngle * t
                });
            }
        } else {
            // Moving in an arc
            // Calculate turn radius: R = avgDistance / deltaAngleRadians
            const deltaAngleRad = (deltaAngle * Math.PI) / 180;
            const turnRadius = Math.abs(avgDistance / deltaAngleRad);
            
            // Calculate center of turn circle
            // The center is perpendicular to the starting direction
            const perpAngle = startAngle + (deltaAngle > 0 ? -90 : 90);
            const perpAngleRad = (perpAngle * Math.PI) / 180;
            const centerX = startX + turnRadius * Math.cos(perpAngleRad);
            const centerY = startY + turnRadius * Math.sin(perpAngleRad);
            
            // Generate points along the arc
            for (let i = 0; i <= numSteps; i++) {
                const t = i / numSteps;
                const currentAngle = startAngle + deltaAngle * t;
                
                // Calculate position on arc relative to center
                const angleFromCenter = perpAngle + 180 + (deltaAngle > 0 ? deltaAngle * t : -deltaAngle * t);
                const angleFromCenterRad = (angleFromCenter * Math.PI) / 180;
                
                const x = centerX + turnRadius * Math.cos(angleFromCenterRad);
                const y = centerY + turnRadius * Math.sin(angleFromCenterRad);
                
                points.push({
                    x: x,
                    y: y,
                    angle: currentAngle
                });
            }
        }
        
        return points;
    }
}
