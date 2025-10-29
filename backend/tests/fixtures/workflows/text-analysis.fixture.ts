/**
 * Phase 3: Text Analysis Workflow Fixture
 *
 * Purpose: Test LLM integration, chat triggers, and AI-powered transformations
 *
 * Flow:
 * 1. Input node - accepts text content
 * 2. LLM node - performs sentiment analysis
 * 3. LLM node - extracts key topics
 * 4. Transform node - formats results into structured output
 * 5. Output node - returns analysis results
 *
 * Test scenarios:
 * - Positive sentiment text
 * - Negative sentiment text
 * - Neutral/mixed sentiment
 * - Chat trigger with conversation context
 * - Long text handling
 */

export const textAnalysisWorkflow = {
    nodes: [
        {
            id: 'input-1',
            type: 'input',
            data: {
                label: 'Text Content',
                inputName: 'text',
                inputType: 'string',
                required: true,
                description: 'Enter text to analyze for sentiment and topics',
                defaultValue: 'I love using FlowMaestro! It makes workflow automation so easy and intuitive.'
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'llm-1',
            type: 'llm',
            data: {
                label: 'Sentiment Analysis',
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                systemPrompt: 'You are a sentiment analysis expert. Analyze the sentiment of the given text and classify it as positive, negative, or neutral. Provide a confidence score (0-100) and a brief explanation.',
                prompt: 'Analyze the sentiment of this text:\n\n${text}\n\nProvide your response in JSON format:\n{\n  "sentiment": "positive|negative|neutral",\n  "confidence": 85,\n  "explanation": "brief explanation"\n}',
                maxTokens: 300,
                temperature: 0.1,
                outputVariable: 'sentimentAnalysis',
                responseFormat: 'json'
            },
            position: { x: 100, y: 300 }
        },
        {
            id: 'llm-2',
            type: 'llm',
            data: {
                label: 'Extract Topics',
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                systemPrompt: 'You are a topic extraction expert. Identify the main topics and themes in the given text. Extract 2-5 key topics.',
                prompt: 'Extract the main topics from this text:\n\n${text}\n\nProvide your response as a JSON array of strings:\n{\n  "topics": ["topic1", "topic2", "topic3"]\n}',
                maxTokens: 200,
                temperature: 0.2,
                outputVariable: 'topicExtraction',
                responseFormat: 'json'
            },
            position: { x: 300, y: 300 }
        },
        {
            id: 'transform-1',
            type: 'transform',
            data: {
                label: 'Format Analysis Results',
                operation: 'merge',
                inputData: '${sentimentAnalysis}',
                mergeData: '{"topics": ${topicExtraction.topics}, "originalText": "${text}", "analyzedAt": "${$now()}"}',
                outputVariable: 'analysisResults'
            },
            position: { x: 200, y: 500 }
        },
        {
            id: 'output-1',
            type: 'output',
            data: {
                label: 'Analysis Results',
                outputName: 'results',
                value: '${analysisResults}',
                format: 'json'
            },
            position: { x: 200, y: 650 }
        }
    ],
    edges: [
        { id: 'e1', source: 'input-1', target: 'llm-1' },
        { id: 'e2', source: 'input-1', target: 'llm-2' },
        { id: 'e3', source: 'llm-1', target: 'transform-1' },
        { id: 'e4', source: 'llm-2', target: 'transform-1' },
        { id: 'e5', source: 'transform-1', target: 'output-1' }
    ]
};

export const textAnalysisTestScenarios = {
    positiveSentiment: {
        name: 'Positive Sentiment',
        triggerType: 'manual',
        inputs: {
            text: 'I absolutely love using FlowMaestro! The interface is intuitive, the features are powerful, and the team is incredibly responsive. Best workflow tool I\'ve ever used!'
        },
        expectedOutput: {
            sentiment: 'positive',
            confidence: (val: number) => val > 70
        }
    },
    negativeSentiment: {
        name: 'Negative Sentiment',
        triggerType: 'manual',
        inputs: {
            text: 'This product is terrible. It crashes constantly, the documentation is confusing, and support never responds. Very disappointed and frustrated.'
        },
        expectedOutput: {
            sentiment: 'negative',
            confidence: (val: number) => val > 70
        }
    },
    neutralSentiment: {
        name: 'Neutral Sentiment',
        triggerType: 'manual',
        inputs: {
            text: 'The software has some useful features. Installation took about 15 minutes. The dashboard shows system metrics and logs.'
        },
        expectedOutput: {
            sentiment: 'neutral'
        }
    },
    chatTrigger: {
        name: 'Chat Trigger Analysis',
        triggerType: 'chat',
        config: {
            conversation: [
                {
                    role: 'user',
                    content: 'Can you analyze this customer feedback?',
                    waitForResponse: false
                },
                {
                    role: 'user',
                    content: 'The customer said: "Your service is okay but could be faster. The staff is friendly though."',
                    waitForResponse: true
                }
            ],
            contextVariables: {
                text: 'Your service is okay but could be faster. The staff is friendly though.'
            }
        },
        expectedOutput: {
            sentiment: ['neutral', 'positive'], // Could be either
            topicsInclude: ['service', 'staff']
        }
    },
    longText: {
        name: 'Long Text Analysis',
        triggerType: 'manual',
        inputs: {
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50) // 2500+ chars
        },
        performanceCheck: {
            maxDuration: 15000, // LLM calls can take time
            tokenUsage: (val: number) => val > 0
        }
    },
    parallelLLMCalls: {
        name: 'Parallel LLM Execution',
        description: 'Tests that llm-1 and llm-2 execute in parallel',
        triggerType: 'manual',
        inputs: {
            text: 'FlowMaestro enables teams to automate complex workflows using AI-powered tools and integrations.'
        },
        performanceCheck: {
            maxDuration: 8000 // Should be faster than sequential (which would be ~10-12s)
        }
    }
};

export const textAnalysisMockData = {
    positiveSentimentResponse: {
        sentiment: 'positive',
        confidence: 92,
        explanation: 'The text expresses strong positive emotions with words like "love", "intuitive", and "powerful".'
    },
    negativeSentimentResponse: {
        sentiment: 'negative',
        confidence: 88,
        explanation: 'The text contains multiple negative indicators like "terrible", "crashes", and "disappointed".'
    },
    topicsResponse: {
        topics: ['workflow automation', 'user interface', 'customer support', 'product quality']
    }
};
