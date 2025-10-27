# FlowMaestro Integration Test Suite

## Overview

This is a comprehensive integration test suite for FlowMaestro that validates realistic user workflows rather than focusing on code coverage metrics. Tests use mocked external APIs, in-memory database, and run entirely in CI without external dependencies.

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

## Test Philosophy

### Focus on User Flows, Not Code Coverage

Instead of targeting arbitrary code coverage percentages, we focus on:
- **Realistic workflows**: Each test represents a real user workflow
- **All node types covered**: Tests exercise all node types through realistic use cases
- **Educational value**: Tests serve as working examples for users
- **Fast execution**: No external dependencies, runs in seconds

### Current Test Coverage

**Workflows:**
- ✅ ArXiv Paper Research Assistant (7/8 tests passing)
- ⏳ Content Summarizer (planned)
- ⏳ Data Processing Pipeline (planned)
- ⏳ Conditional Logic Workflow (planned)
- ⏳ Email Newsletter Generator (planned)
- ⏳ Code Documentation Generator (planned)
- ⏳ Personal Finance Tracker (planned)
- ⏳ Multi-step Web Scraping (planned)

**Node Types Tested:**
- ✅ HTTP Node
- ✅ Transform Node (parseXML, custom/JSONata)
- ✅ Variable Node
- ✅ File Operations Node (parsePDF)
- ✅ LLM Node (Anthropic)
- ✅ Output Node
- ⏳ Input Node
- ⏳ Conditional Node
- ⏳ Switch Node
- ⏳ Loop Node

## Test Helpers

### MockAPIs

Provides pre-configured mocks for external services:

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

In-memory SQLite for fast, isolated tests:

```typescript
// Seed test data
const user = seedTestUser({ email: 'test@example.com' });
const workflow = seedTestWorkflow({ user_id: user.id });

// Clean between tests (automatic)
clearTestData();
```

### Test Server

Fastify server with in-memory database:

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

### 1. Create Workflow Fixture

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

### 2. Write Integration Test

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

Tests run automatically in GitHub Actions:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    NODE_ENV: test
```

No real API keys or external services required!

## Known Issues

- [ ] Variable interpolation in nested object paths needs debugging
- [ ] HTTP node doesn't use `outputVariable` config (returns data directly)
- [ ] LLM executor uses deprecated model warning (cosmetic)

## Contributing

When adding new node types:
1. Create realistic workflow that uses the node
2. Add mock responses for any external APIs
3. Write integration test following the pattern above
4. Ensure test is self-documenting (serves as example)

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Nock (HTTP Mocking)](https://github.com/nock/nock)
- [Supertest (API Testing)](https://github.com/visionmedia/supertest)
- [Temporal Testing](https://docs.temporal.io/typescript/testing)
