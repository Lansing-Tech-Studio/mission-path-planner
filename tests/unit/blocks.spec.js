let BlockManager;

describe('BlockManager', () => {
  let BlockManager;
  let blockManager;
  let dom;

  beforeEach(() => {
    document.body.innerHTML = '<div id="programBlocks"></div>';
    BlockManager = require('../../js/blocks.js');
    blockManager = new BlockManager();
  });

  describe('validateMoveBlock', () => {
    it('should validate a correct move block', () => {
      const block = { direction: 50, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should invalidate direction out of range (> 100)', () => {
      const block = { direction: 150, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(false);
    });

    it('should invalidate direction out of range (< -100)', () => {
      const block = { direction: -150, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(false);
    });

    it('should invalidate zero degrees', () => {
      const block = { direction: 0, degrees: 0 };
      expect(blockManager.validateMoveBlock(block)).toBe(false);
    });

    it('should invalidate non-numeric direction', () => {
      const block = { direction: 'abc', degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(false);
    });

    it('should invalidate non-numeric degrees', () => {
      const block = { direction: 50, degrees: 'xyz' };
      expect(blockManager.validateMoveBlock(block)).toBe(false);
    });

    it('should validate edge cases: direction = -100', () => {
      const block = { direction: -100, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should validate edge cases: direction = 100', () => {
      const block = { direction: 100, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should validate negative degrees', () => {
      const block = { direction: 0, degrees: -360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });
  });

  describe('addTextBlock', () => {
    it('should add a text block and return it', () => {
      const block = blockManager.addTextBlock();
      
      expect(block).toBeDefined();
      expect(block.type).toBe('text');
      expect(block.content).toBe('');
      expect(blockManager.blocks.length).toBe(1);
    });

    it('should assign unique IDs to blocks', () => {
      const block1 = blockManager.addTextBlock();
      const block2 = blockManager.addTextBlock();
      
      expect(block1.id).not.toBe(block2.id);
    });
  });

  describe('addMoveBlock', () => {
    it('should add a move block with default values', () => {
      const block = blockManager.addMoveBlock();
      
      expect(block).toBeDefined();
      expect(block.type).toBe('move');
      expect(block.direction).toBe(0);
      expect(block.degrees).toBe(360);
      expect(blockManager.blocks.length).toBe(1);
    });
  });

  describe('removeBlock', () => {
    it('should remove a block by ID', () => {
      const block1 = blockManager.addTextBlock();
      const block2 = blockManager.addMoveBlock();
      
      blockManager.removeBlock(block1.id);
      
      expect(blockManager.blocks.length).toBe(1);
      expect(blockManager.blocks[0].id).toBe(block2.id);
    });
  });

  describe('getProgram', () => {
    it('should return validated program blocks', () => {
      blockManager.addTextBlock();
      blockManager.blocks[0].content = 'Test comment';
      
      blockManager.addMoveBlock();
      blockManager.blocks[1].direction = 50;
      blockManager.blocks[1].degrees = 720;
      
      const program = blockManager.getProgram();
      
      expect(program.length).toBe(2);
      expect(program[0].type).toBe('text');
      expect(program[0].content).toBe('Test comment');
      expect(program[1].type).toBe('move');
      expect(program[1].direction).toBe(50);
      expect(program[1].valid).toBe(true);
    });

    it('should mark invalid move blocks', () => {
      blockManager.addMoveBlock();
      blockManager.blocks[0].direction = 200; // Invalid
      blockManager.blocks[0].degrees = 360;
      
      const program = blockManager.getProgram();
      
      expect(program[0].valid).toBe(false);
    });
  });

  describe('loadProgram', () => {
    it('should load a program and reset blocks', () => {
      blockManager.addTextBlock();
      blockManager.addMoveBlock();
      
      const newProgram = [
        { type: 'text', content: 'New comment' },
        { type: 'move', direction: -30, degrees: 180 }
      ];
      
      blockManager.loadProgram(newProgram);
      
      expect(blockManager.blocks.length).toBe(2);
      expect(blockManager.blocks[0].content).toBe('New comment');
      expect(blockManager.blocks[1].direction).toBe(-30);
    });

    it('should handle empty or invalid program', () => {
      blockManager.addTextBlock();
      
      blockManager.loadProgram(null);
      expect(blockManager.blocks.length).toBe(0);
      
      blockManager.loadProgram([]);
      expect(blockManager.blocks.length).toBe(0);
    });
  });

  describe('moveBlock', () => {
    it('should move a block from one position to another', () => {
      blockManager.addTextBlock();
      blockManager.blocks[0].content = 'Block 1';
      blockManager.addTextBlock();
      blockManager.blocks[1].content = 'Block 2';
      blockManager.addTextBlock();
      blockManager.blocks[2].content = 'Block 3';
      
      blockManager.moveBlock(0, 2);
      
      expect(blockManager.blocks[0].content).toBe('Block 2');
      expect(blockManager.blocks[1].content).toBe('Block 3');
      expect(blockManager.blocks[2].content).toBe('Block 1');
    });

    it('should not move block if fromIndex equals toIndex', () => {
      blockManager.addTextBlock();
      blockManager.blocks[0].content = 'Block 1';
      
      blockManager.moveBlock(0, 0);
      
      expect(blockManager.blocks[0].content).toBe('Block 1');
    });

    it('should not move block if toIndex is out of bounds', () => {
      blockManager.addTextBlock();
      blockManager.blocks[0].content = 'Block 1';
      
      blockManager.moveBlock(0, -1);
      expect(blockManager.blocks.length).toBe(1);
      
      blockManager.moveBlock(0, 5);
      expect(blockManager.blocks.length).toBe(1);
    });
  });

  describe('validateMoveBlock edge cases', () => {
    it('should validate block with positive small direction', () => {
      const block = { direction: 0.1, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should validate block with negative small direction', () => {
      const block = { direction: -0.1, degrees: 360 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should validate block with small positive degrees', () => {
      const block = { direction: 50, degrees: 0.1 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });

    it('should validate block with large degrees', () => {
      const block = { direction: 50, degrees: 10000 };
      expect(blockManager.validateMoveBlock(block)).toBe(true);
    });
  });
});
