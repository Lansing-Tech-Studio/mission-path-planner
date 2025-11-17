// Canvas Rendering System
class CanvasRenderer {
    constructor() {
        this.canvas = document.getElementById('missionCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // FLL mat is typically 2.4m x 1.2m (240cm x 120cm)
        this.matWidth = 240; // cm
        this.matHeight = 120; // cm
        
        // Scale factor (pixels per cm)
        this.scale = 3;
        
        this.matImage = null;
        this.robotImage = null;
        
        this.initCanvas();
    }
    
    initCanvas() {
        // Set canvas size based on mat dimensions
        this.canvas.width = this.matWidth * this.scale;
        this.canvas.height = this.matHeight * this.scale;
    }
    
    render(matUrl, robotConfig, path) {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mat background
        this.drawMat(matUrl);
        
        // Draw path if valid (body outlines and center line only)
        if (path && path.points && path.points.length > 0) {
            this.drawPathBodyAndLine(path, robotConfig);
        }
        
        // Draw starting robot position
        this.drawRobot(robotConfig, robotConfig.startX, robotConfig.startY, robotConfig.startAngle);
        
        // Draw final robot position if path exists
        if (path && path.points && path.points.length > 0) {
            const lastPoint = path.points[path.points.length - 1];
            this.drawRobot(robotConfig, lastPoint.x, lastPoint.y, lastPoint.angle, 0.5);
        }
        
        // Draw wheel paths on top of robots
        if (path && path.points && path.points.length > 0) {
            this.drawWheelPaths(path);
        }
        
        // Draw path dots and markers on top of everything
        if (path && path.points && path.points.length > 0) {
            this.drawPathMarkers(path);
        }
    }
    
    drawMat(matUrl) {
        // Draw white background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid for reference
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Draw 10cm grid
        for (let x = 0; x <= this.matWidth; x += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.scale, 0);
            this.ctx.lineTo(x * this.scale, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.matHeight; y += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.scale);
            this.ctx.lineTo(this.canvas.width, y * this.scale);
            this.ctx.stroke();
        }
        
        // If mat URL is provided, load and draw image
        if (matUrl && matUrl.trim() !== '') {
            this.loadMatImage(matUrl);
        }
        
        // Draw border
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    loadMatImage(url) {
        if (this.currentMatUrl === url && this.matImage) {
            // Image already loaded
            this.ctx.drawImage(this.matImage, 0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        
        this.currentMatUrl = url;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            this.matImage = img;
            // Redraw with image
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load mat image:', url);
            this.matImage = null;
        };
        
        img.src = url;
    }
    
    drawPathBodyAndLine(path, robotConfig) {
        if (!path.points || path.points.length === 0) return;
        
        // Draw robot body outline along path (lighter, wider) - first layer
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.12)';
        this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.25)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < path.points.length; i++) {
            const point = path.points[i];
            this.drawRobotOutline(robotConfig, point.x, point.y, point.angle);
        }
        
        // Draw center path line (darker, thinner) - second layer
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < path.points.length; i++) {
            const point = path.points[i];
            const screenX = point.x * this.scale;
            const screenY = point.y * this.scale;
            
            if (i === 0) {
                this.ctx.moveTo(screenX, screenY);
            } else {
                this.ctx.lineTo(screenX, screenY);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawWheelPaths(path) {
        if (!path.points || path.points.length === 0) return;
        
        console.log('drawWheelPaths called with', path.points.length, 'points');
        
        // Draw left wheel path (blue)
        if (path.points[0].leftWheelX !== undefined) {
            console.log('Drawing left wheel path - color: #2196F3, width: 2');
            console.log('First left wheel point:', path.points[0].leftWheelX, path.points[0].leftWheelY);
            console.log('First left screen coords:', path.points[0].leftWheelX * this.scale, path.points[0].leftWheelY * this.scale);
            
            this.ctx.save();
            this.ctx.strokeStyle = '#1976D2';
            this.ctx.lineWidth = 2.5;
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowColor = 'rgba(25, 118, 210, 0.5)';
            this.ctx.shadowBlur = 2;
            this.ctx.beginPath();
            
            for (let i = 0; i < path.points.length; i++) {
                const point = path.points[i];
                if (point.leftWheelX !== undefined && point.leftWheelY !== undefined) {
                    const screenX = point.leftWheelX * this.scale;
                    const screenY = point.leftWheelY * this.scale;
                    
                    if (i === 0) {
                        this.ctx.moveTo(screenX, screenY);
                    } else {
                        this.ctx.lineTo(screenX, screenY);
                    }
                }
            }
            
            this.ctx.stroke();
            this.ctx.restore();
            console.log('Left wheel path drawn');
        } else {
            console.log('No left wheel coordinates in path points');
        }
        
        // Draw right wheel path (orange)
        if (path.points[0].rightWheelX !== undefined) {
            console.log('Drawing right wheel path - color: #FF9800, width: 2');
            console.log('First right wheel point:', path.points[0].rightWheelX, path.points[0].rightWheelY);
            console.log('First right screen coords:', path.points[0].rightWheelX * this.scale, path.points[0].rightWheelY * this.scale);
            
            this.ctx.save();
            this.ctx.strokeStyle = '#F57C00';
            this.ctx.lineWidth = 2.5;
            this.ctx.globalAlpha = 1.0;
            this.ctx.shadowColor = 'rgba(245, 124, 0, 0.5)';
            this.ctx.shadowBlur = 2;
            this.ctx.beginPath();
            
            for (let i = 0; i < path.points.length; i++) {
                const point = path.points[i];
                if (point.rightWheelX !== undefined && point.rightWheelY !== undefined) {
                    const screenX = point.rightWheelX * this.scale;
                    const screenY = point.rightWheelY * this.scale;
                    
                    if (i === 0) {
                        this.ctx.moveTo(screenX, screenY);
                    } else {
                        this.ctx.lineTo(screenX, screenY);
                    }
                }
            }
            
            this.ctx.stroke();
            this.ctx.restore();
            console.log('Right wheel path drawn');
        } else {
            console.log('No right wheel coordinates in path points');
        }
    }
    
    drawPathMarkers(path) {
        if (!path.points || path.points.length === 0) return;
        
        // Draw dots at each path point (axle center point)
        this.ctx.fillStyle = '#1B5E20';
        for (let i = 0; i < path.points.length; i += Math.max(1, Math.floor(path.points.length / 50))) {
            const point = path.points[i];
            this.ctx.beginPath();
            this.ctx.arc(point.x * this.scale, point.y * this.scale, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw larger dots at segment end points
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < path.points.length; i++) {
            const point = path.points[i];
            if (point.segmentEnd) {
                this.ctx.beginPath();
                this.ctx.arc(point.x * this.scale, point.y * this.scale, 4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
        }
        
        // Draw start point (larger, green)
        if (path.points.length > 0) {
            const start = path.points[0];
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.strokeStyle = '#2E7D32';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(start.x * this.scale, start.y * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
        
        // Draw end point (larger, red)
        if (path.points.length > 1) {
            const end = path.points[path.points.length - 1];
            this.ctx.fillStyle = '#f44336';
            this.ctx.strokeStyle = '#c62828';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(end.x * this.scale, end.y * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawRobotOutline(robotConfig, x, y, angleDeg) {
        this.ctx.save();
        
        const screenX = x * this.scale;
        const screenY = y * this.scale;
        
        // Translate to robot position
        this.ctx.translate(screenX, screenY);
        
        // Rotate to robot angle
        this.ctx.rotate((angleDeg * Math.PI) / 180);
        
        // Draw robot rectangle (axle at origin, back is wheelOffset behind, front is (length - wheelOffset) ahead)
        const rectX = -(robotConfig.wheelOffset * this.scale);
        const rectY = -(robotConfig.width * this.scale) / 2;
        const rectW = robotConfig.length * this.scale;
        const rectH = robotConfig.width * this.scale;
        
        this.ctx.fillRect(rectX, rectY, rectW, rectH);
        this.ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        this.ctx.restore();
    }
    
    drawRobot(robotConfig, x, y, angleDeg, alpha = 1.0) {
        this.ctx.save();
        
        const screenX = x * this.scale;
        const screenY = y * this.scale;
        
        // Translate to robot position
        this.ctx.translate(screenX, screenY);
        
        // Rotate to robot angle
        this.ctx.rotate((angleDeg * Math.PI) / 180);
        
        // Draw robot rectangle or image (axle at origin)
        const rectX = -(robotConfig.wheelOffset * this.scale);
        const rectY = -(robotConfig.width * this.scale) / 2;
        const rectW = robotConfig.length * this.scale;
        const rectH = robotConfig.width * this.scale;
        
        if (robotConfig.imageUrl && this.robotImage && this.currentRobotUrl === robotConfig.imageUrl) {
            // Draw robot image
            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(this.robotImage, rectX, rectY, rectW, rectH);
            this.ctx.globalAlpha = 1.0;
        } else {
            // Draw robot as rectangle
            this.ctx.fillStyle = `rgba(33, 150, 243, ${alpha})`;
            this.ctx.fillRect(rectX, rectY, rectW, rectH);
            
            this.ctx.strokeStyle = `rgba(13, 71, 161, ${alpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(rectX, rectY, rectW, rectH);
            
            // Draw front indicator (small rectangle at front)
            this.ctx.fillStyle = `rgba(255, 152, 0, ${alpha})`;
            const frontX = rectX + rectW - 5;
            const frontY = rectY + rectH / 2 - 10;
            this.ctx.fillRect(frontX, frontY, 5, 20);
        }
        
        // Draw direction arrow pointing from front of robot
        this.drawDirectionArrow(rectX, rectW, alpha);
        
        // Load robot image if URL provided
        if (robotConfig.imageUrl && robotConfig.imageUrl !== this.currentRobotUrl) {
            this.loadRobotImage(robotConfig.imageUrl);
        }
        
        this.ctx.restore();
    }
    
    drawDirectionArrow(rectX, rectW, alpha) {
        // Draw arrow extending from front of robot
        const arrowStartX = rectX + rectW;
        const arrowLength = 25; // Length of arrow in pixels
        const arrowWidth = 8; // Width of arrowhead
        
        this.ctx.strokeStyle = `rgba(255, 193, 7, ${alpha * 0.7})`; // Amber color
        this.ctx.fillStyle = `rgba(255, 193, 7, ${alpha * 0.7})`;
        this.ctx.lineWidth = 2;
        
        // Draw arrow line
        this.ctx.beginPath();
        this.ctx.moveTo(arrowStartX, 0);
        this.ctx.lineTo(arrowStartX + arrowLength, 0);
        this.ctx.stroke();
        
        // Draw arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(arrowStartX + arrowLength, 0);
        this.ctx.lineTo(arrowStartX + arrowLength - arrowWidth, -arrowWidth / 2);
        this.ctx.lineTo(arrowStartX + arrowLength - arrowWidth, arrowWidth / 2);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    loadRobotImage(url) {
        this.currentRobotUrl = url;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            this.robotImage = img;
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load robot image:', url);
            this.robotImage = null;
        };
        
        img.src = url;
    }
}
