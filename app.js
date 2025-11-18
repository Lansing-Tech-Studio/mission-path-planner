// Main application initialization and coordination
class MissionPlanner {
    constructor() {
        this.robot = null;
        this.canvas = null;
        this.blocks = null;
        this.pathCalculator = null;
        this.storage = null;
        this.print = null;
        
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
        
        // Initial render
        this.update();
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
        
        // Block management
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
