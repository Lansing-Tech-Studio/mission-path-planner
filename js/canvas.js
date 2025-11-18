// Canvas Rendering System
class CanvasRenderer {
    constructor() {
        this.canvas = document.getElementById('missionCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Table is 8 foot x 4 foot (96" x 48" or 243.84cm x 121.92cm)
        this.tableWidth = 243.84; // cm (96 inches / 8 feet)
        this.tableHeight = 121.92; // cm (48 inches / 4 feet)
        
        // Mat coordinate space is fixed at standard FLL mat dimensions (240cm x 120cm)
        // This is what user coordinates are relative to
        this.matCoordWidth = 240; // cm
        this.matCoordHeight = 120; // cm
        
        // Mat visual dimensions (will be adjusted based on image aspect ratio)
        this.matVisualWidth = this.tableWidth; // Will be adjusted when image loads
        this.matVisualHeight = this.tableHeight; // Always 4 feet
        
        // Mat offset from table origin (top-left)
        this.matOffsetX = 0;
        this.matOffsetY = 0;
        
        // Scale factor (pixels per cm) - will be calculated dynamically
        this.scale = 3;
        
        this.matImage = null;
        this.robotImage = null;
        this.matAlignment = 'centered';
        
        // Dragging state
        this.isDragging = false;
        this.isRotating = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.rotationHandleRadius = 8; // pixels
        
        this.initCanvas();
        this.setupDragging();
        this.setupResize();
    }
    
    initCanvas() {
        this.updateCanvasSize();
    }
    
    setupResize() {
        // Update canvas size when window resizes
        window.addEventListener('resize', () => this.updateCanvasSize());
    }
    
    updateCanvasSize() {
        // Get available space in the right panel
        const rightPanel = this.canvas.parentElement;
        const availableWidth = rightPanel.clientWidth - 40; // Subtract padding
        const availableHeight = rightPanel.clientHeight - 40; // Subtract padding
        
        // Calculate aspect ratio of table
        const tableAspect = this.tableWidth / this.tableHeight;
        
        // Calculate scale to fit available space while maintaining aspect ratio
        let scale;
        if (availableWidth / availableHeight > tableAspect) {
            // Height is the limiting factor
            scale = availableHeight / this.tableHeight;
        } else {
            // Width is the limiting factor
            scale = availableWidth / this.tableWidth;
        }
        
        // Update scale and canvas dimensions
        this.scale = scale;
        this.canvas.width = this.tableWidth * this.scale;
        this.canvas.height = this.tableHeight * this.scale;
        
        // Trigger re-render if mission planner exists
        if (window.missionPlanner) {
            window.missionPlanner.update();
        }
    }
    
    setupDragging() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    }
    
    // Convert canvas pixels back to mat coordinates
    canvasToCoordX(canvasX) {
        const coordToVisualX = this.matVisualWidth / this.matCoordWidth;
        return (canvasX / this.scale - this.matOffsetX) / coordToVisualX;
    }
    
    canvasToCoordY(canvasY) {
        const coordToVisualY = this.matVisualHeight / this.matCoordHeight;
        // Flip Y-axis: canvas Y increases downward, but coord Y increases upward from bottom
        return this.matCoordHeight - ((canvasY / this.scale - this.matOffsetY) / coordToVisualY);
    }
    
    isPointInRobot(x, y, robotConfig) {
        const dx = x - robotConfig.startX;
        const dy = y - robotConfig.startY;
        
        // Rotate point to robot's local coordinate system
        // Use negative angle for inverse rotation (world to local)
        // Add 90° so that 0° points up instead of right
        const angleRad = -((robotConfig.startAngle + 90) * Math.PI) / 180;
        const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
        
        // Check if within robot rectangle (axle at origin)
        const halfWidth = robotConfig.width / 2;
        const frontEdge = robotConfig.length - robotConfig.wheelOffset;
        const backEdge = -robotConfig.wheelOffset;
        
        return localX >= backEdge && localX <= frontEdge && 
               localY >= -halfWidth && localY <= halfWidth;
    }
    
    getRotationHandlePosition(robotConfig) {
        // Calculate rotation handle position in mat coordinates
        // Add 90° so that 0° points up instead of right
        const angleRad = ((robotConfig.startAngle + 90) * Math.PI) / 180;
        
        // In drawing: handle is at (rectX + rectW + handleDistance) where:
        // - rectX + rectW = (length - wheelOffset) * scaleX pixels from robot center
        // - handleDistance = 45 * (scaleX / this.scale) pixels
        // Total pixels from center: (length - wheelOffset) * scaleX + 45 * (scaleX / this.scale)
        // Convert to cm by dividing by scaleX:
        // = (length - wheelOffset) + 45 * (scaleX / this.scale) / scaleX
        // = (length - wheelOffset) + 45 / this.scale
        const scaleX = this.getCoordScaleX();
        const frontOfRobotCm = robotConfig.length - robotConfig.wheelOffset;
        const handleOffsetCm = 45 / this.scale;
        const totalDistanceCm = frontOfRobotCm + handleOffsetCm;
        
        const handleX = robotConfig.startX + totalDistanceCm * Math.cos(angleRad);
        // Y-axis increases upward, so use standard mathematical convention
        const handleY = robotConfig.startY + totalDistanceCm * Math.sin(angleRad);
        
        return { x: handleX, y: handleY };
    }
    
    isPointInRotationHandle(x, y, robotConfig) {
        const handle = this.getRotationHandlePosition(robotConfig);
        const dx = x - handle.x;
        const dy = y - handle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Click radius in cm - made larger for easier clicking
        const handleRadiusCm = 6.0; // 3cm click radius
        return distance <= handleRadiusCm;
    }
    
    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Account for CSS scaling of canvas
        const cssScaleX = this.canvas.width / rect.width;
        const cssScaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * cssScaleX;
        const canvasY = (e.clientY - rect.top) * cssScaleY;
        
        const matX = this.canvasToCoordX(canvasX);
        const matY = this.canvasToCoordY(canvasY);
        
        if (!this.robotConfig) return;
        
        // Check if clicking on rotation handle first (higher priority)
        const onRotationHandle = this.isPointInRotationHandle(matX, matY, this.robotConfig);
        const onRobotBody = this.isPointInRobot(matX, matY, this.robotConfig);
        
        if (onRotationHandle) {
            this.isRotating = true;
            this.canvas.style.cursor = 'grabbing';
        }
        // Check if clicking on the starting robot
        else if (onRobotBody) {
            this.isDragging = true;
            // Store the offset from robot center (axle position) to click point
            this.dragOffsetX = matX - this.robotConfig.startX;
            this.dragOffsetY = matY - this.robotConfig.startY;
            this.canvas.style.cursor = 'grabbing';
        }
    }
    
    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Account for CSS scaling of canvas
        const cssScaleX = this.canvas.width / rect.width;
        const cssScaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * cssScaleX;
        const canvasY = (e.clientY - rect.top) * cssScaleY;
        
        const matX = this.canvasToCoordX(canvasX);
        const matY = this.canvasToCoordY(canvasY);
        
        if (this.isRotating && this.robotConfig) {
            // Calculate angle from robot center to mouse
            const dx = matX - this.robotConfig.startX;
            const dy = matY - this.robotConfig.startY;
            // Y-axis increases upward, use standard mathematical convention
            // Subtract 90° so that 0° points up instead of right
            const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
            
            // Snap to 15 degree increments
            const snappedAngle = Math.round(angle / 15) * 15;
            
            // Update form input
            document.getElementById('startAngle').value = snappedAngle;
            
            // Trigger update
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        } else if (this.isDragging && this.robotConfig) {
            // Calculate new robot position maintaining the offset from where user clicked
            const newX = matX - this.dragOffsetX;
            const newY = matY - this.dragOffsetY;
            
            // Clamp to mat bounds
            const clampedX = Math.max(0, Math.min(this.matCoordWidth, newX));
            const clampedY = Math.max(0, Math.min(this.matCoordHeight, newY));
            
            // Update form inputs
            document.getElementById('startX').value = clampedX.toFixed(1);
            document.getElementById('startY').value = clampedY.toFixed(1);
            
            // Trigger update
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        } else if (this.robotConfig) {
            // Update cursor based on hover state
            if (this.isPointInRotationHandle(matX, matY, this.robotConfig)) {
                this.canvas.style.cursor = 'grab';
            } else if (this.isPointInRobot(matX, matY, this.robotConfig)) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    onMouseUp() {
        this.isDragging = false;
        this.isRotating = false;
        this.canvas.style.cursor = 'default';
    }
    
    updateMatAlignment(alignment) {
        this.matAlignment = alignment || 'centered';
        
        // Mat height is always full table height (4 feet)
        // Mat width depends on loaded image aspect ratio
        // Calculate mat offset based on alignment
        if (alignment === 'right') {
            // Right-aligned (for single home configuration)
            this.matOffsetX = this.tableWidth - this.matVisualWidth;
            this.matOffsetY = 0;
        } else {
            // Centered (default for dual home)
            this.matOffsetX = (this.tableWidth - this.matVisualWidth) / 2;
            this.matOffsetY = 0;
        }
    }
    
    // Convert from mat coordinate space (240cm x 120cm) to canvas pixels
    coordToCanvasX(x) {
        const coordToVisualX = this.matVisualWidth / this.matCoordWidth;
        return (this.matOffsetX + x * coordToVisualX) * this.scale;
    }
    
    coordToCanvasY(y) {
        const coordToVisualY = this.matVisualHeight / this.matCoordHeight;
        // Flip Y-axis: coord Y=0 is at bottom, canvas Y=0 is at top
        return (this.matOffsetY + (this.matCoordHeight - y) * coordToVisualY) * this.scale;
    }
    
    // Get scale factor for converting coordinate space dimensions to canvas pixels
    getCoordScaleX() {
        return (this.matVisualWidth / this.matCoordWidth) * this.scale;
    }
    
    getCoordScaleY() {
        return (this.matVisualHeight / this.matCoordHeight) * this.scale;
    }
    
    render(matUrl, robotConfig, path) {
        // Store robot config for drag detection
        this.robotConfig = robotConfig;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw mat background
        this.drawMat(matUrl);
        
        // Draw path if valid (body outlines and center line only)
        if (path && path.points && path.points.length > 0) {
            this.drawPathBodyAndLine(path, robotConfig);
        }
        
        // Draw text block positions (ghost robots)
        this.drawTextBlockPositions(robotConfig);
        
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
        const matCanvasW = this.matVisualWidth * this.scale;
        const matCanvasH = this.matVisualHeight * this.scale;
        
        // Draw mat area background (white)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(matCanvasX, matCanvasY, matCanvasW, matCanvasH);
        
        // Draw grid on mat area for reference (based on coordinate space)
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        
        // Scale factor from coordinate space to visual space
        const coordToVisualX = this.matVisualWidth / this.matCoordWidth;
        const coordToVisualY = this.matVisualHeight / this.matCoordHeight;
        
        // Draw 10cm grid lines on mat (in coordinate space)
        for (let x = 0; x <= this.matCoordWidth; x += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(matCanvasX + x * coordToVisualX * this.scale, matCanvasY);
            this.ctx.lineTo(matCanvasX + x * coordToVisualX * this.scale, matCanvasY + matCanvasH);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.matCoordHeight; y += 10) {
            this.ctx.beginPath();
            this.ctx.moveTo(matCanvasX, matCanvasY + y * coordToVisualY * this.scale);
            this.ctx.lineTo(matCanvasX + matCanvasW, matCanvasY + y * coordToVisualY * this.scale);
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
            
            // Update mat visual width based on actual image dimensions
            this.matVisualWidth = this.tableHeight * imgAspect;
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
            
            // Calculate mat visual width based on image aspect ratio
            const imgAspect = img.width / img.height;
            this.matVisualWidth = this.tableHeight * imgAspect;
            this.updateMatAlignment(this.matAlignment);
            
            // Redraw with image
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        };
        
        img.onerror = () => {
            console.error('Failed to load mat image:', url);
            this.matImage = null;
            // Reset to default mat visual width
            this.matVisualWidth = this.tableWidth;
            this.updateMatAlignment(this.matAlignment);
        };
        
        img.src = url;
    }
    
    drawTextBlockPositions(robotConfig) {
        // Draw ghost robots at text block positions where showPosition is enabled
        if (!window.missionPlanner || !window.missionPlanner.blocks) {
            return;
        }
        
        const blocks = window.missionPlanner.blocks.blocks;
        let blockNumber = 1;
        
        blocks.forEach((block, index) => {
            if (block.type === 'text' && block.showPosition) {
                const position = window.missionPlanner.blocks.calculatePositionAtBlock(index);
                if (position) {
                    this.drawGhostRobot(robotConfig, position.x, position.y, position.angle, blockNumber);
                    blockNumber++;
                }
            }
        });
    }
    
    drawGhostRobot(robotConfig, x, y, angleDeg, labelNumber) {
        this.ctx.save();
        
        const screenX = this.coordToCanvasX(x);
        const screenY = this.coordToCanvasY(y);
        
        // Translate to robot position
        this.ctx.translate(screenX, screenY);
        
        // Rotate to robot angle (negate because Y-axis is flipped)
        // Add 90° so that 0° points up instead of right
        this.ctx.rotate((-(angleDeg + 90) * Math.PI) / 180);
        
        // Draw semi-transparent robot rectangle or image
        const scaleX = this.getCoordScaleX();
        const scaleY = this.getCoordScaleY();
        const rectX = -(robotConfig.wheelOffset * scaleX);
        const rectY = -(robotConfig.width * scaleY) / 2;
        const rectW = robotConfig.length * scaleX;
        const rectH = robotConfig.width * scaleY;
        
        if (robotConfig.imageUrl && this.robotImage && this.currentRobotUrl === robotConfig.imageUrl) {
            // Draw robot image with transparency
            this.ctx.globalAlpha = 0.4;
            this.ctx.save();
            this.ctx.translate(rectX + rectW / 2, rectY + rectH / 2);
            this.ctx.rotate((90 * Math.PI) / 180);
            this.ctx.drawImage(this.robotImage, -rectH / 2, -rectW / 2, rectH, rectW);
            this.ctx.restore();
            this.ctx.globalAlpha = 1.0;
            
            // Draw dashed border around image
            this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(rectX, rectY, rectW, rectH);
            this.ctx.setLineDash([]);
        } else {
            // Ghost robot styling (rectangle fallback)
            this.ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
            this.ctx.fillRect(rectX, rectY, rectW, rectH);
            
            this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(rectX, rectY, rectW, rectH);
            this.ctx.setLineDash([]);
            
            // Draw front indicator
            this.ctx.fillStyle = 'rgba(255, 152, 0, 0.4)';
            const frontX = rectX + rectW - 5;
            const frontY = rectY + rectH / 2 - 10;
            this.ctx.fillRect(frontX, frontY, 5, 20);
        }
        
        this.ctx.restore();
        
        // Draw label number above the ghost robot
        this.ctx.save();
        this.ctx.fillStyle = '#666';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        
        const labelY = screenY - (robotConfig.width / 2) * scaleY - 8;
        this.ctx.strokeText(`T${labelNumber}`, screenX, labelY);
        this.ctx.fillText(`T${labelNumber}`, screenX, labelY);
        this.ctx.restore();
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
            const screenX = this.coordToCanvasX(point.x);
            const screenY = this.coordToCanvasY(point.y);
            
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
                
        // Draw left wheel path (blue)
        if (path.points[0].leftWheelX !== undefined) {
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
                    const screenX = this.coordToCanvasX(point.leftWheelX);
                    const screenY = this.coordToCanvasY(point.leftWheelY);
                    
                    if (i === 0) {
                        this.ctx.moveTo(screenX, screenY);
                    } else {
                        this.ctx.lineTo(screenX, screenY);
                    }
                }
            }
            
            this.ctx.stroke();
            this.ctx.restore();
        } else {
            console.log('No left wheel coordinates in path points');
        }
        
        // Draw right wheel path (orange)
        if (path.points[0].rightWheelX !== undefined) {
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
                    const screenX = this.coordToCanvasX(point.rightWheelX);
                    const screenY = this.coordToCanvasY(point.rightWheelY);
                    
                    if (i === 0) {
                        this.ctx.moveTo(screenX, screenY);
                    } else {
                        this.ctx.lineTo(screenX, screenY);
                    }
                }
            }
            
            this.ctx.stroke();
            this.ctx.restore();
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
            this.ctx.arc(this.coordToCanvasX(point.x), this.coordToCanvasY(point.y), 2, 0, Math.PI * 2);
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
                this.ctx.arc(this.coordToCanvasX(point.x), this.coordToCanvasY(point.y), 4, 0, Math.PI * 2);
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
            this.ctx.arc(this.coordToCanvasX(start.x), this.coordToCanvasY(start.y), 5, 0, Math.PI * 2);
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
            this.ctx.arc(this.coordToCanvasX(end.x), this.coordToCanvasY(end.y), 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }
    
    drawRobotOutline(robotConfig, x, y, angleDeg) {
        this.ctx.save();
        
        const screenX = this.coordToCanvasX(x);
        const screenY = this.coordToCanvasY(y);
        
        // Translate to robot position
        this.ctx.translate(screenX, screenY);
        
        // Rotate to robot angle (negate because Y-axis is flipped)
        // Add 90° so that 0° points up instead of right
        this.ctx.rotate((-(angleDeg + 90) * Math.PI) / 180);
        
        // Draw robot rectangle (axle at origin, back is wheelOffset behind, front is (length - wheelOffset) ahead)
        const scaleX = this.getCoordScaleX();
        const scaleY = this.getCoordScaleY();
        const rectX = -(robotConfig.wheelOffset * scaleX);
        const rectY = -(robotConfig.width * scaleY) / 2;
        const rectW = robotConfig.length * scaleX;
        const rectH = robotConfig.width * scaleY;
        
        this.ctx.fillRect(rectX, rectY, rectW, rectH);
        this.ctx.strokeRect(rectX, rectY, rectW, rectH);
        
        this.ctx.restore();
    }
    
    drawRobot(robotConfig, x, y, angleDeg, alpha = 1.0) {
        this.ctx.save();
        
        const screenX = this.coordToCanvasX(x);
        const screenY = this.coordToCanvasY(y);
        
        // Translate to robot position
        this.ctx.translate(screenX, screenY);
        
        // Rotate to robot angle (negate because Y-axis is flipped)
        // Add 90° so that 0° points up instead of right
        this.ctx.rotate((-(angleDeg + 90) * Math.PI) / 180);
        
        // Draw robot rectangle or image (axle at origin)
        const scaleX = this.getCoordScaleX();
        const scaleY = this.getCoordScaleY();
        const rectX = -(robotConfig.wheelOffset * scaleX);
        const rectY = -(robotConfig.width * scaleY) / 2;
        const rectW = robotConfig.length * scaleX;
        const rectH = robotConfig.width * scaleY;
        
        if (robotConfig.imageUrl && this.robotImage && this.currentRobotUrl === robotConfig.imageUrl) {
            // Draw robot image
            this.ctx.globalAlpha = alpha;
            // Rotate image to match our coordinate system where the image assumes front points right
            // but we want 0° to point up, so rotate the image drawing 90° relative to robot frame
            this.ctx.save();
            this.ctx.translate(rectX + rectW / 2, rectY + rectH / 2);
            this.ctx.rotate((90 * Math.PI) / 180);
            this.ctx.drawImage(this.robotImage, -rectH / 2, -rectW / 2, rectH, rectW);
            this.ctx.restore();
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
        
        // Draw rotation handle for starting robot (full opacity)
        if (alpha === 1.0) {
            this.drawRotationHandle(rectX, rectW);
        }
        
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
    
    drawRotationHandle(rectX, rectW) {
        // Draw rotation handle beyond the arrow (in coordinate space: 15cm beyond robot)
        const scaleX = this.getCoordScaleX();
        const handleDistance = 45 * (scaleX / this.scale); // Scale the distance proportionally
        const handleX = rectX + rectW + handleDistance;
        const arrowEnd = rectX + rectW + 25 * (scaleX / this.scale);
        
        // Draw connecting line
        this.ctx.strokeStyle = '#FF5722'; // Deep orange
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(arrowEnd, 0);
        this.ctx.lineTo(handleX, 0);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw circular handle (scale with canvas)
        const handleRadius = 8 * Math.max(0.5, Math.min(1.5, this.scale / 3)); // Scale between 50% and 150%
        this.ctx.fillStyle = '#FF5722';
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(handleX, 0, handleRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw rotation arrows inside circle (scale with handle)
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        const innerRadius = handleRadius * 0.5;
        this.ctx.arc(handleX, 0, innerRadius, -0.3, Math.PI * 1.3);
        this.ctx.stroke();
        // Small arrowhead (scaled)
        const arrowSize = handleRadius * 0.4;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.moveTo(handleX - innerRadius - arrowSize * 0.3, -arrowSize * 0.5);
        this.ctx.lineTo(handleX - innerRadius - arrowSize * 0.3, arrowSize * 0.5);
        this.ctx.lineTo(handleX - innerRadius + arrowSize * 0.3, 0);
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

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.CanvasRenderer = CanvasRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasRenderer;
}
