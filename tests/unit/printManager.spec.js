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

  it('printPlan calls window.print', () => {
    const data = { teamInfo: {}, program: [], robot: null };
    const spy = jest.spyOn(window, 'print').mockImplementation(() => {});
    pm.printPlan(data, sourceCanvas);
    expect(spy).toHaveBeenCalled();
  });
});
