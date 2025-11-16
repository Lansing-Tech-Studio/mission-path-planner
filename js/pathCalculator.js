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
            angle: angle
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
                    points.push(newPoints[j]);
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
        
        // Calculate turning radius based on direction
        // direction: -100 (sharp left) to +100 (sharp right)
        // When direction = ±100, turn in place (radius = wheelBase/2)
        // When direction approaches 0, radius approaches infinity
        
        let turnRadius;
        let leftWheelDist, rightWheelDist;
        
        if (Math.abs(direction) === 100) {
            // Turn in place
            const wheelRotations = degrees / 360;
            const arcLength = wheelRotations * robotConfig.wheelCircumference;
            
            // For turning in place, each wheel goes opposite directions
            // The robot rotates around its center
            leftWheelDist = direction > 0 ? arcLength : -arcLength;
            rightWheelDist = direction > 0 ? -arcLength : arcLength;
            
            turnRadius = 0; // Special case
        } else {
            // Calculate arc movement
            // Map direction to turn sharpness
            // abs(direction) closer to 0 = wider turn, closer to 100 = tighter turn
            
            const directionFactor = Math.abs(direction) / 100;
            
            // Minimum turn radius is wheelBase/2, maximum is essentially infinity
            // We'll use a scale where direction 1 gives a large radius and 99 gives near minimum
            const minRadius = robotConfig.wheelBase / 2;
            const maxRadius = 500; // 5 meters max radius for reasonable turns
            
            // Exponential scaling for more natural feel
            turnRadius = minRadius + (maxRadius - minRadius) * Math.pow(1 - directionFactor, 3);
            
            // Calculate wheel distances
            const wheelRotations = degrees / 360;
            const centerArcLength = wheelRotations * robotConfig.wheelCircumference;
            
            if (direction > 0) {
                // Turning right
                leftWheelDist = centerArcLength * (1 + robotConfig.wheelBase / (2 * turnRadius));
                rightWheelDist = centerArcLength * (1 - robotConfig.wheelBase / (2 * turnRadius));
            } else {
                // Turning left
                leftWheelDist = centerArcLength * (1 - robotConfig.wheelBase / (2 * turnRadius));
                rightWheelDist = centerArcLength * (1 + robotConfig.wheelBase / (2 * turnRadius));
            }
        }
        
        // Calculate angular change
        const avgDistance = (leftWheelDist + rightWheelDist) / 2;
        const deltaAngle = ((rightWheelDist - leftWheelDist) / robotConfig.wheelBase) * (180 / Math.PI);
        
        // Generate points along the arc
        const numSteps = Math.max(2, Math.ceil(Math.abs(degrees) / 5));
        
        for (let i = 0; i <= numSteps; i++) {
            const t = i / numSteps;
            
            if (turnRadius === 0) {
                // Turning in place - position stays the same, only angle changes
                points.push({
                    x: startX,
                    y: startY,
                    angle: startAngle + deltaAngle * t
                });
            } else {
                // Moving in an arc
                const currentAngle = startAngle + deltaAngle * t;
                const distance = avgDistance * t;
                
                // Calculate center of turn circle
                const perpAngle = startAngle + (direction > 0 ? -90 : 90);
                const perpAngleRad = (perpAngle * Math.PI) / 180;
                const centerX = startX + turnRadius * Math.cos(perpAngleRad);
                const centerY = startY + turnRadius * Math.sin(perpAngleRad);
                
                // Calculate position on arc
                const angleFromCenter = perpAngle + 180 + (direction > 0 ? deltaAngle * t : -deltaAngle * t);
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
