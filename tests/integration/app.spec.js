const MissionPlannerModule = require('../../app.js');

describe('MissionPlanner Integration', () => {
  let mission;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="left-panel">
        <div class="tab-navigation">
          <button class="tab-button active" data-tab="setup">Setup</button>
          <button class="tab-button" data-tab="program">Program</button>
        </div>
        <div class="tab-content-container">
          <div class="tab-content active" data-tab="setup">
            <section class="section">
              <h2 class="section-header">Team Info<span class="collapse-icon">−</span></h2>
              <div class="section-content">
                <input id="teamName" value="Dad's Rule" />
                <input id="teamLogo" value="" />
                <textarea id="description"></textarea>
              </div>
            </section>
            <section class="section">
              <h2 class="section-header">Robot Configuration<span class="collapse-icon">−</span></h2>
              <div class="section-content">
                <select id="robotPreset">
                  <option value="">--</option>
                  <option value="dadbot">DadBot</option>
                  <option value="coopbot">Coop</option>
                </select>
                <input id="robotLength" value="16.5" />
                <input id="robotWidth" value="15" />
                <input id="wheelOffset" value="3.1" />
                <input id="wheelCircumference" value="19.6" />
                <input id="wheelBase" value="13.3" />
                <input id="robotImageUrl" value="" />
              </div>
            </section>
            <section class="section">
              <h2 class="section-header">Mission Mat<span class="collapse-icon">−</span></h2>
              <div class="section-content">
                <select id="matSelect">
                  <option value="blank">Blank</option>
                  <option value="2025-unearthed" selected>Unearthed</option>
                  <option value="custom">Custom</option>
                </select>
                <div id="customMatUrlGroup" style="display:none"><input id="customMatUrl" /></div>
                <select id="matAlignment">
                  <option value="centered" selected>Centered</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </section>
            <section class="section">
              <h2 class="section-header">Starting Position<span class="collapse-icon">−</span></h2>
              <div class="section-content">
                <input id="startX" value="33" />
                <input id="startY" value="3.3" />
                <input id="startAngle" value="0" />
              </div>
            </section>
          </div>
          <div class="tab-content" data-tab="program">
            <section class="section program-section">
              <div class="section-content">
                <div id="programBlocks"></div>
                <div class="button-group">
                  <button id="addTextBlock">Add Text Block</button>
                  <button id="addMoveBlock">Add Move Block</button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <div class="bottom-actions-bar">
        <input type="date" id="planDate" />
        <label><input type="checkbox" id="printRobotConfig"/> Include Robot Configuration in Print</label>
        <button id="exportBtn">Export JSON</button>
        <button id="importBtn">Import JSON</button>
        <button id="printBtn">Print Plan</button>
        <input type="file" id="importFile" style="display:none" />
      </div>
      <div class="right-panel" style="width:800px;height:600px">
        <canvas id="missionCanvas"></canvas>
      </div>
      <div id="printTemplate" style="display:none">
        <div id="printProgramBlocks"></div>
        <div class="print-config"><div id="printRobotConfig"></div></div>
        <img id="printTeamLogo" />
        <h1 id="printTeamName"></h1>
        <p id="printPlanDate"></p>
        <div class="print-description"></div>
        <canvas id="printCanvas"></canvas>
      </div>
    `;

    // Require classes (module.exports returns class constructors)
    const RobotConfig = require('../../js/robot.js');
    const CanvasRenderer = require('../../js/canvas.js');
    const BlockManager = require('../../js/blocks.js');
    const PathCalculator = require('../../js/pathCalculator.js');
    const StorageManager = require('../../js/storage.js');
    const PrintManager = require('../../js/print.js');

    // Expose to window for app.js expectations
    Object.assign(window, { RobotConfig, CanvasRenderer, BlockManager, PathCalculator, StorageManager, PrintManager });

    // Spy on canvas renderer instance methods after creation
    mission = new window.MissionPlanner();
  });

  it('switches tabs and toggles classes', () => {
    const setupBtn = document.querySelector('button[data-tab="setup"]');
    const programBtn = document.querySelector('button[data-tab="program"]');
    programBtn.click();
    expect(programBtn.classList.contains('active')).toBe(true);
    expect(setupBtn.classList.contains('active')).toBe(false);
  });

  it('collapses and expands sections on header click', () => {
    const header = document.querySelector('.section-header');
    const section = header.parentElement;
    header.click();
    expect(section.classList.contains('collapsed')).toBe(true);
    header.click();
    expect(section.classList.contains('collapsed')).toBe(false);
  });

  it('adds text and move blocks via buttons', () => {
    document.getElementById('addTextBlock').click();
    document.getElementById('addMoveBlock').click();
    const blocks = mission.blocks.getProgram();
    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe('text');
    expect(blocks[1].type).toBe('move');
  });

  it('getMatUrl returns preset and custom URLs', () => {
    // preset
    document.getElementById('matSelect').value = '2025-unearthed';
    expect(mission.getMatUrl()).toContain('2025-unearthed');

    // custom
    document.getElementById('matSelect').value = 'custom';
    document.getElementById('customMatUrl').value = 'https://example.com/mat.png';
    expect(mission.getMatUrl()).toBe('https://example.com/mat.png');
  });

  it('loadData populates fields and reveals custom URL group', () => {
    mission.loadData({
      teamInfo: { name: 'Team', logo: 'logo.png', description: 'desc' },
      mat: { selected: 'custom', customUrl: 'https://m.png', alignment: 'right' },
      robot: { length: 20, width: 16, wheelOffset: 2, wheelCircumference: 18, wheelBase: 12, startX: 10, startY: 20, startAngle: 30 },
      program: [{ type: 'text', content: 'hi' }],
      planDate: '2025-12-25'
    });
    expect(document.getElementById('teamName').value).toBe('Team');
    expect(document.getElementById('customMatUrlGroup').style.display).toBe('block');
    expect(document.getElementById('matAlignment').value).toBe('right');
    expect(document.getElementById('planDate').value).toBe('2025-12-25');
  });
});
