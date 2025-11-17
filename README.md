# FLL Mission Path Planner

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

This project is created for FLL teams to help with mission planning. Feel free to use and modify as needed.

## Contributing

This is an educational tool for FLL teams. Suggestions and improvements are welcome!

## Tips for Teams

1. **Calibrate Your Robot**: Measure your robot carefully for accurate path simulation
2. **Test Real vs Simulated**: Compare simulated paths with actual robot behavior
3. **Save Iterations**: Export different versions as you refine your strategy
4. **Print for Meetings**: Use the print feature to document progress and share with mentors
5. **Custom Mats**: Take a photo of your practice mat for the most accurate planning

## Support

For FLL-specific questions, refer to the official FIRST website: <https://www.firstinspires.org/>

---

Built for FLL Challenge teams to plan successful missions! 🤖
