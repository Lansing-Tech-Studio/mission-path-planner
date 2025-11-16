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
        
        // Draw path if valid
        if (path && path.points && path.points.length > 0) {
            this.drawPath(path, robotConfig);
        }
        
        // Draw starting robot position
        this.drawRobot(robotConfig, robotConfig.startX, robotConfig.startY, robotConfig.startAngle);
        
        // Draw final robot position if path exists
        if (path && path.points && path.points.length > 0) {
            const lastPoint = path.points[path.points.length - 1];
            this.drawRobot(robotConfig, lastPoint.x, lastPoint.y, lastPoint.angle, 0.5);
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
    
    drawPath(path, robotConfig) {
        if (!path.points || path.points.length === 0) return;
        
        // Draw robot body outline along path
        this.ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
        this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
        this.ctx.lineWidth = 1;
        
        for (let i = 0; i < path.points.length; i++) {
            const point = path.points[i];
            this.drawRobotOutline(robotConfig, point.x, point.y, point.angle);
        }
        
        // Draw center path line
        this.ctx.strokeStyle = '#4CAF50';
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
        
        // Draw start point
        if (path.points.length > 0) {
            const start = path.points[0];
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.beginPath();
            this.ctx.arc(start.x * this.scale, start.y * this.scale, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw end point
        if (path.points.length > 1) {
            const end = path.points[path.points.length - 1];
            this.ctx.fillStyle = '#f44336';
            this.ctx.beginPath();
            this.ctx.arc(end.x * this.scale, end.y * this.scale, 4, 0, Math.PI * 2);
            this.ctx.fill();
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
        
        // Draw robot rectangle (centered on axle, which is wheelOffset from back)
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
        
        // Draw robot rectangle or image
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
        
        // Load robot image if URL provided
        if (robotConfig.imageUrl && robotConfig.imageUrl !== this.currentRobotUrl) {
            this.loadRobotImage(robotConfig.imageUrl);
        }
        
        this.ctx.restore();
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
