const BlockManager = require('../../js/blocks.js');

// Mock Blockly for testing
const mockBlocklyBlock = {
  id: '1',
  type: 'mission_move',
  previousConnection: null,
  nextConnection: null,
  initSvg: jest.fn(),
  render: jest.fn(),
  setFieldValue: jest.fn(),
  getFieldValue: jest.fn((field) => {
    if (field === 'DIRECTION') return 0;
    if (field === 'DEGREES') return 360;
    if (field === 'TEXT') return '';
    if (field === 'SHOW_POSITION') return 'FALSE';
    return '';
  }),
  getNextBlock: jest.fn(() => null)
};

const mockWorkspace = {
  clear: jest.fn(),
  newBlock: jest.fn((type) => ({
    ...mockBlocklyBlock,
    type,
    id: Date.now().toString()
  })),
  addChangeListener: jest.fn(),
  getTopBlocks: jest.fn(() => [])
};

global.Blockly = {
  inject: jest.fn(() => mockWorkspace),
  Events: {
    BLOCK_CHANGE: 'block_change',
    BLOCK_MOVE: 'block_move',
    BLOCK_DELETE: 'block_delete'
  }
};

describe('BlockManager DOM behaviors', () => {
  let bm;
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="programBlocks"></div>';
    container = document.getElementById('programBlocks');
    // Minimal mission planner context
    window.missionPlanner = {
      update: jest.fn(),
      pathCalculator: { calculateMoveBlock: jest.fn().mockReturnValue([]) },
      robot: { getConfig: () => ({ startX: 30, startY: 30, startAngle: 0, wheelBase: 12, width: 15, wheelOffset: 3 }) }
    };
    
    // Reset mocks
    mockWorkspace.clear.mockClear();
    mockWorkspace.newBlock.mockClear();
    mockWorkspace.getTopBlocks.mockClear();
    
    bm = new BlockManager();
  });

  it('renders empty state and adds/removes blocks', () => {
    bm.renderBlocks();
    // With Blockly, empty state doesn't show text message, just empty workspace
    expect(bm.blocks.length).toBe(0);

    const t = bm.addTextBlock();
    const m = bm.addMoveBlock();
    expect(bm.blocks.length).toBe(2);
    expect(mockWorkspace.newBlock).toHaveBeenCalled();

    bm.removeBlock(t.id);
    expect(bm.blocks.length).toBe(1);
  });

  it('updates validation state for invalid move block', () => {
    const move = bm.addMoveBlock();
    expect(move).toBeTruthy();
    expect(move.type).toBe('move');

    bm.updateBlock(move.id, 'direction', 150); // invalid
    const block = bm.blocks.find(b => b.id === move.id);
    expect(block.valid).toBe(false);

    bm.updateBlock(move.id, 'direction', 0); // valid
    const validBlock = bm.blocks.find(b => b.id === move.id);
    expect(validBlock.valid).toBe(true);
  });

  it('can remove blocks', () => {
    // With Blockly, drag-drop is handled by Blockly itself
    // We test the removeBlock method directly
    bm.addTextBlock();
    bm.addTextBlock();
    expect(bm.blocks.length).toBe(2);
    
    const firstBlockId = bm.blocks[0].id;
    bm.removeBlock(firstBlockId);
    
    expect(bm.blocks.length).toBe(1);
    expect(bm.blocks.find(b => b.id === firstBlockId)).toBeUndefined();
  });

  it('reorders blocks via moveBlock', () => {
    const a = bm.addTextBlock();
    const b = bm.addMoveBlock();
    const beforeIds = bm.blocks.map(bl => bl.id);
    
    bm.moveBlock(1, 0); // move second to first
    const afterIds = bm.blocks.map(bl => bl.id);
    
    expect(afterIds[0]).toBe(b.id);
    expect(afterIds.join(',')).not.toBe(beforeIds.join(','));
  });

  it('loadProgram handles invalid input and marks invalid moves', () => {
    bm.loadProgram(null); // invalid input branch
    expect(bm.blocks.length).toBe(0); // Should remain empty

    bm.loadProgram([
      { type: 'text', content: 'hi', showPosition: true },
      { type: 'move', direction: 150, degrees: 360 } // invalid direction branch
    ]);

    const prog = bm.getProgram();
    expect(prog.length).toBe(2);
    expect(prog[1].valid).toBe(false);
  });
});
