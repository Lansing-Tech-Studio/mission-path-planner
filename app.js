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
        // Robot configuration changes
        const robotInputs = [
            'robotLength', 'robotWidth', 'wheelOffset', 
            'wheelCircumference', 'wheelBase', 'robotImageUrl',
            'startX', 'startY', 'startAngle'
        ];
        
        robotInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.update());
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
            '2024-submerged': 'https://firstinspiresst01.blob.core.windows.net/first-energize/fll-challenge/fll-challenge-2024-25-submerged-game-model.jpg',
            '2023-masterpiece': 'https://firstinspiresst01.blob.core.windows.net/first-energize/fll-challenge/fll-challenge-rgb-field-2022-2023.jpg'
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
                customUrl: document.getElementById('customMatUrl').value
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
