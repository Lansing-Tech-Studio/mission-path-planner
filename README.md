# Mission Path Planner

![CI](https://github.com/Lansing-Tech-Studio/mission-path-planner/actions/workflows/test.yml/badge.svg)

A web-based application for planning and visualizing robot paths for FIRST LEGO League (FLL) Challenge missions using Spike Prime robots.

## Features

- **Visual Path Planning**: Interactive canvas showing the FLL mat with real-time path visualization
- **Robot Configuration**: Customize robot dimensions, wheel specifications, and starting position
- **Block-Based Programming**: Simple programming interface with movement blocks (similar to Scratch)
- **Multiple Mat Support**: Choose from preset FLL Challenge mats or use custom images
- **Path Simulation**: Real-time visualization of robot movement including turning and straight paths
- **Export/Import**: Save and load configurations as JSON files
- **Print Support**: Generate printable plans with customizable dates for team documentation

## How to Use

### 1. Team Information

- Enter your team name, logo URL (optional), and plan description
- This information will appear on printed plans

### 2. Select Mission Mat

- Choose from preset FLL Challenge mats (2024 Submerged, 2023 Masterpiece)
- Or provide a custom mat image URL

### 3. Configure Your Robot

- **Length**: Total length of your robot (cm)
- **Width**: Total width of your robot (cm)
- **Wheel Offset**: Distance from back of robot to wheel axle (cm)
- **Wheel Circumference**: Circumference of your wheels (cm)
- **Wheel Base**: Distance between left and right wheel centers (cm)
  - Note: Wheel base must be at least 8 cm
- **Robot Image** (optional): URL to an image of your robot

### 4. Set Starting Position

- **X Position**: Horizontal starting position on mat (cm)
- **Y Position**: Vertical starting position on mat (cm)
- **Orientation**: Starting angle in degrees (0° = facing right/east)

### 5. Create Your Program

- **Text Block**: Add comments or pseudocode (not evaluated)
- **Move Block**: Simulate robot movement
  - **Direction**: -100 (sharp left) to +100 (sharp right), 0 = straight
  - **Degrees**: Amount of wheel rotation in degrees

### 6. Visualize and Export

- Path updates in real-time as you add/modify blocks
- Export your configuration as JSON for later use
- Print your plan with a date stamp for team records

## Movement System

The movement blocks simulate differential drive robot behavior:

- **Direction = 0**: Robot moves straight forward
- **Direction < 0**: Robot turns left (more negative = sharper turn)
- **Direction > 0**: Robot turns right (more positive = sharper turn)
- **Direction = ±100**: Robot pivots in place

The path calculation uses wheel circumference and wheel base to accurately simulate turning radius and path trajectory.

## Technical Details

- Pure JavaScript (no frameworks required)
- No server needed - runs entirely in the browser
- Compatible with GitHub Pages
- Canvas-based rendering for smooth visualization
- JSON-based configuration for easy sharing

## Testing

- **Install dependencies**: `npm ci`
- **Install Playwright browser (first time only)**: `npx playwright install chromium`
- **Run all unit tests**: `npm run test:unit`
- **Run all e2e tests**: `npm run test:e2e`
- **Run unit tests with coverage**: `npm run coverage`
- **Full CI-like run (unit + e2e)**: `npm run test:ci`

Coverage thresholds enforced by Jest:

- Branches: 60%
- Functions: 70%
- Lines: 75%
- Statements: 75%

## Development

- **Start local dev server**: `npm run dev`
  - Serves the app for manual testing and Playwright runs
  - Base URL typically `http://localhost:5173`

### Dev Container (Recommended)

The easiest way to get started is using a Dev Container. This works with VS Code, GitHub Codespaces, or any devcontainer-compatible IDE.

#### Prerequisites

- [Docker](https://www.docker.com/get-started) installed and running
- [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

#### Getting Started

1. Open the project folder in VS Code
2. When prompted, click "Reopen in Container" (or run the command `Dev Containers: Reopen in Container`)
3. Wait for the container to build and dependencies to install
4. Start developing! The dev server runs at `http://localhost:5173`

The container includes:

- Node.js 24
- Playwright browsers pre-installed
- Jest and Playwright VS Code extensions
- All system dependencies for running tests

#### Using GitHub Codespaces

1. Click the "Code" button on the GitHub repository
2. Select "Codespaces" tab
3. Click "Create codespace on main"
4. Once loaded, run `npm run dev` to start the dev server

### Linux Setup with Nix (Ubuntu 24.04+)

This project includes a Nix flake for automatic environment setup with the correct Node.js version. This is an alternative to using the Dev Container.

#### 1. Install Nix

```bash
# Install Nix package manager (multi-user installation recommended)
curl -fsSL https://install.determinate.systems/nix | sh -s -- install
```

#### 2. Install direnv

```bash
# Install direnv
sudo apt install direnv

# Add the hook to your shell (add to ~/.bashrc for bash)
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc

# Reload your shell
source ~/.bashrc
```

#### 3. Allow direnv in this project

```bash
# Navigate to the project directory
cd mission-path-planner

# Allow direnv to load the environment
direnv allow .
```

After running `direnv allow`, the environment will automatically load whenever you enter the project directory, providing the correct Node.js version and all system dependencies needed for Playwright browsers.

#### 4. First-time setup

When you first enter the project (or if `node_modules` doesn't exist), you'll see a reminder to run:

```bash
npm install
npx playwright install
```

#### 5. Configure VS Code Jest Extension (NixOS only)

If you're on NixOS and use the [Jest extension for VS Code](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest), you need to configure it to run Jest within the Nix environment since Node.js is provided by the flake rather than installed system-wide.

Create `.vscode/settings.json` with:

```json
{
  "jest.shell": {
    "path": "/absolute/path/to/mission-path-planner/.vscode/nix-shell.sh"
  },
  "jest.jestCommandLine": "npx jest"
}
```

Replace `/absolute/path/to/mission-path-planner` with the actual path to your project directory.

The `.vscode/settings.json` file is git-ignored since it contains machine-specific paths.

## File Structure

```text
mission-path-planner/
├── index.html             # Main HTML file
├── styles.css             # Styling
├── app.js                 # Main application logic
├── js/
│   ├── robot.js           # Robot configuration
│   ├── canvas.js          # Canvas rendering
│   ├── blocks.js          # Block editor
│   ├── pathCalculator.js  # Path calculation engine
│   ├── storage.js         # Import/export functionality
│   └── print.js           # Print functionality
└── README.md              # This file
```

## Deployment to GitHub Pages

1. Push this repository to GitHub
2. Go to repository Settings → Pages
3. Select branch (usually `main`) and root directory (`/`)
4. Save and wait for deployment
5. Access your app at `https://<username>.github.io/<repository-name>/`

## Browser Support

Works in all modern browsers that support:

- HTML5 Canvas
- ES6 JavaScript
- CSS Grid/Flexbox

## License

Licensed under the GNU General Public License v3.0 (GPL-3.0-only). See `LICENSE` for full terms.

- You may copy, modify, and distribute this project under GPLv3.
- Distributions and derivatives must remain under GPLv3 with source available.
- This software is provided without any warranty (see the license for details).

## Contributing

This is an educational tool for FLL teams. Suggestions and improvements are welcome!

## Tips for Teams

1. **Calibrate Your Robot**: Measure your robot carefully for accurate path simulation
2. **Test Real vs Simulated**: Compare simulated paths with actual robot behavior
3. **Save Iterations**: Export different versions as you refine your strategy
4. **Print for Meetings**: Use the print feature to document progress and share with mentors
5. **Custom Mats**: Take a photo of your practice mat for the most accurate planning

## Unit Conversion Reference

- 1 inch = 2.54 cm
- 1 cm = 0.3937 inches
- 1 LEGO stud = 0.8 cm
- standard FLL mat size (with 2 home areas) = 2360 × 1140 mm
- standard FLL table size (inner; exclusive of side/bumper pieces) = 93 in x 45 in = 2362.2 mm x 1143 mm
- Spike Prime wheel circumference (standard wheels) = 17.5 cm
- Spike Prime wheel circumference (large wheels) = 27.6 cm
- LEGO 62.4mm tire circumference = 19.6 cm
  - tire size is given as diameter; circumference = diameter × π
- rotations to degrees: 1 rotation = 360 degrees
- degrees to rotations: 1 degree = 1/360 rotations
- cm to rotations: rotations = distance(cm) / wheel circumference(cm)
- rotations to cm: distance(cm) = rotations × wheel circumference(cm)

## Support

For FLL-specific questions, refer to the official FIRST website: <https://www.firstinspires.org/>

---

Built for FLL Challenge teams to plan successful missions! 🤖
