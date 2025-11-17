// Block-based Program Management
class BlockManager {
    constructor() {
        this.blocks = [];
        this.container = document.getElementById('programBlocks');
        this.nextId = 1;
    }
    
    addTextBlock() {
        const block = {
            id: this.nextId++,
            type: 'text',
            content: '',
            showPosition: false
        };
        
        this.blocks.push(block);
        this.renderBlocks();
        return block;
    }
    
    addMoveBlock() {
        const block = {
            id: this.nextId++,
            type: 'move',
            direction: 0,
            degrees: 360
        };
        
        this.blocks.push(block);
        this.renderBlocks();
        return block;
    }
    
    removeBlock(id) {
        this.blocks = this.blocks.filter(b => b.id !== id);
        this.renderBlocks();
        
        // Trigger update
        if (window.missionPlanner) {
            window.missionPlanner.update();
        }
    }
    
    moveBlockUp(id) {
        const index = this.blocks.findIndex(b => b.id === id);
        if (index > 0) {
            [this.blocks[index - 1], this.blocks[index]] = [this.blocks[index], this.blocks[index - 1]];
            this.renderBlocks();
            
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        }
    }
    
    moveBlockDown(id) {
        const index = this.blocks.findIndex(b => b.id === id);
        if (index < this.blocks.length - 1) {
            [this.blocks[index], this.blocks[index + 1]] = [this.blocks[index + 1], this.blocks[index]];
            this.renderBlocks();
            
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        }
    }
    
    updateBlock(id, field, value) {
        const block = this.blocks.find(b => b.id === id);
        if (block) {
            block[field] = value;
            
            // Validate move blocks and update styling without re-rendering
            if (block.type === 'move') {
                block.valid = this.validateMoveBlock(block);
                this.updateBlockValidation(id, block.valid);
            }
            
            // Trigger update
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        }
    }
    
    updateBlockValidation(id, isValid) {
        // Find the block element and update its validation class without re-rendering
        const blockElements = this.container.querySelectorAll('.program-block');
        blockElements.forEach(el => {
            const blockId = parseInt(el.dataset.blockId);
            if (blockId === id) {
                if (isValid === false) {
                    el.classList.add('invalid');
                } else {
                    el.classList.remove('invalid');
                }
            }
        });
    }
    
    validateMoveBlock(block) {
        const direction = parseFloat(block.direction);
        const degrees = parseFloat(block.degrees);
        
        if (isNaN(direction) || isNaN(degrees)) {
            return false;
        }
        
        if (direction < -100 || direction > 100) {
            return false;
        }
        
        if (degrees === 0) {
            return false;
        }
        
        return true;
    }
    
    calculatePositionAtBlock(blockIndex) {
        // Calculate robot position after executing all move blocks up to this point
        if (!window.missionPlanner || !window.missionPlanner.pathCalculator || !window.missionPlanner.robot) {
            return null;
        }
        
        const robotConfig = window.missionPlanner.robot.getConfig();
        let x = robotConfig.startX;
        let y = robotConfig.startY;
        let angle = robotConfig.startAngle;
        
        // Process all blocks up to (but not including) the current block
        for (let i = 0; i < blockIndex && i < this.blocks.length; i++) {
            const block = this.blocks[i];
            
            if (block.type === 'move' && block.valid !== false) {
                const moveBlock = {
                    type: 'move',
                    direction: parseFloat(block.direction) || 0,
                    degrees: parseFloat(block.degrees) || 0,
                    valid: this.validateMoveBlock(block)
                };
                
                if (moveBlock.valid) {
                    const points = window.missionPlanner.pathCalculator.calculateMoveBlock(
                        x, y, angle,
                        moveBlock.direction,
                        moveBlock.degrees,
                        robotConfig
                    );
                    
                    if (points.length > 0) {
                        const lastPoint = points[points.length - 1];
                        x = lastPoint.x;
                        y = lastPoint.y;
                        angle = lastPoint.angle;
                    }
                }
            }
        }
        
        return { x, y, angle };
    }
    
    renderBlocks() {
        this.container.innerHTML = '';
        
        if (this.blocks.length === 0) {
            this.container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No blocks added yet. Click "Add Text Block" or "Add Move Block" to get started.</p>';
            return;
        }
        
        this.blocks.forEach((block, index) => {
            const blockElement = this.createBlockElement(block, index);
            this.container.appendChild(blockElement);
        });
    }
    
    createBlockElement(block, index) {
        const div = document.createElement('div');
        div.className = `program-block ${block.type}-block`;
        div.dataset.blockId = block.id;
        
        if (block.type === 'move' && block.valid === false) {
            div.classList.add('invalid');
        }
        
        // Block header with type and controls
        const header = document.createElement('div');
        header.className = 'block-header';
        
        const typeLabel = document.createElement('span');
        typeLabel.className = 'block-type';
        typeLabel.textContent = block.type === 'text' ? 'Text/Comment' : 'Move';
        header.appendChild(typeLabel);
        
        const controls = document.createElement('div');
        controls.style.display = 'flex';
        controls.style.gap = '4px';
        
        // Up button
        if (index > 0) {
            const upBtn = document.createElement('button');
            upBtn.textContent = '▲';
            upBtn.className = 'btn btn-secondary';
            upBtn.style.padding = '2px 8px';
            upBtn.style.fontSize = '10px';
            upBtn.onclick = () => this.moveBlockUp(block.id);
            controls.appendChild(upBtn);
        }
        
        // Down button
        if (index < this.blocks.length - 1) {
            const downBtn = document.createElement('button');
            downBtn.textContent = '▼';
            downBtn.className = 'btn btn-secondary';
            downBtn.style.padding = '2px 8px';
            downBtn.style.fontSize = '10px';
            downBtn.onclick = () => this.moveBlockDown(block.id);
            controls.appendChild(downBtn);
        }
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.onclick = () => this.removeBlock(block.id);
        controls.appendChild(deleteBtn);
        
        header.appendChild(controls);
        div.appendChild(header);
        
        // Block content
        const content = document.createElement('div');
        content.className = 'block-content';
        
        if (block.type === 'text') {
            const textarea = document.createElement('textarea');
            textarea.placeholder = 'Enter comment or pseudocode...';
            textarea.value = block.content || '';
            textarea.rows = 2;
            textarea.oninput = (e) => this.updateBlock(block.id, 'content', e.target.value);
            content.appendChild(textarea);
            
            // Add show position checkbox
            const positionToggle = document.createElement('label');
            positionToggle.className = 'block-position-toggle';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = block.showPosition || false;
            checkbox.onchange = (e) => {
                this.updateBlock(block.id, 'showPosition', e.target.checked);
                this.renderBlocks();
            };
            positionToggle.appendChild(checkbox);
            const checkboxLabel = document.createElement('span');
            checkboxLabel.textContent = 'Show Robot Position';
            positionToggle.appendChild(checkboxLabel);
            content.appendChild(positionToggle);
            
            // Display position info if enabled
            if (block.showPosition) {
                const position = this.calculatePositionAtBlock(index);
                if (position) {
                    const positionInfo = document.createElement('div');
                    positionInfo.className = 'block-position-info';
                    const xInches = (position.x / 2.54).toFixed(1);
                    const yInches = (position.y / 2.54).toFixed(1);
                    positionInfo.innerHTML = `Position: X: ${position.x.toFixed(1)}cm (${xInches}in), Y: ${position.y.toFixed(1)}cm (${yInches}in), Angle: ${position.angle.toFixed(0)}°`;
                    content.appendChild(positionInfo);
                }
            }
        } else if (block.type === 'move') {
            const moveInputs = document.createElement('div');
            moveInputs.className = 'block-move-inputs';
            
            // Direction input
            const directionGroup = document.createElement('div');
            const directionLabel = document.createElement('label');
            directionLabel.textContent = 'Direction (-100 to 100):';
            const directionInput = document.createElement('input');
            directionInput.type = 'number';
            directionInput.value = block.direction || 0;
            directionInput.min = -100;
            directionInput.max = 100;
            directionInput.step = 1;
            directionInput.oninput = (e) => this.updateBlock(block.id, 'direction', e.target.value);
            directionGroup.appendChild(directionLabel);
            directionGroup.appendChild(directionInput);
            
            // Degrees input
            const degreesGroup = document.createElement('div');
            const degreesLabel = document.createElement('label');
            degreesLabel.textContent = 'Degrees:';
            const degreesInput = document.createElement('input');
            degreesInput.type = 'number';
            degreesInput.value = block.degrees || 360;
            degreesInput.step = 1;
            degreesInput.oninput = (e) => this.updateBlock(block.id, 'degrees', e.target.value);
            degreesGroup.appendChild(degreesLabel);
            degreesGroup.appendChild(degreesInput);
            
            moveInputs.appendChild(directionGroup);
            moveInputs.appendChild(degreesGroup);
            content.appendChild(moveInputs);
            
            // Show helper text
            const helper = document.createElement('small');
            helper.style.color = '#666';
            helper.style.fontSize = '10px';
            helper.style.marginTop = '4px';
            helper.textContent = '0 = straight, negative = left, positive = right. Negative degrees = backup';
            content.appendChild(helper);
        }
        
        div.appendChild(content);
        
        return div;
    }
    
    getProgram() {
        // Return validated program blocks
        return this.blocks.map(block => {
            if (block.type === 'text') {
                return {
                    type: 'text',
                    content: block.content || '',
                    showPosition: block.showPosition || false
                };
            } else if (block.type === 'move') {
                const direction = parseFloat(block.direction);
                const degrees = parseFloat(block.degrees);
                
                return {
                    type: 'move',
                    direction: isNaN(direction) ? 0 : direction,
                    degrees: isNaN(degrees) ? 0 : degrees,
                    valid: this.validateMoveBlock(block)
                };
            }
            return null;
        }).filter(b => b !== null);
    }
    
    loadProgram(program) {
        this.blocks = [];
        this.nextId = 1;
        
        if (!program || !Array.isArray(program)) {
            this.renderBlocks();
            return;
        }
        
        program.forEach(block => {
            if (block.type === 'text') {
                const newBlock = {
                    id: this.nextId++,
                    type: 'text',
                    content: block.content || '',
                    showPosition: block.showPosition || false
                };
                this.blocks.push(newBlock);
            } else if (block.type === 'move') {
                const newBlock = {
                    id: this.nextId++,
                    type: 'move',
                    direction: block.direction || 0,
                    degrees: block.degrees || 360,
                    valid: true
                };
                newBlock.valid = this.validateMoveBlock(newBlock);
                this.blocks.push(newBlock);
            }
        });
        
        this.renderBlocks();
    }
}
