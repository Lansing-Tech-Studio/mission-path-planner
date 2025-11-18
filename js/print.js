// Print Management
class PrintManager {
    constructor() {
        this.printTemplate = document.getElementById('printTemplate');
        this.printCanvas = document.getElementById('printCanvas');
        this.printCtx = this.printCanvas.getContext('2d');
    }
    
    printPlan(data, sourceCanvas) {
        // Populate print template with data
        this.populatePrintTemplate(data, sourceCanvas);
        
        // Trigger print dialog
        window.print();
    }
    
    populatePrintTemplate(data, sourceCanvas) {
        // Team name
        const teamNameEl = document.getElementById('printTeamName');
        teamNameEl.textContent = data.teamInfo?.name || 'Mission Plan';
        
        // Team logo
        const teamLogoEl = document.getElementById('printTeamLogo');
        if (data.teamInfo?.logo && data.teamInfo.logo.trim() !== '') {
            teamLogoEl.src = data.teamInfo.logo;
            teamLogoEl.style.display = 'block';
        } else {
            teamLogoEl.style.display = 'none';
        }
        
        // Plan date
        const planDateEl = document.getElementById('printPlanDate');
        const dateStr = data.planDate || new Date().toISOString().split('T')[0];
        const formattedDate = new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        planDateEl.textContent = `Plan from ${formattedDate}`;
        
        // Description
        const descriptionEl = document.querySelector('.print-description');
        if (data.teamInfo?.description && data.teamInfo.description.trim() !== '') {
            descriptionEl.innerHTML = `<strong>Description:</strong> ${this.escapeHtml(data.teamInfo.description)}`;
            descriptionEl.style.display = 'block';
        } else {
            descriptionEl.style.display = 'none';
        }
        
        // Copy canvas
        this.copyCanvas(sourceCanvas);
        
        // Program blocks
        this.populateProgramBlocks(data.program);
        
        // Robot configuration (conditionally show based on checkbox)
        const printConfigSection = document.querySelector('.print-config');
        const includeRobotConfig = document.getElementById('printRobotConfig').checked;
        
        if (includeRobotConfig) {
            this.populateRobotConfig(data.robot);
            printConfigSection.style.display = 'block';
        } else {
            printConfigSection.style.display = 'none';
        }
    }
    
    copyCanvas(sourceCanvas) {
        // Set print canvas size to match source
        this.printCanvas.width = sourceCanvas.width;
        this.printCanvas.height = sourceCanvas.height;
        
        // Copy the canvas content
        this.printCtx.drawImage(sourceCanvas, 0, 0);
    }
    
    populateProgramBlocks(program) {
        const container = document.getElementById('printProgramBlocks');
        container.innerHTML = '';
        
        if (!program || program.length === 0) {
            container.innerHTML = '<p style="color: #999;">No program blocks defined.</p>';
            return;
        }
        
        // Get robot config for calculations
        const robotConfig = window.missionPlanner ? window.missionPlanner.robot.getConfig() : null;
        let currentX = robotConfig ? robotConfig.startX : 0;
        let currentY = robotConfig ? robotConfig.startY : 0;
        let currentAngle = robotConfig ? robotConfig.startAngle : 0;
        
        // Create ordered list
        const ol = document.createElement('ol');
        ol.style.paddingLeft = '20px';
        
        program.forEach((block, index) => {
            const li = document.createElement('li');
            li.style.marginBottom = '12px';
            
            if (block.type === 'text') {
                li.innerHTML = `<strong>Text:</strong> ${this.escapeHtml(block.content || '(empty)')}`;
                
                // Add position info if enabled
                if (block.showPosition && robotConfig) {
                    const posDiv = document.createElement('div');
                    posDiv.style.marginTop = '4px';
                    posDiv.style.paddingLeft = '10px';
                    posDiv.style.fontSize = '12px';
                    posDiv.style.color = '#4CAF50';
                    posDiv.style.borderLeft = '2px solid #4CAF50';
                    
                    const xInches = (currentX / 2.54).toFixed(1);
                    const yInches = (currentY / 2.54).toFixed(1);
                    posDiv.innerHTML = `<em>Position: X: ${currentX.toFixed(1)}cm (${xInches}in), Y: ${currentY.toFixed(1)}cm (${yInches}in), Angle: ${currentAngle.toFixed(0)}\u00b0</em>`;
                    li.appendChild(posDiv);
                }
            } else if (block.type === 'move') {
                const directionText = block.direction === 0 
                    ? 'straight' 
                    : block.direction < 0 
                        ? `left (${block.direction})` 
                        : `right (+${block.direction})`;
                
                // Calculate rotations and distance
                const rotations = (block.degrees / 360).toFixed(2);
                let distanceText = '';
                
                if (robotConfig && block.direction === 0) {
                    // Straight movement - calculate distance
                    const distanceCm = (block.degrees / 360) * robotConfig.wheelCircumference;
                    const distanceInches = (distanceCm / 2.54).toFixed(1);
                    distanceText = `, Distance: ${distanceCm.toFixed(1)}cm (${distanceInches}in)`;
                }
                
                li.innerHTML = `<strong>Move:</strong> Direction: ${directionText}, Degrees: ${block.degrees} (${rotations} rotations)${distanceText}`;
                
                if (!block.valid) {
                    li.style.color = '#f44336';
                    li.innerHTML += ' <em>(Invalid)</em>';
                }
                
                // Update position for next blocks (if valid)
                if (block.valid !== false && robotConfig && window.missionPlanner && window.missionPlanner.pathCalculator) {
                    const points = window.missionPlanner.pathCalculator.calculateMoveBlock(
                        currentX, currentY, currentAngle,
                        block.direction,
                        block.degrees,
                        robotConfig
                    );
                    
                    if (points.length > 0) {
                        const lastPoint = points[points.length - 1];
                        currentX = lastPoint.x;
                        currentY = lastPoint.y;
                        currentAngle = lastPoint.angle;
                    }
                }
            }
            
            ol.appendChild(li);
        });
        
        container.appendChild(ol);
    }
    
    populateRobotConfig(robot) {
        const container = document.getElementById('printRobotConfig');
        container.innerHTML = '';
        
        if (!robot) {
            container.innerHTML = '<p style="color: #999;">No robot configuration defined.</p>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        
        const configs = [
            ['Length', `${robot.length} cm`],
            ['Width', `${robot.width} cm`],
            ['Wheel Offset from Back', `${robot.wheelOffset} cm`],
            ['Wheel Circumference', `${robot.wheelCircumference} cm`],
            ['Wheel Base', `${robot.wheelBase} cm`],
            ['Starting Position', `X: ${robot.startX} cm, Y: ${robot.startY} cm`],
            ['Starting Orientation', `${robot.startAngle}°`]
        ];
        
        if (robot.imageUrl && robot.imageUrl.trim() !== '') {
            configs.push(['Robot Image URL', robot.imageUrl]);
        }
        
        configs.forEach(([label, value]) => {
            const tr = document.createElement('tr');
            
            const tdLabel = document.createElement('td');
            tdLabel.textContent = label;
            tdLabel.style.padding = '8px';
            tdLabel.style.border = '1px solid #ddd';
            tdLabel.style.fontWeight = '600';
            tdLabel.style.backgroundColor = '#f5f5f5';
            
            const tdValue = document.createElement('td');
            tdValue.textContent = value;
            tdValue.style.padding = '8px';
            tdValue.style.border = '1px solid #ddd';
            
            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            table.appendChild(tr);
        });
        
        container.appendChild(table);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.PrintManager = PrintManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrintManager;
}
