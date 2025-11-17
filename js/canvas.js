// Canvas Rendering System
class CanvasRenderer {
    constructor() {
        this.canvas = document.getElementById('missionCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Table is 8 foot x 4 foot (96" x 48" or 243.84cm x 121.92cm)
        this.tableWidth = 243.84; // cm (96 inches / 8 feet)
        this.tableHeight = 121.92; // cm (48 inches / 4 feet)
        
        // Mat always fills the full height (4 feet)
        this.matWidth = this.tableWidth; // Will be adjusted based on image aspect ratio
        this.matHeight = this.tableHeight; // Always 4 feet
        
        // Mat offset from table origin (top-left)
        this.matOffsetX = 0;
        this.matOffsetY = 0;
        
        // Scale factor (pixels per cm)
        this.scale = 3;
        
        this.matImage = null;
        this.robotImage = null;
        this.matAlignment = 'centered';
        
        this.initCanvas();
    }
    
    initCanvas() {
        // Set canvas size based on table dimensions
        this.canvas.width = this.tableWidth * this.scale;
        this.canvas.height = this.tableHeight * this.scale;
    }
    
    updateMatAlignment(alignment) {
        this.matAlignment = alignment || 'centered';
        
        // Mat height is always full table height (4 feet)
        // Mat width depends on loaded image aspect ratio
        // Calculate mat offset based on alignment
        if (alignment === 'right') {
            // Right-aligned (for single home configuration)
            this.matOffsetX = this.tableWidth - this.matWidth;
            this.matOffsetY = 0;
        } else {
            // Centered (default for dual home)
            this.matOffsetX = (this.tableWidth - this.matWidth) / 2;
            this.matOffsetY = 0;
        }
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
        // Draw table background (black)
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw table border
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate mat position on canvas
        const matCanvasX = this.matOffsetX * this.scale;
        const matCanvasY = this.matOffsetY * this.scale;
        const matCanvasW = this.matWidth * this.scale;
        const matCanvasH = this.matHeight * this.scale;
        
        // Draw mat area background (white)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(matCanvasX, matCanvasY, matCanvasW, matCanvasH);
        
        // Draw grid on mat area for reference
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Draw 10cm grid lines on mat
        for (let x = 0; x <= this.matWidth; x += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(matCanvasX + x * this.scale, matCanvasY);
            this.ctx.lineTo(matCanvasX + x * this.scale, matCanvasY + matCanvasH);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.matHeight; y += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(matCanvasX, matCanvasY + y * this.scale);
            this.ctx.lineTo(matCanvasX + matCanvasW, matCanvasY + y * this.scale);
            this.ctx.stroke();
        }
        
        // If mat URL is provided, load and draw image
        if (matUrl && matUrl.trim() !== '') {
            this.loadMatImage(matUrl);
        }
        
        // Draw mat border (darker)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(matCanvasX, matCanvasY, matCanvasW, matCanvasH);
    }
    
    loadMatImage(url) {
        if (this.currentMatUrl === url && this.matImage) {
            // Image already loaded
            // Mat height represents 4 feet, so scale image to fill full height
            // and calculate width based on image aspect ratio
            const imgAspect = this.matImage.width / this.matImage.height;
            
            // Height fills entire table height (4 feet)
            const drawHeight = this.tableHeight * this.scale;
            const drawWidth = drawHeight * imgAspect;
            
            // Update mat width based on actual image dimensions
            this.matWidth = this.tableHeight * imgAspect;
            this.updateMatAlignment(this.matAlignment);
            
            const matCanvasX = this.matOffsetX * this.scale;
            const matCanvasY = 0; // Always at top
            
            this.ctx.drawImage(this.matImage, matCanvasX, matCanvasY, drawWidth, drawHeight);
            return;
        }
        
        this.currentMatUrl = url;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            this.matImage = img;
            
            // Calculate mat width based on image aspect ratio
            const imgAspect = img.width / img.height;
            this.matWidth = this.tableHeight * imgAspect;
            this.updateMatAlignment(this.matAlignment);
            
            // Redraw with image
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load mat image:', url);
            this.matImage = null;
            // Reset to default mat width
            this.matWidth = this.tableWidth;
            this.updateMatAlignment(this.matAlignment);
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
            const screenX = (this.matOffsetX + point.x) * this.scale;
            const screenY = (this.matOffsetY + point.y) * this.scale;
            
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
                    const screenX = (this.matOffsetX + point.leftWheelX) * this.scale;
                    const screenY = (this.matOffsetY + point.leftWheelY) * this.scale;
                    
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
                    const screenX = (this.matOffsetX + point.rightWheelX) * this.scale;
                    const screenY = (this.matOffsetY + point.rightWheelY) * this.scale;
                    
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
            this.ctx.arc((this.matOffsetX + point.x) * this.scale, (this.matOffsetY + point.y) * this.scale, 2, 0, Math.PI * 2);
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
                this.ctx.arc((this.matOffsetX + point.x) * this.scale, (this.matOffsetY + point.y) * this.scale, 4, 0, Math.PI * 2);
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
            this.ctx.arc((this.matOffsetX + start.x) * this.scale, (this.matOffsetY + start.y) * this.scale, 5, 0, Math.PI * 2);
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
            this.ctx.arc((this.matOffsetX + end.x) * this.scale, (this.matOffsetY + end.y) * this.scale, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawRobotOutline(robotConfig, x, y, angleDeg) {
        this.ctx.save();
        
        const screenX = (this.matOffsetX + x) * this.scale;
        const screenY = (this.matOffsetY + y) * this.scale;
        
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
        
        const screenX = (this.matOffsetX + x) * this.scale;
        const screenY = (this.matOffsetY + y) * this.scale;
        
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
