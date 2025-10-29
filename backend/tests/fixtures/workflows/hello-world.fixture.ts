/**
 * Phase 1: Hello World Workflow Fixture
 *
 * Purpose: Simple linear workflow to test basic execution flow
 *
 * Flow:
 * 1. Input node - accepts a name
 * 2. Transform node - formats greeting message
 * 3. Output node - returns the formatted greeting
 *
 * Test scenarios:
 * - Happy path with valid name
 * - Empty name handling
 * - Special characters in name
 */

export const helloWorldWorkflow = {
    nodes: [
        {
            id: 'input-1',
            type: 'input',
            data: {
                label: 'Name Input',
                inputName: 'name',
                inputType: 'string',
                required: true,
                description: 'Enter your name for a personalized greeting',
                defaultValue: 'World'
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'transform-1',
            type: 'transform',
            data: {
                label: 'Format Greeting',
                operation: 'custom',
                inputData: '${name}',
                expression: '"Hello, " & $ & "! Welcome to FlowMaestro."',
                outputVariable: 'greeting'
            },
            position: { x: 100, y: 250 }
        },
        {
            id: 'output-1',
            type: 'output',
            data: {
                label: 'Greeting Output',
                outputName: 'message',
                value: '${greeting}',
                format: 'string'
            },
            position: { x: 100, y: 400 }
        }
    ],
    edges: [
        { id: 'e1', source: 'input-1', target: 'transform-1' },
        { id: 'e2', source: 'transform-1', target: 'output-1' }
    ]
};

export const helloWorldTestScenarios = {
    happyPath: {
        name: 'Happy Path',
        triggerType: 'manual',
        inputs: {
            name: 'Alice'
        },
        expectedOutput: {
            message: 'Hello, Alice! Welcome to FlowMaestro.'
        }
    },
    emptyName: {
        name: 'Empty Name',
        triggerType: 'manual',
        inputs: {
            name: ''
        },
        expectedOutput: {
            message: 'Hello, ! Welcome to FlowMaestro.'
        }
    },
    specialCharacters: {
        name: 'Special Characters',
        triggerType: 'manual',
        inputs: {
            name: 'José O\'Brien-Smith 🎉'
        },
        expectedOutput: {
            message: 'Hello, José O\'Brien-Smith 🎉! Welcome to FlowMaestro.'
        }
    },
    longName: {
        name: 'Long Name',
        triggerType: 'manual',
        inputs: {
            name: 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.'
        },
        expectedOutput: {
            message: 'Hello, Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.! Welcome to FlowMaestro.'
        }
    }
};
