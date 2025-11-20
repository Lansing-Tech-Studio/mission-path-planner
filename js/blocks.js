// Block-based Program Management
class BlockManager {
    constructor() {
        this.blocks = [];
        this.container = document.getElementById('programBlocks');
        this.nextId = 1;
        this.draggedBlock = null;
        this.draggedElement = null;
        this.placeholder = null;
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
    
    moveBlock(fromIndex, toIndex) {
        if (fromIndex === toIndex || toIndex < 0 || toIndex >= this.blocks.length) {
            return;
        }
        
        const [block] = this.blocks.splice(fromIndex, 1);
        this.blocks.splice(toIndex, 0, block);
        this.renderBlocks();
        
        if (window.missionPlanner) {
            window.missionPlanner.update();
        }
    }
    
    handleDragStart(e, blockId) {
        this.draggedBlock = this.blocks.find(b => b.id === blockId);
        this.draggedElement = e.currentTarget;
        
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
        
        // Create placeholder
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'block-placeholder';
        this.placeholder.style.height = e.currentTarget.offsetHeight + 'px';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = this.getDragAfterElement(e.clientY);
        
        if (afterElement == null) {
            this.container.appendChild(this.placeholder);
        } else {
            this.container.insertBefore(this.placeholder, afterElement);
        }
    }
    
    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        
        // Check if dragged outside container
        const rect = this.container.getBoundingClientRect();
        const isOutside = e.clientX < rect.left || e.clientX > rect.right ||
                         e.clientY < rect.top || e.clientY > rect.bottom;
        
        if (isOutside && this.draggedBlock) {
            // Remove block if dragged outside
            this.removeBlock(this.draggedBlock.id);
        } else if (this.placeholder && this.placeholder.parentNode && this.draggedBlock) {
            // Reorder blocks based on placeholder position
            const placeholderIndex = Array.from(this.container.children).indexOf(this.placeholder);
            const draggedIndex = this.blocks.findIndex(b => b.id === this.draggedBlock.id);
            
            if (placeholderIndex !== -1 && draggedIndex !== -1) {
                // Adjust index if dragging down
                const targetIndex = placeholderIndex > draggedIndex ? placeholderIndex - 1 : placeholderIndex;
                this.moveBlock(draggedIndex, targetIndex);
            }
        }
        
        // Clean up
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
        this.draggedBlock = null;
        this.draggedElement = null;
        this.placeholder = null;
    }
    
    getDragAfterElement(y) {
        const draggableElements = [...this.container.querySelectorAll('.program-block:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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
                    // Add error message if it doesn't exist
                    const content = el.querySelector('.block-content');
                    if (content && !content.querySelector('.block-error-helper')) {
                        const helper = document.createElement('small');
                        helper.className = 'block-error-helper';
                        helper.style.color = '#d32f2f';
                        helper.style.fontSize = '10px';
                        helper.style.marginTop = '4px';
                        helper.style.display = 'block';
                        helper.textContent = 'Direction must be between an integer -100 and 100.';
                        content.appendChild(helper);
                    }
                } else {
                    el.classList.remove('invalid');
                    // Remove error message if it exists
                    const errorHelper = el.querySelector('.block-error-helper');
                    if (errorHelper) {
                        errorHelper.remove();
                    }
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
        // Convert bottom-left corner coordinates to axle center
        let x = robotConfig.startX + robotConfig.width / 2;
        let y = robotConfig.startY + robotConfig.wheelOffset;
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
        
        // Add drag over listener to container
        this.container.ondragover = (e) => this.handleDragOver(e);
        
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
        div.draggable = true;
        
        if (block.type === 'move' && block.valid === false) {
            div.classList.add('invalid');
        }
        
        // Add drag event listeners (drag from anywhere on the block)
        div.addEventListener('dragstart', (e) => this.handleDragStart(e, block.id));
        div.addEventListener('dragend', (e) => this.handleDragEnd(e));
        
        // Left vertical drag rail (purely visual, whole block is draggable)
        const dragRail = document.createElement('div');
        dragRail.className = 'drag-rail';
        dragRail.title = 'Drag to reorder';
        div.appendChild(dragRail);
        
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
            directionLabel.textContent = 'Direction:';
            directionLabel.title = '0 = straight, -1 to -100 = left, 1 to 100 = right';
            const directionInput = document.createElement('input');
            directionInput.type = 'number';
            directionInput.value = block.direction || 0;
            directionInput.min = -100;
            directionInput.max = 100;
            directionInput.step = 1;
            directionInput.title = '0 = straight, -1 to -100 = left, 1 to 100 = right';
            directionInput.oninput = (e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                this.updateBlock(block.id, 'direction', isNaN(value) ? 0 : value);
            };
            directionInput.onblur = (e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                const intValue = isNaN(value) ? 0 : value;
                e.target.value = intValue;
                this.updateBlock(block.id, 'direction', intValue);
            };
            directionGroup.appendChild(directionLabel);
            directionGroup.appendChild(directionInput);
            
            // Degrees input
            const degreesGroup = document.createElement('div');
            const degreesLabel = document.createElement('label');
            degreesLabel.textContent = 'Degrees:';
            degreesLabel.title = 'Positive degrees = forward, negative degrees = backup';
            const degreesInput = document.createElement('input');
            degreesInput.type = 'number';
            degreesInput.value = block.degrees || 360;
            degreesInput.step = 1;
            degreesInput.title = 'Positive degrees = forward, negative degrees = backup';
            degreesInput.oninput = (e) => this.updateBlock(block.id, 'degrees', e.target.value);
            degreesGroup.appendChild(degreesLabel);
            degreesGroup.appendChild(degreesInput);
            
            moveInputs.appendChild(directionGroup);
            moveInputs.appendChild(degreesGroup);
            content.appendChild(moveInputs);
            
            // Show helper text only when there's an error
            if (block.valid === false) {
                const helper = document.createElement('small');
                helper.className = 'block-error-helper';
                helper.style.color = '#d32f2f';
                helper.style.fontSize = '10px';
                helper.style.marginTop = '4px';
                helper.style.display = 'block';
                helper.textContent = '0 = straight, negative = left, positive = right. Negative degrees = backup';
                content.appendChild(helper);
            }
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

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.BlockManager = BlockManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockManager;
}
