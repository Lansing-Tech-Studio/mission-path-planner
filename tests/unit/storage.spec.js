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
});
