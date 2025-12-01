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
      <div class="right-panel" style="width:800px;height:600px">
        <div class="plan-controls-bar">
          <input type="date" id="planDate" />
          <label><input type="checkbox" id="printRobotConfig"/> Include Robot Configuration in Print</label>
          <button id="exportBtn">Export</button>
          <button id="importBtn">Import</button>
          <button id="printBtn">Print</button>
        </div>
        <input type="file" id="importFile" style="display:none" />
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

  describe('auto-save and restore', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('restoreLastState loads state from localStorage', () => {
      const savedState = {
        teamInfo: { name: 'Restored Team' },
        mat: { selected: 'blank', alignment: 'centered' }
      };
      mission.storage.saveLastState(savedState);
      
      mission.restoreLastState();
      
      expect(document.getElementById('teamName').value).toBe('Restored Team');
    });

    it('autoSave debounces and saves state', (done) => {
      jest.useFakeTimers();
      const saveSpy = jest.spyOn(mission.storage, 'saveLastState').mockReturnValue({ success: true });
      
      mission.autoSave();
      mission.autoSave();
      mission.autoSave();
      
      expect(saveSpy).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      
      expect(saveSpy).toHaveBeenCalledTimes(1);
      
      saveSpy.mockRestore();
      jest.useRealTimers();
      done();
    });

    it('showStorageWarning shows alert only once per session', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mission._storageWarningShown = false;
      mission.showStorageWarning(85);
      mission.showStorageWarning(90);
      
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('85%'));
      
      alertSpy.mockRestore();
    });
  });

  describe('save and load robot configurations', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saveCurrentRobot saves robot config when name provided', () => {
      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('My Robot');
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mission.saveCurrentRobot();
      
      expect(promptSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('saved successfully'));
      
      const savedRobots = mission.storage.loadSavedRobots();
      expect(Object.keys(savedRobots).length).toBe(1);
      expect(Object.values(savedRobots)[0].name).toBe('My Robot');
      
      promptSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('saveCurrentRobot does nothing when prompt cancelled', () => {
      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue(null);
      
      mission.saveCurrentRobot();
      
      const savedRobots = mission.storage.loadSavedRobots();
      expect(Object.keys(savedRobots).length).toBe(0);
      
      promptSpy.mockRestore();
    });

    it('loadSavedRobot loads robot configuration', () => {
      const result = mission.storage.saveRobotConfig('Test Robot', {
        length: 25, width: 20, wheelOffset: 5, wheelCircumference: 20, wheelBase: 15
      });
      
      mission.loadSavedRobot(result.id);
      
      expect(document.getElementById('robotLength').value).toBe('25');
      expect(document.getElementById('robotWidth').value).toBe('20');
    });

    it('deleteSavedRobot removes robot after confirmation', () => {
      const result = mission.storage.saveRobotConfig('Robot To Delete', { length: 10 });
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      mission.deleteSavedRobot(result.id);
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mission.storage.getRobotConfig(result.id)).toBeNull();
      
      confirmSpy.mockRestore();
    });
  });

  describe('save and load programs', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('saveCurrentProgram saves program when name provided', () => {
      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('My Program');
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mission.saveCurrentProgram();
      
      expect(promptSpy).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('saved successfully'));
      
      const savedPrograms = mission.storage.loadSavedPrograms();
      expect(Object.keys(savedPrograms).length).toBe(1);
      expect(Object.values(savedPrograms)[0].name).toBe('My Program');
      
      promptSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('saveCurrentProgram does nothing when prompt cancelled', () => {
      const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('');
      
      mission.saveCurrentProgram();
      
      const savedPrograms = mission.storage.loadSavedPrograms();
      expect(Object.keys(savedPrograms).length).toBe(0);
      
      promptSpy.mockRestore();
    });

    it('loadSavedProgram loads program data', () => {
      const result = mission.storage.saveProgram('Test Program', {
        teamInfo: { name: 'Loaded Team' },
        mat: { selected: 'blank', alignment: 'centered' }
      });
      
      mission.loadSavedProgram(result.id);
      
      expect(document.getElementById('teamName').value).toBe('Loaded Team');
    });

    it('deleteSavedProgram removes program after confirmation', () => {
      const result = mission.storage.saveProgram('Program To Delete', { teamInfo: {} });
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      mission.deleteSavedProgram(result.id);
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(mission.storage.getProgram(result.id)).toBeNull();
      
      confirmSpy.mockRestore();
    });
  });

  describe('storage management UI', () => {
    beforeEach(() => {
      localStorage.clear();
      // Add storage UI elements to DOM
      document.body.innerHTML += `
        <select id="savedRobots"><option value="">--</option></select>
        <select id="savedPrograms"><option value="">--</option></select>
        <div id="storageUsageBar"></div>
        <span id="storageUsageText"></span>
        <div id="savedRobotsList"></div>
        <div id="savedProgramsList"></div>
      `;
    });

    it('updateStorageUI populates dropdowns', () => {
      mission.storage.saveRobotConfig('Robot 1', { length: 10 });
      mission.storage.saveProgram('Program 1', { teamInfo: {} });
      
      mission.updateStorageUI();
      
      const robotOptions = document.querySelectorAll('#savedRobots option');
      const programOptions = document.querySelectorAll('#savedPrograms option');
      
      expect(robotOptions.length).toBe(2);
      expect(programOptions.length).toBe(2);
    });

    it('updateStorageUI updates usage bar', () => {
      mission.updateStorageUI();
      
      const usageText = document.getElementById('storageUsageText').textContent;
      expect(usageText).toContain('KB');
      expect(usageText).toContain('%');
    });

    it('updateStorageUI shows empty list message', () => {
      mission.updateStorageUI();
      
      const robotsList = document.getElementById('savedRobotsList').innerHTML;
      const programsList = document.getElementById('savedProgramsList').innerHTML;
      
      expect(robotsList).toContain('No saved robots');
      expect(programsList).toContain('No saved programs');
    });

    it('clearAllSavedData clears storage after confirmation', () => {
      mission.storage.saveRobotConfig('Robot', { length: 10 });
      mission.storage.saveProgram('Program', { teamInfo: {} });
      
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mission.clearAllSavedData();
      
      expect(confirmSpy).toHaveBeenCalled();
      expect(Object.keys(mission.storage.loadSavedRobots()).length).toBe(0);
      expect(Object.keys(mission.storage.loadSavedPrograms()).length).toBe(0);
      
      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('escapeHtml escapes special characters', () => {
      const escaped = mission.escapeHtml('<script>alert("xss")</script>');
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;');
    });
  });
});
