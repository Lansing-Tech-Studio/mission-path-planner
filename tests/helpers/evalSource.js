const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Evaluates a source file in a jsdom window context
 * @param {Window} window - jsdom window object
 * @param {string} filePath - path to the JS file to evaluate
 */
function evalSourceInWindow(window, filePath) {
  const absolutePath = path.join(__dirname, '../../', filePath);
  const source = fs.readFileSync(absolutePath, 'utf-8');
  
    // Extract all class names from the source code
    const classMatches = source.match(/class\s+(\w+)/g) || [];
    const classNames = classMatches.map(match => match.replace('class ', ''));
  
    // Wrap source to expose all classes to window
    const wrappedSource = `
      ${source}
      ${classNames.map(name => `
        if (typeof ${name} !== 'undefined') {
          window.${name} = ${name};
        }
      `).join('\n')}
    `;
  
    // Execute in window context
    const func = new Function('window', 'document', wrappedSource + '\n//# sourceURL=' + filePath);
    func(window, window.document);
}

/**
 * Creates a minimal DOM with required elements for testing
 * @returns {JSDOM} jsdom instance
 */
function createMinimalDOM() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="programBlocks"></div>
        <input type="number" id="robotLength" value="16.5" />
        <input type="number" id="robotWidth" value="15" />
        <input type="number" id="wheelOffset" value="3.1" />
        <input type="number" id="wheelCircumference" value="19.6" />
        <input type="number" id="wheelBase" value="13.3" />
        <input type="text" id="robotImageUrl" value="" />
        <input type="number" id="startX" value="33" />
        <input type="number" id="startY" value="3.3" />
        <input type="number" id="startAngle" value="0" />
        <select id="matSelect"><option value="blank">Blank</option></select>
        <input type="text" id="customMatUrl" value="" />
        <select id="matAlignment"><option value="centered">Centered</option></select>
        <input type="text" id="teamName" value="Test Team" />
        <input type="text" id="teamLogo" value="" />
        <textarea id="description"></textarea>
        <input type="date" id="planDate" value="2025-01-01" />
        <canvas id="missionCanvas" width="800" height="600"></canvas>
      </body>
    </html>
  `;
  
  return new JSDOM(html, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });
}

module.exports = {
  evalSourceInWindow,
  createMinimalDOM
};
