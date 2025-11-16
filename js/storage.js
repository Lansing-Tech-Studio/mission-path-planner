// Storage Management - JSON Import/Export
class StorageManager {
    constructor() {
        this.version = '1.0.0';
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
            console.log('Local storage cleared');
        } catch (error) {
            console.error('Error clearing local storage:', error);
        }
    }
}
