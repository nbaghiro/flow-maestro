# FlowMaestro Integration Test Suite

## Overview

FlowMaestro's test suite validates realistic user workflows rather than targeting arbitrary code coverage percentages. The tests use mocked external APIs, an in-memory database, and run entirely in CI without external dependencies. This approach ensures that every test represents actual user scenarios while maintaining fast execution times.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- arxiv-researcher.test.ts

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Structure

The test suite is organized into three main categories:

```
tests/
├── fixtures/          # Test data and workflow definitions
│   └── workflows/     # Realistic workflow definitions
├── helpers/           # Test utilities
│   ├── mock-apis.ts   # External API mocking (nock/msw)
│   ├── test-server.ts # Fastify server setup
│   ├── test-temporal.ts # Temporal test environment
│   └── db-helpers.ts  # In-memory SQLite database
└── integration/       # Integration tests
    ├── workflows/     # End-to-end workflow tests
    ├── node-executors/ # Node executor tests
    └── api-endpoints/ # API endpoint tests
```

## Testing Philosophy

### Focus on Real-World Scenarios

FlowMaestro's testing approach prioritizes real-world usage patterns over code coverage metrics. Each test represents an actual workflow that users might build, ensuring that:

- **Node types are validated** through practical use cases rather than isolated unit tests
- **Tests serve as documentation** showing developers and users how workflows should be structured
- **Execution speed remains high** since no external services are involved
- **CI runs are reliable** without flaky network calls or rate limits

### Current Test Coverage

The test suite includes comprehensive coverage of core workflow types:

**Workflows:**
- ArXiv Paper Research Assistant (7/8 tests passing) - Demonstrates HTTP requests, XML parsing, PDF processing, and LLM integration
- Additional workflows planned for content summarization, data pipelines, conditional logic, and more

**Node Types:**
- HTTP Node - External API calls with various methods and authentication
- Transform Node - XML parsing, JSONata expressions, and custom transformations
- Variable Node - Workflow-level state management
- File Operations Node - PDF parsing and file handling
- LLM Node - Anthropic Claude integration with prompt handling
- Output Node - Result display and formatting
- Input Node, Conditional Node, Switch Node, Loop Node - In development

## Test Helpers

### MockAPIs

The MockAPIs helper provides pre-configured mocks for common external services, eliminating the need for real API keys or network calls:

```typescript
// Mock ArXiv API
MockAPIs.mockArxivSearch('machine learning', [/* papers */]);

// Mock PDF download
MockAPIs.mockPDFDownload('http://arxiv.org/pdf/123.pdf', 'PDF content');

// Mock LLM providers
MockAPIs.mockAnthropic('prompt', 'response');
MockAPIs.mockOpenAI('prompt', 'response');
MockAPIs.mockGoogleAI('prompt', 'response');
MockAPIs.mockCohere('prompt', 'response');

// Mock generic HTTP
MockAPIs.mockHTTP('https://api.example.com/data', 'GET', { data: 'value' });
```

### Database Helpers

Tests use an in-memory SQLite database for fast, isolated execution. The database is automatically cleaned between tests:

```typescript
// Seed test data
const user = seedTestUser({ email: 'test@example.com' });
const workflow = seedTestWorkflow({ user_id: user.id });

// Clean between tests (automatic)
clearTestData();
```

### Test Server

The test server provides a fully-functional Fastify instance with in-memory database:

```typescript
const server = await setupTestServer();
const token = generateTestToken(server, { id: 'user-1' });

// Make requests
const response = await server.inject({
    method: 'POST',
    url: '/api/workflows/execute',
    headers: { authorization: `Bearer ${token}` },
    payload: { workflowDefinition, inputs }
});
```

## Writing New Tests

### Creating Workflow Fixtures

Start by defining the workflow structure and any mock data needed:

```typescript
// tests/fixtures/workflows/my-workflow.fixture.ts
export const myWorkflowDefinition = {
    nodes: [/* ... */],
    edges: [/* ... */]
};

export const myWorkflowMockData = {
    // Mock responses for external APIs
};
```

### Writing Integration Tests

Integration tests execute nodes step-by-step, building context as they go:

```typescript
// tests/integration/workflows/my-workflow.test.ts
import { executeNode } from '../../../src/temporal/activities/node-executors';
import { MockAPIs } from '../../helpers/mock-apis';
import { myWorkflowDefinition, myWorkflowMockData } from '../../fixtures/workflows/my-workflow.fixture';

describe('My Workflow', () => {
    beforeAll(() => {
        process.env.REQUIRED_API_KEY = 'test-key';
    });

    beforeEach(() => {
        // Setup mocks
        MockAPIs.mockHTTP(/* ... */);
    });

    test('should complete successfully', async () => {
        const context = { input: 'value' };

        // Execute nodes step by step
        const result1 = await executeNode({
            nodeType: 'http',
            nodeConfig: myWorkflowDefinition.nodes[0].data,
            context
        });

        Object.assign(context, result1);

        // Continue with other nodes...

        // Assert final output
        expect(context).toHaveProperty('expectedOutput');
    });
});
```

## CI Integration

Tests run automatically in GitHub Actions without requiring any secrets or external service access:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    NODE_ENV: test
```

## Known Issues and Limitations

The test suite has a few known limitations being addressed:

- Variable interpolation in nested object paths needs additional debugging
- HTTP node returns data directly rather than using the `outputVariable` config
- LLM executor shows deprecated model warnings (cosmetic issue only)

## Contributing New Tests

When adding new node types or features, follow these guidelines:

1. **Create realistic workflows** that demonstrate the new functionality in a practical context
2. **Add comprehensive mocks** for any external APIs the node might call
3. **Follow established patterns** from existing tests for consistency
4. **Ensure tests are self-documenting** so they serve as examples for users

## Resources

- [Jest Documentation](https://jestjs.io/) - Test framework
- [Nock HTTP Mocking](https://github.com/nock/nock) - HTTP request interception
- [Supertest API Testing](https://github.com/visionmedia/supertest) - HTTP assertions
- [Temporal Testing](https://docs.temporal.io/typescript/testing) - Workflow testing patterns
