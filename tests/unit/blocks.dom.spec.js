const BlockManager = require('../../js/blocks.js');

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
      robot: { getConfig: () => ({ startX: 30, startY: 30, startAngle: 0, wheelBase: 12 }) }
    };
    bm = new BlockManager();
  });

  it('renders empty state and adds/removes blocks', () => {
    bm.renderBlocks();
    expect(container.textContent).toMatch(/No blocks added yet/i);

    const t = bm.addTextBlock();
    const m = bm.addMoveBlock();
    expect(container.querySelectorAll('.program-block').length).toBe(2);

    bm.removeBlock(t.id);
    expect(container.querySelectorAll('.program-block').length).toBe(1);
  });

  it('updates validation classes and helper text for invalid move block', () => {
    const move = bm.addMoveBlock();
    const blockEl = container.querySelector(`.program-block[data-block-id="${move.id}"]`);
    expect(blockEl).toBeTruthy();

    bm.updateBlock(move.id, 'direction', 150); // invalid
    const invalidEl = container.querySelector(`.program-block[data-block-id="${move.id}"]`);
    expect(invalidEl.classList.contains('invalid')).toBe(true);
    expect(invalidEl.querySelector('.block-error-helper')).toBeTruthy();

    bm.updateBlock(move.id, 'direction', 0); // valid
    const validEl = container.querySelector(`.program-block[data-block-id="${move.id}"]`);
    expect(validEl.classList.contains('invalid')).toBe(false);
    expect(validEl.querySelector('.block-error-helper')).toBeFalsy();
  });

  it('dragging outside container removes a block', () => {
    bm.addTextBlock();
    bm.addTextBlock();
    const firstEl = container.querySelector('.program-block');
    // Assign predictable bounding boxes
    container.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 400, width: 200, height: 400 });
    firstEl.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 50, width: 200, height: 50 });

    const eStart = {
      currentTarget: firstEl,
      dataTransfer: { effectAllowed: '', setData: () => {} },
      clientX: 10,
      clientY: 10,
      preventDefault: () => {}
    };
    bm.handleDragStart(eStart, parseInt(firstEl.dataset.blockId));

    // Simulate drag over to create placeholder
    const eOver = { preventDefault: () => {}, dataTransfer: { dropEffect: '' }, clientY: 300 };
    bm.handleDragOver(eOver);

    // End drag outside to trigger removal
    const eEnd = { currentTarget: firstEl, clientX: -10, clientY: 10 };
    const countBefore = container.querySelectorAll('.program-block').length;
    bm.handleDragEnd(eEnd);
    const countAfter = container.querySelectorAll('.program-block').length;
    expect(countAfter).toBeLessThan(countBefore);
  });

  it('reorders blocks via moveBlock', () => {
    const a = bm.addTextBlock();
    const b = bm.addMoveBlock();
    const before = Array.from(container.querySelectorAll('.program-block')).map(el => parseInt(el.dataset.blockId));
    bm.moveBlock(1, 0); // move second to first
    const after = Array.from(container.querySelectorAll('.program-block')).map(el => parseInt(el.dataset.blockId));
    expect(after[0]).toBe(b.id);
    expect(after.join(',')).not.toBe(before.join(','));
  });

  it('loadProgram handles invalid input and marks invalid moves', () => {
    bm.loadProgram(null); // invalid input branch
    expect(container.children.length).toBeGreaterThan(0); // empty-state message

    bm.loadProgram([
      { type: 'text', content: 'hi', showPosition: true },
      { type: 'move', direction: 150, degrees: 360 } // invalid direction branch
    ]);

    const prog = bm.getProgram();
    expect(prog.length).toBe(2);
    expect(prog[1].valid).toBe(false);
  });
});
