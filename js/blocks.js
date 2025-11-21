// Block-based Program Management
class BlockManager {
    constructor() {
        this.blocks = [];
        this.container = document.getElementById('programBlocks');
        this.nextId = 1;
        this.draggedBlock = null;
        this.draggedElement = null;
        this.placeholder = null;
        this.workspace = null;
        this.blocklyInitialized = false;
        this.isUpdating = false; // Prevent circular updates
        
        // Initialize Blockly workspace
        this.initializeBlockly();
    }
    
    initializeBlockly() {
        // Ensure Blockly is loaded
        if (typeof Blockly === 'undefined') {
            console.error('Blockly is not loaded');
            return;
        }
        
        // Configure Blockly workspace
        this.workspace = Blockly.inject(this.container, {
            toolbox: null, // No toolbox - blocks added via buttons
            scrollbars: true,
            trashcan: true,
            move: {
                scrollbars: {
                    horizontal: false,
                    vertical: true
                },
                drag: true,
                wheel: true
            },
            zoom: {
                controls: false,
                wheel: false,
                startScale: 1.0
            }
        });
        
        // Listen to Blockly workspace changes
        this.workspace.addChangeListener((event) => this.handleBlocklyChange(event));
        
        this.blocklyInitialized = true;
    }
    
    handleBlocklyChange(event) {
        // Ignore events during our own updates
        if (this.isUpdating) {
            return;
        }
        
        // Ignore UI events like selection changes
        if (event.type === Blockly.Events.SELECTED ||
            event.type === Blockly.Events.UI ||
            event.type === Blockly.Events.VIEWPORT_CHANGE ||
            event.type === Blockly.Events.THEME_CHANGE) {
            return;
        }
        
        // Handle block changes (field value changes, block moves, deletes)
        if (event.type === Blockly.Events.BLOCK_CHANGE || 
            event.type === Blockly.Events.BLOCK_MOVE ||
            event.type === Blockly.Events.BLOCK_DELETE ||
            event.type === Blockly.Events.CHANGE) {
            
            // Sync Blockly blocks back to internal data structure
            // but DON'T re-render (that would clear the workspace and lose focus)
            this.syncFromBlocklyWithoutRender();
            
            // Trigger program update
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        }
    }
    
    syncFromBlocklyWithoutRender() {
        // Extract block data from Blockly workspace and update internal blocks array
        // WITHOUT triggering a re-render
        const topBlocks = this.workspace.getTopBlocks(true); // ordered: true for correct sequence
        this.blocks = [];
        
        topBlocks.forEach(blocklyBlock => {
            let currentBlock = blocklyBlock;
            while (currentBlock) {
                const blockData = this.blocklyBlockToData(currentBlock);
                if (blockData) {
                    this.blocks.push(blockData);
                }
                currentBlock = currentBlock.getNextBlock();
            }
        });
    }
    
    syncFromBlockly() {
        // This is called when we DO want to update isUpdating flag
        this.isUpdating = true;
        this.syncFromBlocklyWithoutRender();
        this.isUpdating = false;
    }
    
    blocklyBlockToData(blocklyBlock) {
        const type = blocklyBlock.type;
        
        // Try to parse ID from Blockly block ID, or find existing block
        let blockId;
        const numericId = parseInt(blocklyBlock.id);
        if (!isNaN(numericId)) {
            blockId = numericId;
        } else {
            // Blockly assigns string IDs - find if this block already exists in our array
            const existingBlock = this.blocks.find(b => b.blocklyId === blocklyBlock.id);
            blockId = existingBlock ? existingBlock.id : this.nextId++;
        }
        
        if (type === 'mission_move') {
            const direction = blocklyBlock.getFieldValue('DIRECTION');
            const degrees = blocklyBlock.getFieldValue('DEGREES');
            const block = {
                id: blockId,
                blocklyId: blocklyBlock.id,
                type: 'move',
                direction: parseFloat(direction) || 0,
                degrees: parseFloat(degrees) || 0
            };
            block.valid = this.validateMoveBlock(block);
            return block;
        } else if (type === 'mission_text') {
            const text = blocklyBlock.getFieldValue('TEXT');
            const showPosition = blocklyBlock.getFieldValue('SHOW_POSITION') === 'TRUE';
            return {
                id: blockId,
                blocklyId: blocklyBlock.id,
                type: 'text',
                content: text || '',
                showPosition: showPosition
            };
        }
        
        return null;
    }
    
    addTextBlock() {
        const block = {
            id: this.nextId++,
            type: 'text',
            content: '',
            showPosition: false
        };
        
        this.blocks.push(block);
        
        // Add directly to Blockly workspace instead of re-rendering everything
        if (this.blocklyInitialized && this.workspace) {
            this.isUpdating = true;
            const blocklyBlock = this.createBlocklyBlock(block);
            if (blocklyBlock) {
                // Connect to last block if exists
                const topBlocks = this.workspace.getTopBlocks(true);
                if (topBlocks.length > 0) {
                    const lastBlock = this.findLastBlock(topBlocks[0]);
                    if (lastBlock && lastBlock.nextConnection) {
                        lastBlock.nextConnection.connect(blocklyBlock.previousConnection);
                    }
                }
                blocklyBlock.initSvg();
                blocklyBlock.render();
                
                // Store the Blockly ID for future reference
                block.blocklyId = blocklyBlock.id;
            }
            this.isUpdating = false;
        }
        
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
        
        // Add directly to Blockly workspace instead of re-rendering everything
        if (this.blocklyInitialized && this.workspace) {
            this.isUpdating = true;
            const blocklyBlock = this.createBlocklyBlock(block);
            if (blocklyBlock) {
                // Connect to last block if exists
                const topBlocks = this.workspace.getTopBlocks(true);
                if (topBlocks.length > 0) {
                    const lastBlock = this.findLastBlock(topBlocks[0]);
                    if (lastBlock && lastBlock.nextConnection) {
                        lastBlock.nextConnection.connect(blocklyBlock.previousConnection);
                    }
                }
                blocklyBlock.initSvg();
                blocklyBlock.render();
                
                // Store the Blockly ID for future reference
                block.blocklyId = blocklyBlock.id;
            }
            this.isUpdating = false;
        }
        
        return block;
    }
    
    findLastBlock(block) {
        // Find the last block in a chain
        let current = block;
        while (current.getNextBlock()) {
            current = current.getNextBlock();
        }
        return current;
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
    
    updateBlock(id, field, value) {
        const block = this.blocks.find(b => b.id === id);
        if (block) {
            block[field] = value;
            
            // Validate move blocks
            if (block.type === 'move') {
                block.valid = this.validateMoveBlock(block);
            }
            
            // Trigger update
            if (window.missionPlanner) {
                window.missionPlanner.update();
            }
        }
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
        if (!this.blocklyInitialized || !this.workspace) {
            console.warn('Blockly not initialized yet');
            return;
        }
        
        this.isUpdating = true;
        
        // Clear existing blocks in Blockly workspace
        this.workspace.clear();
        
        if (this.blocks.length === 0) {
            this.isUpdating = false;
            return;
        }
        
        // Create Blockly blocks from internal data
        let previousBlock = null;
        
        this.blocks.forEach((block, index) => {
            const blocklyBlock = this.createBlocklyBlock(block);
            
            if (blocklyBlock) {
                // Connect to previous block to maintain single column
                if (previousBlock) {
                    const connection = previousBlock.nextConnection;
                    const targetConnection = blocklyBlock.previousConnection;
                    if (connection && targetConnection) {
                        connection.connect(targetConnection);
                    }
                }
                
                blocklyBlock.initSvg();
                blocklyBlock.render();
                previousBlock = blocklyBlock;
            }
        });
        
        this.isUpdating = false;
    }
    
    createBlocklyBlock(block) {
        if (block.type === 'move') {
            const blocklyBlock = this.workspace.newBlock('mission_move');
            blocklyBlock.setFieldValue(block.direction, 'DIRECTION');
            blocklyBlock.setFieldValue(block.degrees, 'DEGREES');
            // Use existing blocklyId if available, otherwise use numeric id
            if (block.blocklyId) {
                blocklyBlock.id = block.blocklyId;
            }
            return blocklyBlock;
        } else if (block.type === 'text') {
            const blocklyBlock = this.workspace.newBlock('mission_text');
            blocklyBlock.setFieldValue(block.content || '', 'TEXT');
            blocklyBlock.setFieldValue(block.showPosition ? 'TRUE' : 'FALSE', 'SHOW_POSITION');
            // Use existing blocklyId if available, otherwise use numeric id
            if (block.blocklyId) {
                blocklyBlock.id = block.blocklyId;
            }
            return blocklyBlock;
        }
        
        return null;
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
