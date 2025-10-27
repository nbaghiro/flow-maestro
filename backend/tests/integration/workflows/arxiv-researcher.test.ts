import { executeNode } from '../../../src/temporal/activities/node-executors';
import { MockAPIs } from '../../helpers/mock-apis';
import { arxivResearcherWorkflow, arxivMockData } from '../../fixtures/workflows/arxiv-researcher.fixture';

/**
 * ArXiv Paper Research Assistant Workflow Integration Test
 *
 * This test validates the complete end-to-end workflow for researching academic papers:
 * - HTTP node calling ArXiv API
 * - Transform node parsing XML
 * - Transform node with JSONata extraction
 * - Variable node for data storage
 * - File operations node for PDF parsing
 * - LLM node for summarization
 * - Output node for results
 */

describe('ArXiv Paper Research Assistant Workflow', () => {
    beforeAll(() => {
        // Set required environment variables for testing
        process.env.ANTHROPIC_API_KEY = 'test-api-key';
        process.env.OPENAI_API_KEY = 'test-api-key';
    });

    beforeEach(() => {
        // Setup mocks for this workflow
        MockAPIs.mockHTTP(
            'http://export.arxiv.org/api/query?search_query=all:machine learning&start=0&max_results=5',
            'GET',
            arxivMockData.arxivXMLResponse
        );

        MockAPIs.mockPDFDownload(
            'http://arxiv.org/pdf/2401.12345',
            arxivMockData.pdfContent
        );

        MockAPIs.mockAnthropic(
            'summarize',
            arxivMockData.llmSummary
        );
    });

    describe('Full workflow execution', () => {
        test('should successfully research and summarize papers', async () => {
            const context: Record<string, any> = {
                topic: arxivMockData.topic
            };

            // Step 1: Execute HTTP node (ArXiv search)
            const httpResult = await executeNode({
                nodeType: 'http',
                nodeConfig: arxivResearcherWorkflow.nodes[1].data,
                context
            });

            expect(httpResult).toHaveProperty('data');
            expect(httpResult).toHaveProperty('status');
            // Wrap HTTP result in the expected variable name
            context.arxivResponse = httpResult;
            Object.assign(context, httpResult);

            // Step 2: Parse XML
            const parseXMLResult = await executeNode({
                nodeType: 'transform',
                nodeConfig: arxivResearcherWorkflow.nodes[2].data,
                context
            });

            expect(parseXMLResult).toHaveProperty('parsedResults');
            expect(parseXMLResult.parsedResults).toHaveProperty('feed');
            Object.assign(context, parseXMLResult);

            // Step 3: Extract paper info with JSONata
            const extractResult = await executeNode({
                nodeType: 'transform',
                nodeConfig: arxivResearcherWorkflow.nodes[3].data,
                context
            });

            expect(extractResult).toHaveProperty('firstPaper');
            expect(extractResult.firstPaper).toBeTruthy();
            // The JSONata expression should extract the first entry
            Object.assign(context, extractResult);

            // Step 4: Store PDF URL in variable
            // First, add a mock PDF URL to context for the variable node to use
            context.firstPaper = {
                ...context.firstPaper,
                link: [{ $: { href: 'http://arxiv.org/pdf/2401.12345' } }]
            };

            const variableResult = await executeNode({
                nodeType: 'variable',
                nodeConfig: arxivResearcherWorkflow.nodes[4].data,
                context
            });

            expect(variableResult).toHaveProperty('pdfUrl');
            Object.assign(context, variableResult);

            // Step 5: Download and parse PDF
            const pdfResult = await executeNode({
                nodeType: 'fileOperations',
                nodeConfig: arxivResearcherWorkflow.nodes[5].data,
                context
            });

            expect(pdfResult).toHaveProperty('pdfContent');
            expect(pdfResult.pdfContent).toHaveProperty('content');
            expect(pdfResult.pdfContent.content).toContain('deep learning');
            Object.assign(context, pdfResult);

            // Step 6: LLM summarization
            const llmResult = await executeNode({
                nodeType: 'llm',
                nodeConfig: arxivResearcherWorkflow.nodes[6].data,
                context
            });

            expect(llmResult).toHaveProperty('summary');
            expect(llmResult.summary).toHaveProperty('text');
            expect(llmResult.summary.text).toBeTruthy();
            Object.assign(context, llmResult);

            // Step 7: Generate output
            const outputResult = await executeNode({
                nodeType: 'output',
                nodeConfig: arxivResearcherWorkflow.nodes[7].data,
                context
            });

            expect(outputResult).toHaveProperty('outputs');
            expect(outputResult.outputs).toHaveProperty('results');

            const results = outputResult.outputs.results;
            expect(results).toHaveProperty('topic');
            expect(results).toHaveProperty('paperTitle');
            expect(results).toHaveProperty('summary');
            expect(results.topic).toBe(arxivMockData.topic);
        });

        test('should handle ArXiv API errors gracefully', async () => {
            // Mock API failure
            MockAPIs.cleanAll();
            MockAPIs.mockHTTP(
                'http://export.arxiv.org/api/query?search_query=all:machine learning&start=0&max_results=5',
                'GET',
                { error: 'Service unavailable' },
                503
            );

            const context: Record<string, any> = {
                topic: arxivMockData.topic
            };

            // HTTP executor returns 503 status but doesn't throw
            const result = await executeNode({
                nodeType: 'http',
                nodeConfig: arxivResearcherWorkflow.nodes[1].data,
                context
            });

            expect(result).toHaveProperty('status', 503);
            expect(result.data).toHaveProperty('error');
        });

        test('should handle PDF download failures', async () => {
            // Setup: get through to PDF download step
            const context: Record<string, any> = {
                topic: arxivMockData.topic,
                pdfUrl: 'http://arxiv.org/pdf/2401.12345'
            };

            // Mock PDF download failure
            MockAPIs.cleanAll();
            MockAPIs.mockHTTP(
                'http://arxiv.org/pdf/2401.12345',
                'GET',
                'Not Found',
                404
            );

            await expect(
                executeNode({
                    nodeType: 'fileOperations',
                    nodeConfig: arxivResearcherWorkflow.nodes[5].data,
                    context
                })
            ).rejects.toThrow();
        });
    });

    describe('Individual node validation', () => {
        test('should correctly parse ArXiv XML response', async () => {
            const context: Record<string, any> = {
                arxivResponse: {
                    data: arxivMockData.arxivXMLResponse
                }
            };

            const result = await executeNode({
                nodeType: 'transform',
                nodeConfig: {
                    operation: 'parseXML',
                    inputData: '${arxivResponse.data}',
                    outputVariable: 'parsed'
                },
                context
            });

            expect(result).toHaveProperty('parsed');
            expect(result.parsed).toHaveProperty('feed');
            expect(result.parsed.feed).toHaveProperty('entry');
        });

        test('should extract correct fields with JSONata', async () => {
            const context: Record<string, any> = {
                data: {
                    feed: {
                        entry: [{
                            title: ['Test Title'],
                            summary: ['Test Summary'],
                            link: [{
                                $: { href: 'http://test.pdf' }
                            }]
                        }]
                    }
                }
            };

            const result = await executeNode({
                nodeType: 'transform',
                nodeConfig: {
                    operation: 'custom',
                    inputData: '${data}',
                    expression: 'feed.entry[0].title[0]',
                    outputVariable: 'title'
                },
                context
            });

            expect(result.title).toBe('Test Title');
        });

        test('should interpolate variables correctly in LLM prompt', async () => {
            const context: Record<string, any> = {
                firstPaper: {
                    title: ['Machine Learning Paper'],
                    summary: ['Abstract of the paper']
                },
                pdfContent: {
                    content: 'Full text content here'
                }
            };

            const result = await executeNode({
                nodeType: 'llm',
                nodeConfig: {
                    provider: 'anthropic',
                    model: 'claude-3-5-sonnet-20241022',
                    prompt: 'Title: ${firstPaper.title[0]}\nAbstract: ${firstPaper.summary[0]}',
                    maxTokens: 100,
                    temperature: 0.3
                },
                context
            });

            expect(result).toHaveProperty('text');
            expect(result.text).toBeTruthy();
        });
    });

    describe('Error handling and edge cases', () => {
        test('should handle empty ArXiv search results', async () => {
            MockAPIs.cleanAll();
            MockAPIs.mockHTTP(
                'http://export.arxiv.org/api/query?search_query=all:nonexistenttopic&start=0&max_results=5',
                'GET',
                `<?xml version="1.0" encoding="UTF-8"?>
                <feed xmlns="http://www.w3.org/2005/Atom">
                  <title>ArXiv Query</title>
                </feed>`
            );

            const context: Record<string, any> = {
                topic: 'nonexistenttopic'
            };

            const result = await executeNode({
                nodeType: 'http',
                nodeConfig: {
                    url: 'http://export.arxiv.org/api/query?search_query=all:${topic}&start=0&max_results=5',
                    method: 'GET',
                    headers: []
                },
                context
            });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('status');
        });

        test('should handle malformed XML', async () => {
            const context: Record<string, any> = {
                arxivResponse: {
                    data: 'This is not XML'
                }
            };

            await expect(
                executeNode({
                    nodeType: 'transform',
                    nodeConfig: {
                        operation: 'parseXML',
                        inputData: '${arxivResponse.data}',
                        outputVariable: 'parsed'
                    },
                    context
                })
            ).rejects.toThrow();
        });
    });
});
