/**
 * ArXiv Paper Research Assistant Workflow Fixture
 *
 * This workflow:
 * 1. Takes a research topic as input
 * 2. Searches ArXiv API for relevant papers
 * 3. Parses XML response
 * 4. Extracts paper metadata using JSONata
 * 5. Downloads first paper's PDF
 * 6. Uses LLM to summarize the paper
 * 7. Outputs research results
 */

export const arxivResearcherWorkflow = {
    nodes: [
        {
            id: 'input-1',
            type: 'input',
            data: {
                label: 'Research Topic',
                inputName: 'topic',
                inputType: 'string',
                required: true,
                description: 'The research topic to search for on ArXiv'
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'http-1',
            type: 'http',
            data: {
                label: 'Search ArXiv API',
                url: 'http://export.arxiv.org/api/query?search_query=all:${topic}&start=0&max_results=5',
                method: 'GET',
                headers: [],
                timeout: 10000,
                retries: 3,
                outputVariable: 'arxivResponse'
            },
            position: { x: 100, y: 200 }
        },
        {
            id: 'transform-1',
            type: 'transform',
            data: {
                label: 'Parse ArXiv XML',
                operation: 'parseXML',
                inputData: '${arxivResponse.data}',
                outputVariable: 'parsedResults'
            },
            position: { x: 100, y: 300 }
        },
        {
            id: 'transform-2',
            type: 'transform',
            data: {
                label: 'Extract Paper Info',
                operation: 'custom',
                inputData: '${parsedResults}',
                expression: 'feed.entry[0]',
                outputVariable: 'firstPaper'
            },
            position: { x: 100, y: 400 }
        },
        {
            id: 'variable-1',
            type: 'variable',
            data: {
                label: 'Extract PDF URL',
                operation: 'set',
                variableName: 'pdfUrl',
                value: '${firstPaper.link[0].$.href}',
                scope: 'workflow',
                valueType: 'string'
            },
            position: { x: 100, y: 500 }
        },
        {
            id: 'file-1',
            type: 'fileOperations',
            data: {
                label: 'Download & Parse PDF',
                operation: 'parsePDF',
                fileSource: 'url',
                filePath: '${pdfUrl}',
                outputVariable: 'pdfContent'
            },
            position: { x: 100, y: 600 }
        },
        {
            id: 'llm-1',
            type: 'llm',
            data: {
                label: 'Summarize Paper',
                provider: 'anthropic',
                model: 'claude-3-5-sonnet-20241022',
                systemPrompt: 'You are a research assistant that creates concise, clear summaries of academic papers.',
                prompt: 'Please summarize this academic paper:\n\nTitle: ${firstPaper.title[0]}\n\nAbstract: ${firstPaper.summary[0]}\n\nFull text (excerpt):\n${pdfContent.content}',
                maxTokens: 1000,
                temperature: 0.3,
                outputVariable: 'summary'
            },
            position: { x: 100, y: 700 }
        },
        {
            id: 'output-1',
            type: 'output',
            data: {
                label: 'Research Results',
                outputName: 'results',
                value: '{"topic": "${topic}", "paperTitle": "${firstPaper.title[0]}", "summary": "${summary.text}"}',
                format: 'json'
            },
            position: { x: 100, y: 800 }
        }
    ],
    edges: [
        { id: 'e1', source: 'input-1', target: 'http-1' },
        { id: 'e2', source: 'http-1', target: 'transform-1' },
        { id: 'e3', source: 'transform-1', target: 'transform-2' },
        { id: 'e4', source: 'transform-2', target: 'variable-1' },
        { id: 'e5', source: 'variable-1', target: 'file-1' },
        { id: 'e6', source: 'file-1', target: 'llm-1' },
        { id: 'e7', source: 'llm-1', target: 'output-1' }
    ]
};

export const arxivMockData = {
    topic: 'machine learning',
    arxivXMLResponse: `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: machine learning</title>
  <entry>
    <id>http://arxiv.org/abs/2401.12345</id>
    <title>Advanced Techniques in Deep Learning for Computer Vision</title>
    <summary>This paper explores novel approaches to improving deep learning models for computer vision tasks.</summary>
    <author><name>John Doe</name></author>
    <author><name>Jane Smith</name></author>
    <published>2024-01-15</published>
    <link href="http://arxiv.org/pdf/2401.12345" rel="related" type="application/pdf"/>
  </entry>
</feed>`,
    pdfContent: 'This is sample PDF text content for the research paper on deep learning and computer vision.',
    llmSummary: 'This paper introduces advanced deep learning techniques for computer vision, focusing on novel architectural improvements and training methodologies that enhance model performance.'
};
