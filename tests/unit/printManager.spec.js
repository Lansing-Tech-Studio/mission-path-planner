const PrintManager = require('../../js/print.js');

describe('PrintManager', () => {
  let pm;
  let sourceCanvas;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="printTemplate">
        <img id="printTeamLogo" style="display:none" />
        <h1 id="printTeamName"></h1>
        <p id="printPlanDate"></p>
        <div class="print-description"></div>
        <canvas id="printCanvas"></canvas>
        <div id="printProgramBlocks"></div>
        <div class="print-config"><div id="printRobotConfig"></div></div>
      </div>
      <input type="checkbox" id="printRobotConfig" />
    `;
    sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = 100;
    sourceCanvas.height = 50;
    pm = new PrintManager();

    // Minimal missionPlanner context for populateProgramBlocks
    window.missionPlanner = {
      robot: { getConfig: () => ({ length: 20, width: 15, wheelOffset: 3, wheelCircumference: 19.6, wheelBase: 13.3, startX: 30, startY: 30, startAngle: 0 }) },
      pathCalculator: {
        calculateMoveBlock: (x, y, angle, dir, deg, robot) => [
          { x, y, angle },
          { x: x + 1, y: y + 1, angle: angle + 5 }
        ]
      }
    };
  });

  it('populates print template fields and copies canvas', () => {
    const data = {
      teamInfo: { name: 'My Team', logo: '', description: 'Hello <world>' },
      planDate: '2025-12-25',
      program: [{ type: 'move', direction: 0, degrees: 360, valid: true }],
      robot: window.missionPlanner.robot.getConfig()
    };

    // ensure robot config included
    document.getElementById('printRobotConfig').checked = true;

    const drawSpy = jest.spyOn(pm.printCtx, 'drawImage');
    pm.populatePrintTemplate(data, sourceCanvas);

    expect(document.getElementById('printTeamName').textContent).toBe('My Team');
    expect(document.querySelector('.print-description').style.display).toBe('block');
    expect(drawSpy).toHaveBeenCalled();
    expect(document.getElementById('printProgramBlocks').innerHTML.length).toBeGreaterThan(0);
    // robot config visible
    expect(document.querySelector('.print-config').style.display).toBe('block');
  });

  it('hides robot config section when checkbox unchecked', () => {
    const data = { teamInfo: {}, program: [], robot: null };
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    expect(document.querySelector('.print-config').style.display).toBe('none');
  });

  it('shows team logo when provided and hides description when absent', () => {
    const data = {
      teamInfo: { name: 'Team A', logo: 'http://example.com/logo.png', description: '' },
      program: [],
      robot: null
    };
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    expect(document.getElementById('printTeamLogo').style.display).toBe('block');
    expect(document.querySelector('.print-description').style.display).toBe('none');
  });

  it('printPlan calls window.print', () => {
    const data = { teamInfo: {}, program: [], robot: null };
    const spy = jest.spyOn(window, 'print').mockImplementation(() => {});
    pm.printPlan(data, sourceCanvas);
    expect(spy).toHaveBeenCalled();
  });

  it('handles text blocks with showPosition enabled', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'text', content: 'Start here', showPosition: true }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('Position:');
    expect(programBlocks.innerHTML).toContain('X:');
    expect(programBlocks.innerHTML).toContain('Y:');
    expect(programBlocks.innerHTML).toContain('Angle:');
  });

  it('handles move blocks with different directions', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'move', direction: 0, degrees: 360, valid: true },
        { type: 'move', direction: -50, degrees: 180, valid: true },
        { type: 'move', direction: 30, degrees: 720, valid: true }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('straight');
    expect(programBlocks.innerHTML).toContain('left');
    expect(programBlocks.innerHTML).toContain('right');
  });

  it('displays distance for straight moves', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'move', direction: 0, degrees: 360, valid: true }
      ],
      robot: { wheelCircumference: 20 }
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('Distance:');
  });

  it('marks invalid move blocks in red', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'move', direction: 200, degrees: 360, valid: false }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('(Invalid)');
  });

  it('handles empty text blocks', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'text', content: '', showPosition: false }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('(empty)');
  });

  it('escapes HTML in text blocks', () => {
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'text', content: '<script>alert("test")</script>', showPosition: false }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const programBlocks = document.getElementById('printProgramBlocks');
    expect(programBlocks.innerHTML).toContain('&lt;script&gt;');
    expect(programBlocks.innerHTML).not.toContain('<script>alert');
  });

  it('displays robot configuration when checkbox is checked', () => {
    const robotConfig = {
      length: 25,
      width: 18,
      wheelOffset: 4,
      wheelCircumference: 20,
      wheelBase: 15,
      startX: 40,
      startY: 50,
      startAngle: 45
    };
    
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [],
      robot: robotConfig
    };
    
    document.getElementById('printRobotConfig').checked = true;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    const configDiv = document.getElementById('printRobotConfig');
    expect(configDiv.innerHTML).toContain('25');
    expect(configDiv.innerHTML).toContain('18');
    expect(configDiv.innerHTML).toContain('40');
    expect(configDiv.innerHTML).toContain('50');
  });

  it('handles missing missionPlanner.pathCalculator gracefully', () => {
    const originalPathCalc = window.missionPlanner.pathCalculator;
    window.missionPlanner.pathCalculator = null;
    
    const data = {
      teamInfo: { name: 'Test Team' },
      program: [
        { type: 'move', direction: 0, degrees: 360, valid: true }
      ],
      robot: window.missionPlanner.robot.getConfig()
    };
    
    document.getElementById('printRobotConfig').checked = false;
    pm.populatePrintTemplate(data, sourceCanvas);
    
    // Should not throw error
    expect(document.getElementById('printProgramBlocks').innerHTML.length).toBeGreaterThan(0);
    
    window.missionPlanner.pathCalculator = originalPathCalc;
  });
});
