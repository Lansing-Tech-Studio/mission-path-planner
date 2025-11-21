/**
 * Copy Blockly files to vendor directory for GitHub Pages deployment
 * This ensures all necessary Blockly files are committed to the repository
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'node_modules', 'blockly');
const targetDir = path.join(__dirname, '..', 'vendor', 'blockly');

// Files to copy from Blockly package
const filesToCopy = [
    'blockly_compressed.js',
    'blocks_compressed.js',
    'javascript_compressed.js',
    'msg/en.js'
];

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
}

// Create msg subdirectory
const msgDir = path.join(targetDir, 'msg');
if (!fs.existsSync(msgDir)) {
    fs.mkdirSync(msgDir, { recursive: true });
    console.log(`Created directory: ${msgDir}`);
}

// Copy each file
filesToCopy.forEach(file => {
    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`Copied: ${file}`);
    } else {
        console.warn(`Warning: Source file not found: ${file}`);
    }
});

// Copy media directory
const mediaSource = path.join(sourceDir, 'media');
const mediaTarget = path.join(targetDir, 'media');

if (fs.existsSync(mediaSource)) {
    // Remove existing media directory if it exists
    if (fs.existsSync(mediaTarget)) {
        fs.rmSync(mediaTarget, { recursive: true, force: true });
    }
    
    // Copy media directory recursively
    copyDir(mediaSource, mediaTarget);
    console.log('Copied: media directory');
} else {
    console.warn('Warning: Media directory not found');
}

console.log('\nBlockly files copied successfully to vendor/blockly/');

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
