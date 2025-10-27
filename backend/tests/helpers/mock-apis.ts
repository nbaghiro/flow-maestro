import nock from 'nock';

/**
 * Mock API Helpers
 * Provides pre-configured mocks for external services
 */

export class MockAPIs {
    /**
     * Setup ArXiv API mock
     */
    static mockArxivSearch(query: string, papers: any[] = []) {
        const defaultPapers = papers.length > 0 ? papers : [{
            title: 'Sample Research Paper',
            summary: 'This is a sample abstract for testing purposes.',
            authors: ['John Doe', 'Jane Smith'],
            published: '2024-01-15',
            pdfUrl: 'http://arxiv.org/pdf/2401.12345'
        }];

        const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: ${query}</title>
  ${defaultPapers.map((paper, i) => `
  <entry>
    <id>http://arxiv.org/abs/2401.${12345 + i}</id>
    <title>${paper.title}</title>
    <summary>${paper.summary}</summary>
    ${paper.authors.map((author: string) => `<author><name>${author}</name></author>`).join('\n')}
    <published>${paper.published}</published>
    <link href="${paper.pdfUrl}" rel="related" type="application/pdf"/>
  </entry>
  `).join('\n')}
</feed>`;

        nock('http://export.arxiv.org')
            .get('/api/query')
            .query(true)
            .reply(200, xmlResponse, {
                'Content-Type': 'application/xml'
            });

        return defaultPapers;
    }

    /**
     * Mock PDF download
     */
    static mockPDFDownload(url: string, content: string = 'Sample PDF text content for testing.') {
        // Create a simple PDF buffer (not a real PDF, but sufficient for text extraction mock)
        const pdfBuffer = Buffer.from(content);

        nock(new URL(url).origin)
            .get(new URL(url).pathname)
            .reply(200, pdfBuffer, {
                'Content-Type': 'application/pdf'
            });

        return content;
    }

    /**
     * Mock OpenAI API
     */
    static mockOpenAI(prompt: string, response: string = 'This is a mocked OpenAI response.') {
        nock('https://api.openai.com')
            .post('/v1/chat/completions')
            .reply(200, {
                id: 'chatcmpl-test123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'gpt-4',
                choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: response
                    },
                    finish_reason: 'stop'
                }],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 20,
                    total_tokens: 30
                }
            });

        return response;
    }

    /**
     * Mock Anthropic API
     */
    static mockAnthropic(prompt: string, response: string = 'This is a mocked Claude response.') {
        nock('https://api.anthropic.com')
            .post('/v1/messages')
            .reply(200, {
                id: 'msg_test123',
                type: 'message',
                role: 'assistant',
                content: [{
                    type: 'text',
                    text: response
                }],
                model: 'claude-3-5-sonnet-20241022',
                stop_reason: 'end_turn',
                usage: {
                    input_tokens: 10,
                    output_tokens: 20
                }
            });

        return response;
    }

    /**
     * Mock Google AI API
     */
    static mockGoogleAI(prompt: string, response: string = 'This is a mocked Gemini response.') {
        nock('https://generativelanguage.googleapis.com')
            .post(/\/v1beta\/models\/.*:generateContent/)
            .reply(200, {
                candidates: [{
                    content: {
                        parts: [{
                            text: response
                        }],
                        role: 'model'
                    },
                    finishReason: 'STOP'
                }]
            });

        return response;
    }

    /**
     * Mock Cohere API
     */
    static mockCohere(prompt: string, response: string = 'This is a mocked Cohere response.') {
        nock('https://api.cohere.ai')
            .post('/v1/generate')
            .reply(200, {
                id: 'test-generation-id',
                generations: [{
                    id: 'test-gen-1',
                    text: response
                }],
                meta: {
                    api_version: {
                        version: '1'
                    }
                }
            });

        return response;
    }

    /**
     * Mock generic HTTP endpoint
     */
    static mockHTTP(url: string, method: string, responseData: any, statusCode: number = 200) {
        const urlObj = new URL(url);
        const scope = nock(urlObj.origin);

        const methodMap: any = {
            GET: 'get',
            POST: 'post',
            PUT: 'put',
            DELETE: 'delete',
            PATCH: 'patch'
        };

        scope[methodMap[method.toUpperCase()]](urlObj.pathname + urlObj.search)
            .reply(statusCode, responseData);

        return responseData;
    }

    /**
     * Mock RSS feed
     */
    static mockRSSFeed(url: string, items: any[] = []) {
        const defaultItems = items.length > 0 ? items : [{
            title: 'Sample Article',
            link: 'https://example.com/article-1',
            description: 'This is a sample article description.',
            pubDate: new Date().toISOString()
        }];

        const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>Test RSS Feed</description>
    ${defaultItems.map(item => `
    <item>
      <title>${item.title}</title>
      <link>${item.link}</link>
      <description>${item.description}</description>
      <pubDate>${item.pubDate}</pubDate>
    </item>
    `).join('\n')}
  </channel>
</rss>`;

        const urlObj = new URL(url);
        nock(urlObj.origin)
            .get(urlObj.pathname + urlObj.search)
            .reply(200, rssXml, {
                'Content-Type': 'application/rss+xml'
            });

        return defaultItems;
    }

    /**
     * Clean all mocks
     */
    static cleanAll() {
        nock.cleanAll();
    }

    /**
     * Enable/disable network connections
     */
    static disallowRealNetwork() {
        nock.disableNetConnect();
    }

    static allowRealNetwork() {
        nock.enableNetConnect();
    }
}

// Cleanup after each test
afterEach(() => {
    MockAPIs.cleanAll();
});

// Disallow real network requests by default
beforeAll(() => {
    MockAPIs.disallowRealNetwork();
});

afterAll(() => {
    MockAPIs.allowRealNetwork();
});
