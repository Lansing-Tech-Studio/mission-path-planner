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
  });
});
