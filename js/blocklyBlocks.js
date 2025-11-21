/**
 * Custom Blockly Block Definitions for Mission Path Planner
 * Defines move blocks and text blocks with appropriate styling
 */

// Move Block Definition
Blockly.Blocks['mission_move'] = {
    init: function() {
        this.jsonInit({
            "type": "mission_move",
            "message0": "move %1 for %2 degrees",
            "args0": [
                {
                    "type": "field_number",
                    "name": "DIRECTION",
                    "value": 0,
                    "min": -100,
                    "max": 100,
                    "precision": 1
                },
                {
                    "type": "field_number",
                    "name": "DEGREES",
                    "value": 360,
                    "precision": 1
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": "#4CAF50",
            "tooltip": "Move the robot. Direction: -100 (left) to 100 (right), 0 is straight. Degrees: wheel rotation (negative for backward).",
            "helpUrl": ""
        });
    }
};

// Text Block Definition
Blockly.Blocks['mission_text'] = {
    init: function() {
        this.jsonInit({
            "type": "mission_text",
            "message0": "comment %1 %2 show position %3",
            "args0": [
                {
                    "type": "input_dummy"
                },
                {
                    "type": "field_input",
                    "name": "TEXT",
                    "text": ""
                },
                {
                    "type": "field_checkbox",
                    "name": "SHOW_POSITION",
                    "checked": false
                }
            ],
            "previousStatement": null,
            "nextStatement": null,
            "colour": "#9E9E9E",
            "tooltip": "Add a text comment or note. Check 'show position' to display robot position at this point.",
            "helpUrl": ""
        });
    }
};

/**
 * Initialize custom Blockly blocks
 * This function should be called after Blockly is loaded
 */
function initializeBlocklyBlocks() {
    // Blocks are already defined above when this script loads
    console.log('Custom Blockly blocks initialized');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initializeBlocklyBlocks };
}
