// Storage Management - JSON Import/Export and Browser Persistence
class StorageManager {
    constructor() {
        this.version = '1.0.0';
        
        // Storage key constants
        this.STORAGE_KEYS = {
            lastState: 'missionPlanner_lastState',
            savedRobots: 'missionPlanner_savedRobots',
            savedPrograms: 'missionPlanner_savedPrograms'
        };
        
        // Storage thresholds (percentage)
        this.WARNING_THRESHOLD = 80;
        this.BLOCK_THRESHOLD = 95;
    }
    
    // ========== UUID Generation ==========
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    
    exportJSON(data) {
        // Add metadata
        const exportData = {
            version: this.version,
            exportDate: new Date().toISOString(),
            ...data
        };
        
        // Convert to JSON string
        const jsonString = JSON.stringify(exportData, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        
        // Generate filename with team name and date
        const teamName = data.teamInfo?.name || 'mission-plan';
        const date = new Date().toISOString().split('T')[0];
        a.download = `${this.sanitizeFilename(teamName)}-${date}.json`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        console.log('Configuration exported successfully');
    }
    
    importJSON(file, callback) {
        if (!file) {
            console.error('No file provided');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data
                if (this.validateImportData(data)) {
                    callback(data);
                    console.log('Configuration imported successfully');
                } else {
                    alert('Invalid configuration file. Please check the file format.');
                    console.error('Invalid import data structure');
                }
            } catch (error) {
                alert('Error reading configuration file. Please ensure it is a valid JSON file.');
                console.error('Error parsing JSON:', error);
            }
        };
        
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
            console.error('File reading error');
        };
        
        reader.readAsText(file);
    }
    
    validateImportData(data) {
        // Basic validation of data structure
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Check for required top-level properties
        const hasBasicStructure = (
            data.hasOwnProperty('teamInfo') ||
            data.hasOwnProperty('robot') ||
            data.hasOwnProperty('program')
        );
        
        return hasBasicStructure;
    }
    
    sanitizeFilename(filename) {
        // Remove or replace characters that are invalid in filenames
        return filename
            .replace(/[^a-z0-9]/gi, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase()
            .substring(0, 50) || 'mission-plan';
    }
    
    // Local storage methods for auto-save (optional feature)
    saveToLocalStorage(data) {
        try {
            localStorage.setItem('missionPlannerState', JSON.stringify(data));
            console.log('State saved to local storage');
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('missionPlannerState');
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading from local storage:', error);
        }
        return null;
    }
    
    clearLocalStorage() {
        try {
            localStorage.removeItem('missionPlannerState');
            // Also clear new storage keys for backward compatibility
            localStorage.removeItem(this.STORAGE_KEYS.lastState);
            console.log('Local storage cleared');
        } catch (error) {
            console.error('Error clearing local storage:', error);
        }
    }
    
    // ========== Storage Health & Quota Management ==========
    
    getStorageUsage() {
        let totalSize = 0;
        try {
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage.getItem(key).length * 2; // UTF-16 = 2 bytes per char
                }
            }
        } catch (error) {
            console.error('Error calculating storage usage:', error);
        }
        return totalSize;
    }
    
    getStorageQuota() {
        // Most browsers have 5-10MB limit. We estimate 5MB to be conservative.
        return 5 * 1024 * 1024; // 5MB in bytes
    }
    
    checkStorageHealth() {
        const used = this.getStorageUsage();
        const quota = this.getStorageQuota();
        const percentUsed = Math.round((used / quota) * 100);
        
        return {
            used,
            available: quota - used,
            quota,
            percentUsed,
            isWarning: percentUsed >= this.WARNING_THRESHOLD,
            isBlocked: percentUsed >= this.BLOCK_THRESHOLD
        };
    }
    
    // ========== Last State (Auto-save/restore) ==========
    
    saveLastState(data) {
        try {
            const health = this.checkStorageHealth();
            if (health.isBlocked) {
                console.warn('Storage quota exceeded. Auto-save disabled.');
                return { success: false, reason: 'quota_exceeded' };
            }
            
            const stateData = {
                version: this.version,
                savedAt: new Date().toISOString(),
                ...data
            };
            
            localStorage.setItem(this.STORAGE_KEYS.lastState, JSON.stringify(stateData));
            return { success: true, isWarning: health.isWarning, percentUsed: health.percentUsed };
        } catch (error) {
            console.error('Error saving last state:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    loadLastState() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.lastState);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading last state:', error);
        }
        return null;
    }
    
    // ========== Saved Robot Configurations ==========
    
    saveRobotConfig(name, config) {
        try {
            const health = this.checkStorageHealth();
            if (health.isBlocked) {
                return { success: false, reason: 'quota_exceeded', percentUsed: health.percentUsed };
            }
            
            const savedRobots = this.loadSavedRobots();
            const id = this.generateId();
            
            savedRobots[id] = {
                id,
                name: name.trim(),
                createdAt: new Date().toISOString(),
                config: {
                    length: config.length,
                    width: config.width,
                    wheelOffset: config.wheelOffset,
                    wheelCircumference: config.wheelCircumference,
                    wheelBase: config.wheelBase,
                    imageUrl: config.imageUrl || ''
                }
            };
            
            localStorage.setItem(this.STORAGE_KEYS.savedRobots, JSON.stringify(savedRobots));
            return { success: true, id, isWarning: health.isWarning, percentUsed: health.percentUsed };
        } catch (error) {
            console.error('Error saving robot config:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    loadSavedRobots() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.savedRobots);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading saved robots:', error);
        }
        return {};
    }
    
    getRobotConfig(id) {
        const savedRobots = this.loadSavedRobots();
        return savedRobots[id] || null;
    }
    
    deleteRobotConfig(id) {
        try {
            const savedRobots = this.loadSavedRobots();
            if (savedRobots[id]) {
                delete savedRobots[id];
                localStorage.setItem(this.STORAGE_KEYS.savedRobots, JSON.stringify(savedRobots));
                return { success: true };
            }
            return { success: false, reason: 'not_found' };
        } catch (error) {
            console.error('Error deleting robot config:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    // ========== Saved Programs ==========
    
    saveProgram(name, fullState) {
        try {
            const health = this.checkStorageHealth();
            if (health.isBlocked) {
                return { success: false, reason: 'quota_exceeded', percentUsed: health.percentUsed };
            }
            
            const savedPrograms = this.loadSavedPrograms();
            const id = this.generateId();
            
            savedPrograms[id] = {
                id,
                name: name.trim(),
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                version: this.version,
                teamInfo: fullState.teamInfo || {},
                mat: fullState.mat || {},
                robot: fullState.robot || {},
                program: fullState.program || [],
                planDate: fullState.planDate || ''
            };
            
            localStorage.setItem(this.STORAGE_KEYS.savedPrograms, JSON.stringify(savedPrograms));
            return { success: true, id, isWarning: health.isWarning, percentUsed: health.percentUsed };
        } catch (error) {
            console.error('Error saving program:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    loadSavedPrograms() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.savedPrograms);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading saved programs:', error);
        }
        return {};
    }
    
    getProgram(id) {
        const savedPrograms = this.loadSavedPrograms();
        return savedPrograms[id] || null;
    }
    
    deleteProgram(id) {
        try {
            const savedPrograms = this.loadSavedPrograms();
            if (savedPrograms[id]) {
                delete savedPrograms[id];
                localStorage.setItem(this.STORAGE_KEYS.savedPrograms, JSON.stringify(savedPrograms));
                return { success: true };
            }
            return { success: false, reason: 'not_found' };
        } catch (error) {
            console.error('Error deleting program:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    // ========== Cleanup Utilities ==========
    
    cleanupOldItems(type, keepCount = 5) {
        try {
            const key = type === 'robots' ? this.STORAGE_KEYS.savedRobots : this.STORAGE_KEYS.savedPrograms;
            const data = localStorage.getItem(key);
            if (!data) return { success: true, deleted: 0 };
            
            const items = JSON.parse(data);
            const itemArray = Object.values(items);
            
            if (itemArray.length <= keepCount) {
                return { success: true, deleted: 0 };
            }
            
            // Sort by createdAt ascending (oldest first)
            itemArray.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
            // Calculate how many to delete
            const deleteCount = itemArray.length - keepCount;
            const toDelete = itemArray.slice(0, deleteCount);
            
            // Remove oldest items
            toDelete.forEach(item => {
                delete items[item.id];
            });
            
            localStorage.setItem(key, JSON.stringify(items));
            return { success: true, deleted: deleteCount, deletedIds: toDelete.map(i => i.id) };
        } catch (error) {
            console.error('Error cleaning up old items:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    clearAllSavedData() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.lastState);
            localStorage.removeItem(this.STORAGE_KEYS.savedRobots);
            localStorage.removeItem(this.STORAGE_KEYS.savedPrograms);
            // Also clear legacy key
            localStorage.removeItem('missionPlannerState');
            return { success: true };
        } catch (error) {
            console.error('Error clearing all saved data:', error);
            return { success: false, reason: 'error', error };
        }
    }
    
    // Get summary of all saved data for UI display
    getSavedDataSummary() {
        const robots = this.loadSavedRobots();
        const programs = this.loadSavedPrograms();
        const health = this.checkStorageHealth();
        
        return {
            robots: Object.values(robots).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            programs: Object.values(programs).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            robotCount: Object.keys(robots).length,
            programCount: Object.keys(programs).length,
            health
        };
    }
}

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
}
