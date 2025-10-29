/**
 * Phase 4: Smart Router Workflow Fixture
 *
 * Purpose: Test conditional logic, branching, and complex control flow
 *
 * Flow:
 * 1. Input node - accepts request type and data
 * 2. Conditional node - routes based on request type
 *    Branch A (data): HTTP fetch + Transform
 *    Branch B (analysis): LLM analysis + Transform
 * 3. Output node - returns processed result
 *
 * Test scenarios:
 * - Data request routing
 * - Analysis request routing
 * - Invalid request type
 * - Branch execution isolation (only one branch should execute)
 */

export const smartRouterWorkflow = {
    nodes: [
        {
            id: 'input-1',
            type: 'input',
            data: {
                label: 'Request Type',
                inputName: 'requestType',
                inputType: 'string',
                required: true,
                description: 'Type of request: "data" or "analysis"',
                defaultValue: 'data'
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'input-2',
            type: 'input',
            data: {
                label: 'Request Data',
                inputName: 'requestData',
                inputType: 'string',
                required: true,
                description: 'Data for the request (user ID for data, text for analysis)',
                defaultValue: '1'
            },
            position: { x: 300, y: 100 }
        },
        {
            id: 'conditional-1',
            type: 'conditional',
            data: {
                label: 'Route Request',
                condition: '${requestType} == "data"',
                description: 'Routes to data fetching or AI analysis based on request type'
            },
            position: { x: 200, y: 250 }
        },
        // Branch A: Data Processing
        {
            id: 'http-1',
            type: 'http',
            data: {
                label: '[Data] Fetch User',
                url: 'https://jsonplaceholder.typicode.com/users/${requestData}',
                method: 'GET',
                headers: [],
                timeout: 5000,
                retries: 2,
                outputVariable: 'fetchedData'
            },
            position: { x: 50, y: 400 }
        },
        {
            id: 'transform-1',
            type: 'transform',
            data: {
                label: '[Data] Format Response',
                operation: 'template',
                inputData: '${fetchedData.data}',
                expression: '{"type": "data", "result": ${fetchedData.data}, "processedBy": "http"}',
                outputVariable: 'processedData'
            },
            position: { x: 50, y: 550 }
        },
        // Branch B: AI Analysis
        {
            id: 'llm-1',
            type: 'llm',
            data: {
                label: '[Analysis] Analyze Text',
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                systemPrompt: 'You are a text analysis assistant. Analyze the given text and provide insights.',
                prompt: 'Analyze this text and provide key insights:\n\n${requestData}\n\nProvide response in JSON:\n{\n  "summary": "brief summary",\n  "wordCount": number,\n  "keyPoints": ["point1", "point2"]\n}',
                maxTokens: 500,
                temperature: 0.3,
                outputVariable: 'analysisResult',
                responseFormat: 'json'
            },
            position: { x: 350, y: 400 }
        },
        {
            id: 'transform-2',
            type: 'transform',
            data: {
                label: '[Analysis] Format Response',
                operation: 'template',
                inputData: '${analysisResult}',
                expression: '{"type": "analysis", "result": ${analysisResult}, "processedBy": "llm"}',
                outputVariable: 'processedAnalysis'
            },
            position: { x: 350, y: 550 }
        },
        // Merge point
        {
            id: 'variable-1',
            type: 'variable',
            data: {
                label: 'Set Final Result',
                operation: 'set',
                variableName: 'finalResult',
                value: '${processedData || processedAnalysis}',
                scope: 'workflow',
                valueType: 'object'
            },
            position: { x: 200, y: 700 }
        },
        {
            id: 'output-1',
            type: 'output',
            data: {
                label: 'Final Result',
                outputName: 'result',
                value: '${finalResult}',
                format: 'json'
            },
            position: { x: 200, y: 850 }
        }
    ],
    edges: [
        { id: 'e1', source: 'input-1', target: 'conditional-1' },
        { id: 'e2', source: 'input-2', target: 'conditional-1' },

        // Branch A (true branch)
        { id: 'e3', source: 'conditional-1', target: 'http-1', sourceHandle: 'true' },
        { id: 'e4', source: 'http-1', target: 'transform-1' },
        { id: 'e5', source: 'transform-1', target: 'variable-1' },

        // Branch B (false branch)
        { id: 'e6', source: 'conditional-1', target: 'llm-1', sourceHandle: 'false' },
        { id: 'e7', source: 'llm-1', target: 'transform-2' },
        { id: 'e8', source: 'transform-2', target: 'variable-1' },

        // Final output
        { id: 'e9', source: 'variable-1', target: 'output-1' }
    ]
};

export const smartRouterTestScenarios = {
    dataRoute: {
        name: 'Data Route (Branch A)',
        triggerType: 'manual',
        inputs: {
            requestType: 'data',
            requestData: '1'
        },
        expectedOutput: {
            type: 'data',
            processedBy: 'http',
            result: {
                id: 1
            }
        },
        executionChecks: {
            executedNodes: ['input-1', 'input-2', 'conditional-1', 'http-1', 'transform-1', 'variable-1', 'output-1'],
            skippedNodes: ['llm-1', 'transform-2']
        }
    },
    analysisRoute: {
        name: 'Analysis Route (Branch B)',
        triggerType: 'manual',
        inputs: {
            requestType: 'analysis',
            requestData: 'FlowMaestro is a powerful workflow automation platform that helps teams build and deploy AI-powered workflows.'
        },
        expectedOutput: {
            type: 'analysis',
            processedBy: 'llm',
            result: {
                summary: (val: string) => val.length > 0,
                wordCount: (val: number) => val > 0
            }
        },
        executionChecks: {
            executedNodes: ['input-1', 'input-2', 'conditional-1', 'llm-1', 'transform-2', 'variable-1', 'output-1'],
            skippedNodes: ['http-1', 'transform-1']
        }
    },
    webhookDataRoute: {
        name: 'Webhook Data Route',
        triggerType: 'webhook',
        config: {
            method: 'POST',
            headers: [
                { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
                requestType: 'data',
                requestData: '3'
            }
        },
        expectedOutput: {
            type: 'data',
            processedBy: 'http'
        }
    },
    webhookAnalysisRoute: {
        name: 'Webhook Analysis Route',
        triggerType: 'webhook',
        config: {
            method: 'POST',
            headers: [
                { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
                requestType: 'analysis',
                requestData: 'Artificial intelligence is transforming how we work.'
            }
        },
        expectedOutput: {
            type: 'analysis',
            processedBy: 'llm'
        }
    },
    branchIsolation: {
        name: 'Branch Isolation Test',
        description: 'Verifies that only the correct branch executes',
        triggerType: 'manual',
        inputs: {
            requestType: 'data',
            requestData: '2'
        },
        performanceCheck: {
            // If both branches ran, it would take much longer due to LLM call
            maxDuration: 3000
        },
        executionChecks: {
            variablesNotSet: ['analysisResult'], // Should not be set if data route taken
            variablesSet: ['fetchedData', 'processedData']
        }
    },
    switchRoutes: {
        name: 'Switch Between Routes',
        description: 'Tests multiple executions with different routes',
        scenarios: [
            {
                inputs: { requestType: 'data', requestData: '1' },
                expectedBranch: 'A'
            },
            {
                inputs: { requestType: 'analysis', requestData: 'test text' },
                expectedBranch: 'B'
            },
            {
                inputs: { requestType: 'data', requestData: '5' },
                expectedBranch: 'A'
            }
        ]
    }
};

export const smartRouterMockData = {
    userData: {
        id: 1,
        name: 'Leanne Graham',
        email: 'Sincere@april.biz'
    },
    analysisResult: {
        summary: 'The text discusses FlowMaestro as a workflow automation platform with AI capabilities.',
        wordCount: 15,
        keyPoints: [
            'Workflow automation platform',
            'AI-powered features',
            'Team collaboration'
        ]
    }
};
