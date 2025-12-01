// Main application initialization and coordination
class MissionPlanner {
    constructor() {
        this.robot = null;
        this.canvas = null;
        this.blocks = null;
        this.pathCalculator = null;
        this.storage = null;
        this.print = null;
        
        // Debounce timer for auto-save
        this.autoSaveTimer = null;
        this.autoSaveDelay = 500; // ms
        
        this.init();
    }
    
    init() {
        // Initialize all modules
        this.robot = new RobotConfig();
        this.canvas = new CanvasRenderer();
        this.blocks = new BlockManager();
        this.pathCalculator = new PathCalculator();
        this.storage = new StorageManager();
        this.print = new PrintManager();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Set default plan date to today
        document.getElementById('planDate').valueAsDate = new Date();
        
        // Setup panel resize functionality
        this.setupPanelResize();
        
        // Restore last state from localStorage
        this.restoreLastState();
        
        // Initial render
        this.update();
        
        // Update storage management UI
        this.updateStorageUI();
    }
    
    restoreLastState() {
        const lastState = this.storage.loadLastState();
        if (lastState) {
            console.log('Restoring last state from localStorage');
            this.loadData(lastState);
        }
    }
    
    autoSave() {
        // Clear any pending auto-save
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Debounce the save
        this.autoSaveTimer = setTimeout(() => {
            const result = this.storage.saveLastState(this.getData());
            if (result.isWarning) {
                this.showStorageWarning(result.percentUsed);
            }
        }, this.autoSaveDelay);
    }
    
    showStorageWarning(percentUsed) {
        // Only show warning once per session
        if (this._storageWarningShown) return;
        this._storageWarningShown = true;
        
        alert(`Storage is ${percentUsed}% full. Consider removing old saved robots or programs in the Setup tab > Storage Management section.`);
    }
    
    setupPanelResize() {
        const leftPanel = document.querySelector('.left-panel');
        const resizeHandle = document.querySelector('.resize-handle');
        const panelToggle = document.querySelector('.panel-toggle');
        
        if (!resizeHandle || !leftPanel || !panelToggle) return;
        
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        // Restore saved panel state
        const savedState = localStorage.getItem('missionPlanner_panelState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.collapsed) {
                    leftPanel.classList.add('collapsed');
                } else if (state.width) {
                    leftPanel.style.flexBasis = state.width + 'px';
                }
            } catch (e) {
                console.error('Failed to restore panel state:', e);
            }
        }
        
        // Save panel state
        const savePanelState = () => {
            const isCollapsed = leftPanel.classList.contains('collapsed');
            const width = parseInt(leftPanel.style.flexBasis) || 320;
            localStorage.setItem('missionPlanner_panelState', JSON.stringify({
                collapsed: isCollapsed,
                width: width
            }));
        };
        
        // Toggle panel collapse
        const togglePanel = () => {
            leftPanel.classList.toggle('collapsed');
            savePanelState();
            
            // Update canvas size after transition
            setTimeout(() => {
                if (this.canvas) {
                    this.canvas.updateCanvasSize();
                }
            }, 250);
        };
        
        // Panel toggle button click
        panelToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel();
        });
        
        // Keyboard shortcut: Ctrl+B to toggle panel
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                togglePanel();
            }
        });
        
        // Mouse resize handlers
        const onMouseDown = (e) => {
            // Ignore if clicking on toggle button
            if (e.target === panelToggle) return;
            
            isResizing = true;
            startX = e.clientX;
            startWidth = leftPanel.getBoundingClientRect().width;
            
            leftPanel.classList.add('resizing');
            resizeHandle.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        };
        
        const onMouseMove = (e) => {
            if (!isResizing) return;
            
            const delta = e.clientX - startX;
            let newWidth = startWidth + delta;
            
            // Clamp width between min and max
            newWidth = Math.max(200, Math.min(600, newWidth));
            
            leftPanel.style.flexBasis = newWidth + 'px';
            
            // Update canvas size during resize
            if (this.canvas) {
                this.canvas.updateCanvasSize();
            }
        };
        
        const onMouseUp = () => {
            if (!isResizing) return;
            
            isResizing = false;
            leftPanel.classList.remove('resizing');
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            savePanelState();
        };
        
        resizeHandle.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // Touch support
        resizeHandle.addEventListener('touchstart', (e) => {
            if (e.target === panelToggle) return;
            
            const touch = e.touches[0];
            isResizing = true;
            startX = touch.clientX;
            startWidth = leftPanel.getBoundingClientRect().width;
            
            leftPanel.classList.add('resizing');
            resizeHandle.classList.add('dragging');
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            
            const touch = e.touches[0];
            const delta = touch.clientX - startX;
            let newWidth = startWidth + delta;
            
            newWidth = Math.max(200, Math.min(600, newWidth));
            leftPanel.style.flexBasis = newWidth + 'px';
            
            if (this.canvas) {
                this.canvas.updateCanvasSize();
            }
        }, { passive: true });
        
        document.addEventListener('touchend', () => {
            if (!isResizing) return;
            
            isResizing = false;
            leftPanel.classList.remove('resizing');
            resizeHandle.classList.remove('dragging');
            
            savePanelState();
        });
    }
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and content
                document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.querySelector(`.tab-content[data-tab="${targetTab}"]`).classList.add('active');
            });
        });
        
        // Section collapse/expand functionality
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                section.classList.toggle('collapsed');
                
                // Change icon from minus to plus and vice versa
                const icon = header.querySelector('.collapse-icon');
                if (section.classList.contains('collapsed')) {
                    icon.textContent = '+';
                } else {
                    icon.textContent = '−';
                }
            });
        });
        
        // Robot preset selection
        const robotPreset = document.getElementById('robotPreset');
        if (robotPreset) {
            robotPreset.addEventListener('change', () => {
                if (robotPreset.value) {
                    this.robot.loadPreset(robotPreset.value);
                    this.update();
                }
            });
        }
        
        // Robot configuration changes
        const robotInputs = [
            'robotLength', 'robotWidth', 'wheelOffset', 
            'wheelCircumference', 'wheelBase', 'robotImageUrl',
            'startX', 'startY', 'startAngle'
        ];
        
        robotInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    // Reset preset selection when manual changes are made
                    if (robotPreset) {
                        robotPreset.value = '';
                    }
                    this.update();
                });
            }
        });
        
        // Mat selection
        const matSelect = document.getElementById('matSelect');
        const customMatUrlGroup = document.getElementById('customMatUrlGroup');
        const customMatUrl = document.getElementById('customMatUrl');
        
        matSelect.addEventListener('change', () => {
            if (matSelect.value === 'custom') {
                customMatUrlGroup.style.display = 'block';
            } else {
                customMatUrlGroup.style.display = 'none';
                this.update();
            }
        });
        
        customMatUrl.addEventListener('input', () => this.update());
        
        // Mat alignment
        const matAlignment = document.getElementById('matAlignment');
        if (matAlignment) {
            matAlignment.addEventListener('change', () => this.update());
        }
        
        // Block management (Program tab)
        document.getElementById('addTextBlock').addEventListener('click', () => {
            this.blocks.addTextBlock();
            this.update();
        });
        
        document.getElementById('addMoveBlock').addEventListener('click', () => {
            this.blocks.addMoveBlock();
            this.update();
        });
        
        // Storage and print
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.storage.exportJSON(this.getData());
        });
        
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.storage.importJSON(e.target.files[0], (data) => {
                this.loadData(data);
                this.update();
            });
        });
        
        document.getElementById('printBtn').addEventListener('click', () => {
            this.print.printPlan(this.getData(), this.canvas.canvas);
        });
        
        // Save/Load Robot Config
        const saveRobotBtn = document.getElementById('saveRobotBtn');
        if (saveRobotBtn) {
            saveRobotBtn.addEventListener('click', () => this.saveCurrentRobot());
        }
        
        const savedRobots = document.getElementById('savedRobots');
        if (savedRobots) {
            savedRobots.addEventListener('change', () => {
                if (savedRobots.value) {
                    this.loadSavedRobot(savedRobots.value);
                    savedRobots.value = ''; // Reset dropdown
                }
            });
        }
        
        // Save/Load Program
        const saveProgramBtn = document.getElementById('saveProgramBtn');
        if (saveProgramBtn) {
            saveProgramBtn.addEventListener('click', () => this.saveCurrentProgram());
        }
        
        const savedPrograms = document.getElementById('savedPrograms');
        if (savedPrograms) {
            savedPrograms.addEventListener('change', () => {
                if (savedPrograms.value) {
                    this.loadSavedProgram(savedPrograms.value);
                    savedPrograms.value = ''; // Reset dropdown
                }
            });
        }
        
        // Storage Management - Clear All
        const clearStorageBtn = document.getElementById('clearStorageBtn');
        if (clearStorageBtn) {
            clearStorageBtn.addEventListener('click', () => this.clearAllSavedData());
        }
        
        // Storage Management - Delete buttons (event delegation)
        document.addEventListener('click', (e) => {
            const deleteRobotBtn = e.target.closest('.delete-robot-btn');
            const deleteProgramBtn = e.target.closest('.delete-program-btn');
            
            if (deleteRobotBtn) {
                e.preventDefault();
                this.deleteSavedRobot(deleteRobotBtn.dataset.id);
            } else if (deleteProgramBtn) {
                e.preventDefault();
                this.deleteSavedProgram(deleteProgramBtn.dataset.id);
            }
        });
    }
    
    update() {
        // Get current configuration
        const robotConfig = this.robot.getConfig();
        const matUrl = this.getMatUrl();
        const program = this.blocks.getProgram();
        
        // Update mat alignment
        const matAlignment = document.getElementById('matAlignment').value || 'centered';
        this.canvas.updateMatAlignment(matAlignment);
        
        // Calculate path
        const path = this.pathCalculator.calculatePath(program, robotConfig);
        
        // Render on canvas
        this.canvas.render(matUrl, robotConfig, path);
        
        // Auto-save current state
        this.autoSave();
    }
    
    getMatUrl() {
        const matSelect = document.getElementById('matSelect').value;
        
        if (matSelect === 'custom') {
            return document.getElementById('customMatUrl').value;
        }
        
        // Preset mat URLs (these would be actual image URLs in production)
        const matUrls = {
            'blank': '',
            '2025-unearthed': 'img/2025-unearthed.jpeg',
            '2024-submerged': 'img/2024-submerged.jpeg',
            '2023-masterpiece': 'img/2023-masterpiece.jpeg'
        };
        
        return matUrls[matSelect] || '';
    }
    
    getData() {
        return {
            teamInfo: {
                name: document.getElementById('teamName').value,
                logo: document.getElementById('teamLogo').value,
                description: document.getElementById('description').value
            },
            mat: {
                selected: document.getElementById('matSelect').value,
                customUrl: document.getElementById('customMatUrl').value,
                alignment: document.getElementById('matAlignment').value
            },
            robot: this.robot.getConfig(),
            program: this.blocks.getProgram(),
            planDate: document.getElementById('planDate').value
        };
    }
    
    loadData(data) {
        if (data.teamInfo) {
            document.getElementById('teamName').value = data.teamInfo.name || '';
            document.getElementById('teamLogo').value = data.teamInfo.logo || '';
            document.getElementById('description').value = data.teamInfo.description || '';
        }
        
        if (data.mat) {
            document.getElementById('matSelect').value = data.mat.selected || 'blank';
            document.getElementById('customMatUrl').value = data.mat.customUrl || '';
            document.getElementById('matAlignment').value = data.mat.alignment || 'centered';
            
            if (data.mat.selected === 'custom') {
                document.getElementById('customMatUrlGroup').style.display = 'block';
            }
        }
        
        if (data.robot) {
            this.robot.loadConfig(data.robot);
        }
        
        if (data.program) {
            this.blocks.loadProgram(data.program);
        }
        
        if (data.planDate) {
            document.getElementById('planDate').value = data.planDate;
        }
    }
    
    // ========== Robot Config Save/Load ==========
    
    saveCurrentRobot() {
        const name = prompt('Enter a name for this robot configuration:');
        if (!name || !name.trim()) {
            return;
        }
        
        const config = this.robot.getConfig();
        const result = this.storage.saveRobotConfig(name, config);
        
        if (result.success) {
            alert(`Robot "${name}" saved successfully!`);
            this.updateStorageUI();
            if (result.isWarning) {
                this.showStorageWarning(result.percentUsed);
            }
        } else if (result.reason === 'quota_exceeded') {
            alert(`Cannot save: Storage is ${result.percentUsed}% full. Please remove some saved items first.`);
        } else {
            alert('Failed to save robot configuration.');
        }
    }
    
    loadSavedRobot(id) {
        const saved = this.storage.getRobotConfig(id);
        if (saved) {
            this.robot.loadConfig(saved.config);
            // Clear preset selection since we're loading a custom config
            const robotPreset = document.getElementById('robotPreset');
            if (robotPreset) {
                robotPreset.value = '';
            }
            this.update();
        }
    }
    
    deleteSavedRobot(id) {
        const saved = this.storage.getRobotConfig(id);
        if (saved && confirm(`Delete robot "${saved.name}"?`)) {
            this.storage.deleteRobotConfig(id);
            this.updateStorageUI();
        }
    }
    
    // ========== Program Save/Load ==========
    
    saveCurrentProgram() {
        const name = prompt('Enter a name for this program:');
        if (!name || !name.trim()) {
            return;
        }
        
        const data = this.getData();
        const result = this.storage.saveProgram(name, data);
        
        if (result.success) {
            alert(`Program "${name}" saved successfully!`);
            this.updateStorageUI();
            if (result.isWarning) {
                this.showStorageWarning(result.percentUsed);
            }
        } else if (result.reason === 'quota_exceeded') {
            alert(`Cannot save: Storage is ${result.percentUsed}% full. Please remove some saved items first.`);
        } else {
            alert('Failed to save program.');
        }
    }
    
    loadSavedProgram(id) {
        const saved = this.storage.getProgram(id);
        if (saved) {
            this.loadData(saved);
            this.update();
        }
    }
    
    deleteSavedProgram(id) {
        const saved = this.storage.getProgram(id);
        if (saved && confirm(`Delete program "${saved.name}"?`)) {
            this.storage.deleteProgram(id);
            this.updateStorageUI();
        }
    }
    
    // ========== Storage Management UI ==========
    
    updateStorageUI() {
        const summary = this.storage.getSavedDataSummary();
        
        // Update saved robots dropdown
        this.updateSavedRobotsDropdown(summary.robots);
        
        // Update saved programs dropdown
        this.updateSavedProgramsDropdown(summary.programs);
        
        // Update storage management section
        this.updateStorageManagement(summary);
    }
    
    updateSavedRobotsDropdown(robots) {
        const dropdown = document.getElementById('savedRobots');
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">-- Load Saved Robot --</option>';
        robots.forEach(robot => {
            const option = document.createElement('option');
            option.value = robot.id;
            option.textContent = robot.name;
            dropdown.appendChild(option);
        });
    }
    
    updateSavedProgramsDropdown(programs) {
        const dropdown = document.getElementById('savedPrograms');
        if (!dropdown) return;
        
        dropdown.innerHTML = '<option value="">-- Load Saved Program --</option>';
        programs.forEach(program => {
            const option = document.createElement('option');
            option.value = program.id;
            option.textContent = program.name;
            dropdown.appendChild(option);
        });
    }
    
    updateStorageManagement(summary) {
        // Update usage bar
        const usageBar = document.getElementById('storageUsageBar');
        const usageText = document.getElementById('storageUsageText');
        
        if (usageBar && usageText) {
            const percent = summary.health.percentUsed;
            usageBar.style.width = `${Math.min(100, percent)}%`;
            usageBar.className = 'storage-usage-bar' + (summary.health.isWarning ? ' storage-warning' : '');
            
            const usedKB = (summary.health.used / 1024).toFixed(1);
            const quotaKB = (summary.health.quota / 1024).toFixed(0);
            usageText.textContent = `${usedKB} KB / ${quotaKB} KB (${percent}%)`;
        }
        
        // Update saved robots list
        const robotsList = document.getElementById('savedRobotsList');
        if (robotsList) {
            if (summary.robots.length === 0) {
                robotsList.innerHTML = '<p class="empty-list">No saved robots</p>';
            } else {
                robotsList.innerHTML = summary.robots.map(robot => `
                    <div class="saved-item" data-id="${robot.id}">
                        <span class="saved-item-name">${this.escapeHtml(robot.name)}</span>
                        <span class="saved-item-date">${new Date(robot.createdAt).toLocaleDateString()}</span>
                        <button class="btn-icon delete-robot-btn" data-id="${robot.id}" title="Delete">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                `).join('');
            }
        }
        
        // Update saved programs list
        const programsList = document.getElementById('savedProgramsList');
        if (programsList) {
            if (summary.programs.length === 0) {
                programsList.innerHTML = '<p class="empty-list">No saved programs</p>';
            } else {
                programsList.innerHTML = summary.programs.map(program => `
                    <div class="saved-item" data-id="${program.id}">
                        <span class="saved-item-name">${this.escapeHtml(program.name)}</span>
                        <span class="saved-item-date">${new Date(program.createdAt).toLocaleDateString()}</span>
                        <button class="btn-icon delete-program-btn" data-id="${program.id}" title="Delete">
                            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                        </button>
                    </div>
                `).join('');
            }
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    clearAllSavedData() {
        if (confirm('Are you sure you want to delete ALL saved robots and programs? This cannot be undone.')) {
            this.storage.clearAllSavedData();
            this.updateStorageUI();
            alert('All saved data has been cleared.');
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.missionPlanner = new MissionPlanner();
});

// Expose for browser global & Node (tests)
if (typeof window !== 'undefined') {
    window.MissionPlanner = MissionPlanner;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionPlanner;
}
