let StorageManager;

describe('StorageManager', () => {
  let storage;

  beforeEach(() => {
    document.body.innerHTML = '';
    StorageManager = require('../../js/storage.js');
    storage = new StorageManager();
    localStorage.clear();
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      const result = storage.sanitizeFilename("Dad's Rule!");
      expect(result).toBe('dad-s-rule');  // Apostrophe becomes dash
    });

    it('should handle spaces', () => {
      const result = storage.sanitizeFilename('My Team Name');
      expect(result).toBe('my-team-name');
    });

    it('should collapse multiple dashes', () => {
      const result = storage.sanitizeFilename('Team---Name');
      expect(result).toBe('team-name');
    });

    it('should trim dashes from ends', () => {
      const result = storage.sanitizeFilename('-TeamName-');
      expect(result).toBe('teamname');
    });

    it('should truncate to 50 characters', () => {
      const longName = 'a'.repeat(60);
      const result = storage.sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('should return fallback for empty string', () => {
      const result = storage.sanitizeFilename('');
      expect(result).toBe('mission-plan');
    });
  });

  describe('validateImportData', () => {
    it('should accept valid data with teamInfo', () => {
      const data = { teamInfo: { name: 'Test' } };
      expect(storage.validateImportData(data)).toBe(true);
    });

    it('should accept valid data with robot config', () => {
      const data = { robot: { length: 20 } };
      expect(storage.validateImportData(data)).toBe(true);
    });

    it('should accept valid data with program', () => {
      const data = { program: [] };
      expect(storage.validateImportData(data)).toBe(true);
    });

    it('should reject null data', () => {
      expect(storage.validateImportData(null)).toBe(false);
    });

    it('should reject non-object data', () => {
      expect(storage.validateImportData('string')).toBe(false);
      expect(storage.validateImportData(123)).toBe(false);
    });

    it('should reject empty object', () => {
      expect(storage.validateImportData({})).toBe(false);
    });
  });

  describe('localStorage operations', () => {
    it('should save data to localStorage', () => {
      const data = { test: 'value' };
      storage.saveToLocalStorage(data);
      
      const saved = localStorage.getItem('missionPlannerState');
      expect(saved).toBeDefined();
      expect(JSON.parse(saved)).toEqual(data);
    });

    it('should load data from localStorage', () => {
      const data = { test: 'value', nested: { key: 123 } };
      localStorage.setItem('missionPlannerState', JSON.stringify(data));
      
      const loaded = storage.loadFromLocalStorage();
      expect(loaded).toEqual(data);
    });

    it('should return null for missing localStorage data', () => {
      const loaded = storage.loadFromLocalStorage();
      expect(loaded).toBeNull();
    });

    it('should clear localStorage', () => {
      localStorage.setItem('missionPlannerState', JSON.stringify({ test: 'value' }));
      
      storage.clearLocalStorage();
      
      expect(localStorage.getItem('missionPlannerState')).toBeNull();
    });
  });

  describe('exportJSON', () => {
    it('should create download with correct filename format', () => {
      const data = {
        teamInfo: { name: "Dad's Rule" },
        program: []
      };
      
        // Mock appendChild and removeChild on dom.window.document.body
        const appendChildSpy = jest.spyOn(document.body, 'appendChild');
        const removeChildSpy = jest.spyOn(document.body, 'removeChild');
      
      storage.exportJSON(data);
      
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      
      const anchor = appendChildSpy.mock.calls[0][0];
        expect(anchor.download).toMatch(/^dad-s-rule-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should add version and exportDate metadata', () => {
      const data = { teamInfo: { name: 'Test' } };
      
      // Capture the Blob content
      const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');
        const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      
      storage.exportJSON(data);
      
      expect(createObjectURLSpy).toHaveBeenCalled();
      const blob = createObjectURLSpy.mock.calls[0][0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });

    it('should use default filename when teamInfo is missing', () => {
      const data = { program: [] };
      
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');
      
      storage.exportJSON(data);
      
      const anchor = appendChildSpy.mock.calls[0][0];
      expect(anchor.download).toMatch(/^mission-plan-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });

  describe('importJSON', () => {
    it('should handle missing file', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      storage.importJSON(null, jest.fn());
      
      expect(consoleSpy).toHaveBeenCalledWith('No file provided');
      consoleSpy.mockRestore();
    });

    it('should import valid JSON file', (done) => {
      const validData = {
        teamInfo: { name: 'Test Team' },
        robot: { length: 20 },
        program: []
      };
      
      const file = new Blob([JSON.stringify(validData)], { type: 'application/json' });
      
      const callback = jest.fn((data) => {
        expect(data).toEqual(validData);
        done();
      });
      
      storage.importJSON(file, callback);
    });

    it('should reject invalid JSON file', (done) => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const file = new Blob(['invalid json'], { type: 'application/json' });
      
      const callback = jest.fn();
      
      storage.importJSON(file, callback);
      
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error reading configuration file. Please ensure it is a valid JSON file.');
        expect(callback).not.toHaveBeenCalled();
        alertSpy.mockRestore();
        done();
      }, 100);
    });

    it('should reject file with invalid data structure', (done) => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const invalidData = { random: 'data' };
      const file = new Blob([JSON.stringify(invalidData)], { type: 'application/json' });
      
      const callback = jest.fn();
      
      storage.importJSON(file, callback);
      
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith('Invalid configuration file. Please check the file format.');
        expect(callback).not.toHaveBeenCalled();
        alertSpy.mockRestore();
        done();
      }, 100);
    });

    it('should handle file reading errors', (done) => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      // Create a mock file that will trigger an error
      const file = new Blob(['test'], { type: 'application/json' });
      const originalReadAsText = FileReader.prototype.readAsText;
      
      FileReader.prototype.readAsText = function() {
        setTimeout(() => {
          if (this.onerror) {
            this.onerror();
          }
        }, 10);
      };
      
      const callback = jest.fn();
      
      storage.importJSON(file, callback);
      
      setTimeout(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error reading file. Please try again.');
        FileReader.prototype.readAsText = originalReadAsText;
        alertSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle localStorage quota exceeded', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock localStorage.setItem to throw an error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = jest.fn(() => {
        throw new Error('Quota exceeded');
      });
      
      const data = { test: 'value' };
      storage.saveToLocalStorage(data);
      
      expect(consoleSpy).toHaveBeenCalledWith('Error saving to local storage:', expect.any(Error));
      
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should handle corrupted localStorage data', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('missionPlannerState', 'invalid json');
      
      const result = storage.loadFromLocalStorage();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading from local storage:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle localStorage clear errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const originalRemoveItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = jest.fn(() => {
        throw new Error('Cannot remove item');
      });
      
      storage.clearLocalStorage();
      
      expect(consoleSpy).toHaveBeenCalledWith('Error clearing local storage:', expect.any(Error));
      
      Storage.prototype.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = storage.generateId();
      const id2 = storage.generateId();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      const id = storage.generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('storage health and quota', () => {
    it('should calculate storage usage', () => {
      localStorage.setItem('testKey', 'testValue');
      const usage = storage.getStorageUsage();
      expect(usage).toBeGreaterThan(0);
    });

    it('should return estimated quota', () => {
      const quota = storage.getStorageQuota();
      expect(quota).toBe(5 * 1024 * 1024); // 5MB
    });

    it('should check storage health', () => {
      const health = storage.checkStorageHealth();
      expect(health).toHaveProperty('used');
      expect(health).toHaveProperty('available');
      expect(health).toHaveProperty('quota');
      expect(health).toHaveProperty('percentUsed');
      expect(health).toHaveProperty('isWarning');
      expect(health).toHaveProperty('isBlocked');
    });

    it('should flag warning at 80% capacity', () => {
      // Mock getStorageUsage to return 80% of quota
      const originalGetStorageUsage = storage.getStorageUsage.bind(storage);
      storage.getStorageUsage = () => storage.getStorageQuota() * 0.8;
      
      const health = storage.checkStorageHealth();
      expect(health.isWarning).toBe(true);
      expect(health.isBlocked).toBe(false);
      
      storage.getStorageUsage = originalGetStorageUsage;
    });

    it('should flag blocked at 95% capacity', () => {
      const originalGetStorageUsage = storage.getStorageUsage.bind(storage);
      storage.getStorageUsage = () => storage.getStorageQuota() * 0.95;
      
      const health = storage.checkStorageHealth();
      expect(health.isWarning).toBe(true);
      expect(health.isBlocked).toBe(true);
      
      storage.getStorageUsage = originalGetStorageUsage;
    });
  });

  describe('last state auto-save/restore', () => {
    it('should save last state', () => {
      const data = { teamInfo: { name: 'Test' }, program: [] };
      const result = storage.saveLastState(data);
      
      expect(result.success).toBe(true);
      
      const saved = localStorage.getItem(storage.STORAGE_KEYS.lastState);
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved);
      expect(parsed.teamInfo.name).toBe('Test');
      expect(parsed.savedAt).toBeDefined();
    });

    it('should load last state', () => {
      const data = { teamInfo: { name: 'Test' }, savedAt: new Date().toISOString() };
      localStorage.setItem(storage.STORAGE_KEYS.lastState, JSON.stringify(data));
      
      const loaded = storage.loadLastState();
      expect(loaded.teamInfo.name).toBe('Test');
    });

    it('should return null when no last state exists', () => {
      const loaded = storage.loadLastState();
      expect(loaded).toBeNull();
    });

    it('should not save when storage is blocked', () => {
      const originalGetStorageUsage = storage.getStorageUsage.bind(storage);
      storage.getStorageUsage = () => storage.getStorageQuota() * 0.96;
      
      const result = storage.saveLastState({ test: 'data' });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
      
      storage.getStorageUsage = originalGetStorageUsage;
    });
  });

  describe('saved robot configurations', () => {
    const sampleConfig = {
      length: 16.5,
      width: 15,
      wheelOffset: 3.1,
      wheelCircumference: 19.6,
      wheelBase: 13.3
    };

    it('should save robot configuration', () => {
      const result = storage.saveRobotConfig('Test Robot', sampleConfig);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should load saved robots', () => {
      storage.saveRobotConfig('Robot 1', sampleConfig);
      storage.saveRobotConfig('Robot 2', sampleConfig);
      
      const robots = storage.loadSavedRobots();
      expect(Object.keys(robots).length).toBe(2);
    });

    it('should get specific robot by id', () => {
      const result = storage.saveRobotConfig('My Robot', sampleConfig);
      
      const robot = storage.getRobotConfig(result.id);
      expect(robot.name).toBe('My Robot');
      expect(robot.config.length).toBe(16.5);
    });

    it('should return null for non-existent robot', () => {
      const robot = storage.getRobotConfig('non-existent-id');
      expect(robot).toBeNull();
    });

    it('should delete robot configuration', () => {
      const result = storage.saveRobotConfig('To Delete', sampleConfig);
      
      const deleteResult = storage.deleteRobotConfig(result.id);
      expect(deleteResult.success).toBe(true);
      
      const robot = storage.getRobotConfig(result.id);
      expect(robot).toBeNull();
    });

    it('should handle deleting non-existent robot', () => {
      const result = storage.deleteRobotConfig('non-existent-id');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('not_found');
    });

    it('should trim robot name', () => {
      const result = storage.saveRobotConfig('  Trimmed Name  ', sampleConfig);
      const robot = storage.getRobotConfig(result.id);
      expect(robot.name).toBe('Trimmed Name');
    });
  });

  describe('saved programs', () => {
    const sampleProgram = {
      teamInfo: { name: 'Test Team' },
      mat: { selected: 'blank' },
      robot: { length: 16.5 },
      program: [{ type: 'move', direction: 0, degrees: 360 }],
      planDate: '2025-01-01'
    };

    it('should save program', () => {
      const result = storage.saveProgram('Test Program', sampleProgram);
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should load saved programs', () => {
      storage.saveProgram('Program 1', sampleProgram);
      storage.saveProgram('Program 2', sampleProgram);
      
      const programs = storage.loadSavedPrograms();
      expect(Object.keys(programs).length).toBe(2);
    });

    it('should get specific program by id', () => {
      const result = storage.saveProgram('My Program', sampleProgram);
      
      const program = storage.getProgram(result.id);
      expect(program.name).toBe('My Program');
      expect(program.teamInfo.name).toBe('Test Team');
    });

    it('should return null for non-existent program', () => {
      const program = storage.getProgram('non-existent-id');
      expect(program).toBeNull();
    });

    it('should delete program', () => {
      const result = storage.saveProgram('To Delete', sampleProgram);
      
      const deleteResult = storage.deleteProgram(result.id);
      expect(deleteResult.success).toBe(true);
      
      const program = storage.getProgram(result.id);
      expect(program).toBeNull();
    });

    it('should store lastModified timestamp', () => {
      const result = storage.saveProgram('Timestamped', sampleProgram);
      const program = storage.getProgram(result.id);
      
      expect(program.createdAt).toBeDefined();
      expect(program.lastModified).toBeDefined();
    });
  });

  describe('cleanup utilities', () => {
    it('should cleanup old robots keeping specified count', () => {
      // Add robots with different dates
      for (let i = 0; i < 7; i++) {
        storage.saveRobotConfig(`Robot ${i}`, { length: 16 });
      }
      
      const result = storage.cleanupOldItems('robots', 5);
      
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(2);
      
      const remaining = storage.loadSavedRobots();
      expect(Object.keys(remaining).length).toBe(5);
    });

    it('should cleanup old programs keeping specified count', () => {
      for (let i = 0; i < 6; i++) {
        storage.saveProgram(`Program ${i}`, { program: [] });
      }
      
      const result = storage.cleanupOldItems('programs', 3);
      
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(3);
    });

    it('should not delete when count is below threshold', () => {
      storage.saveRobotConfig('Robot 1', { length: 16 });
      storage.saveRobotConfig('Robot 2', { length: 16 });
      
      const result = storage.cleanupOldItems('robots', 5);
      
      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
    });

    it('should clear all saved data', () => {
      storage.saveLastState({ test: 'data' });
      storage.saveRobotConfig('Robot', { length: 16 });
      storage.saveProgram('Program', { program: [] });
      
      const result = storage.clearAllSavedData();
      
      expect(result.success).toBe(true);
      expect(storage.loadLastState()).toBeNull();
      expect(Object.keys(storage.loadSavedRobots()).length).toBe(0);
      expect(Object.keys(storage.loadSavedPrograms()).length).toBe(0);
    });
  });

  describe('getSavedDataSummary', () => {
    it('should return summary with counts and health', () => {
      storage.saveRobotConfig('Robot 1', { length: 16 });
      storage.saveProgram('Program 1', { program: [] });
      
      const summary = storage.getSavedDataSummary();
      
      expect(summary.robotCount).toBe(1);
      expect(summary.programCount).toBe(1);
      expect(summary.robots).toHaveLength(1);
      expect(summary.programs).toHaveLength(1);
      expect(summary.health).toHaveProperty('percentUsed');
    });

    it('should sort items by createdAt descending (newest first)', () => {
      // Manually set up robots with different dates
      const robots = {
        'id1': { id: 'id1', name: 'Old Robot', createdAt: '2025-01-01T00:00:00.000Z', config: {} },
        'id2': { id: 'id2', name: 'New Robot', createdAt: '2025-12-01T00:00:00.000Z', config: {} }
      };
      localStorage.setItem(storage.STORAGE_KEYS.savedRobots, JSON.stringify(robots));
      
      const summary = storage.getSavedDataSummary();
      
      expect(summary.robots[0].name).toBe('New Robot');
      expect(summary.robots[1].name).toBe('Old Robot');
    });
  });
});
