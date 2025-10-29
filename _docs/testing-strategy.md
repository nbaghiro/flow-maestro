# FlowMaestro Testing Strategy

## Overview

FlowMaestro employs a comprehensive testing strategy that combines developer-focused integration tests with user-focused workflow execution tests. Tests use mocked external APIs, an in-memory database, and run entirely in CI without external dependencies, ensuring fast execution while validating realistic user scenarios.

---

## Testing Philosophy

### Focus on Real-World Scenarios

FlowMaestro's testing approach prioritizes real-world usage patterns over code coverage metrics. Each test represents an actual workflow that users might build, ensuring that:

- **Node types are validated** through practical use cases rather than isolated unit tests
- **Tests serve as documentation** showing developers and users how workflows should be structured
- **Execution speed remains high** since no external services are involved
- **CI runs are reliable** without flaky network calls or rate limits

### Progressive Complexity Approach

Tests are designed in progressive phases that increase in complexity:

```
Phase 1 (Basic)
  ↓ Learn: Basic execution, transforms, outputs
Phase 2 (Intermediate)
  ↓ Add: HTTP requests, parallel execution, error handling
Phase 3 (Intermediate)
  ↓ Add: LLM integration, AI workflows, chat triggers
Phase 4 (Advanced)
  ↓ Add: Conditional logic, branching, route isolation
```

This allows developers and users to:
1. Build confidence with simple workflows first
2. Understand each new concept before adding complexity
3. Debug issues in isolation
4. Progressively test more advanced features

---

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

---

## Test Structure

The test suite is organized into three main categories:

```
tests/
├── fixtures/          # Test data and workflow definitions
│   └── workflows/     # Realistic workflow definitions
│       ├── index.ts                      # Central exports
│       ├── seed-workflows.ts             # Seed script
│       ├── hello-world.fixture.ts        # Phase 1: Basic
│       ├── data-enrichment.fixture.ts    # Phase 2: HTTP & parallel
│       ├── text-analysis.fixture.ts      # Phase 3: LLM integration
│       ├── smart-router.fixture.ts       # Phase 4: Conditional logic
│       └── arxiv-researcher.fixture.ts   # Advanced workflow
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

---

## Test Workflows

### Phase 1: Hello World ⭐
**File:** `backend/tests/fixtures/workflows/hello-world.fixture.ts`

**Purpose:** Basic linear execution testing

**Nodes:** Input → Transform → Output

**Test Scenarios:**
- Happy path with valid name
- Empty name handling
- Special characters in name
- Long name handling

**Validates:**
- Basic workflow execution flow
- Input node functionality
- Transform node operations
- Output node formatting
- Variable interpolation `${variable}`
- String manipulation
- Execution logs generation
- Timeline visualization
- Results panel display

**Duration:** < 1 second
**Credentials:** None required

---

### Phase 2: Data Enrichment ⭐⭐
**File:** `backend/tests/fixtures/workflows/data-enrichment.fixture.ts`

**Purpose:** HTTP requests and parallel execution

**Nodes:** Input → 2x HTTP (parallel) → Transform → Merge → Output

**Test Scenarios:**
- Valid user data fetch
- Webhook trigger execution
- Invalid user ID (404 error)
- Parallel execution verification

**Validates:**
- HTTP node execution
- External API integration
- Parallel node execution (2 simultaneous HTTP calls)
- Data transformation and merging
- JSON response handling
- Network requests tracking
- Webhook trigger functionality
- Error handling (404 responses)
- Retry logic
- Performance (parallel vs sequential)

**Duration:** 2-3 seconds
**Credentials:** None (uses JSONPlaceholder API)

---

### Phase 3: Text Analysis ⭐⭐
**File:** `backend/tests/fixtures/workflows/text-analysis.fixture.ts`

**Purpose:** LLM integration and AI workflows

**Nodes:** Input → 2x LLM (parallel) → Transform → Output

**Test Scenarios:**
- Positive sentiment analysis
- Negative sentiment analysis
- Neutral sentiment analysis
- Chat trigger with conversation context
- Long text handling
- Empty text handling

**Validates:**
- LLM node execution (Anthropic Claude)
- AI credential management
- Parallel LLM calls
- JSON response format from LLM
- Sentiment analysis accuracy
- Topic extraction
- Data merging from multiple LLM calls
- Chat trigger functionality
- Long text handling
- Token usage tracking

**Duration:** 5-8 seconds
**Credentials:** Anthropic API key required

---

### Phase 4: Smart Router ⭐⭐⭐
**File:** `backend/tests/fixtures/workflows/smart-router.fixture.ts`

**Purpose:** Conditional logic and branching

**Nodes:** Input → Conditional → Branch A (HTTP) OR Branch B (LLM) → Output

**Test Scenarios:**
- Data route (Branch A) execution
- Analysis route (Branch B) execution
- Webhook with data route
- Webhook with analysis route
- Branch isolation verification (only one executes)
- Performance check (confirms single branch)

**Validates:**
- Conditional node logic
- Branch execution (only one branch runs)
- Route isolation (Branch A doesn't execute if Branch B chosen)
- Variable coalescing (`${var1 || var2}`)
- HTTP branch path
- LLM branch path
- Performance verification
- Multiple execution paths
- Complex control flow

**Duration:** 3-8 seconds (varies by branch)
**Credentials:** Anthropic API key (for analysis branch)

---

### Advanced: ArXiv Researcher ⭐⭐⭐
**File:** `backend/tests/fixtures/workflows/arxiv-researcher.fixture.ts`

**Purpose:** Complex multi-step workflow

**Nodes:** 8 nodes including API, XML parsing, file operations, LLM

**Test Scenarios:**
- Complete research workflow
- Search query with results
- PDF download and parsing
- LLM analysis
- Error handling

**Validates:**
- HTTP node with ArXiv API
- Transform node (XML parsing, JSONata)
- Variable node for state management
- File operations node (PDF parsing)
- LLM node (Claude integration)
- Output node formatting
- Multi-step orchestration
- Complex data transformations

**Duration:** 10-15 seconds
**Credentials:** Anthropic API key

---

## Test Infrastructure

### Test Helpers

#### MockAPIs
**File:** `backend/tests/helpers/mock-apis.ts`

Provides pre-configured mocks for common external services, eliminating the need for real API keys or network calls:

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

#### Database Helpers
**File:** `backend/tests/helpers/db-helpers.ts`

Tests use an in-memory SQLite database for fast, isolated execution. The database is automatically cleaned between tests:

```typescript
// Seed test data
const user = seedTestUser({ email: 'test@example.com' });
const workflow = seedTestWorkflow({ user_id: user.id });

// Clean between tests (automatic)
clearTestData();
```

#### Test Server
**File:** `backend/tests/helpers/test-server.ts`

Provides a fully-functional Fastify instance with in-memory database:

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

#### Temporal Test Environment
**File:** `backend/tests/helpers/test-temporal.ts`

In-memory Temporal environment for testing:
- No external Temporal server required
- Uses `@temporalio/testing` package
- Supports worker creation with test activities

---

### Seeding Test Workflows

#### Seed Script
**File:** `backend/tests/fixtures/workflows/seed-workflows.ts`

**Features:**
- Converts fixture format to database format
- Inserts all test workflows into database
- CLI with user ID parameter
- Beautiful console output with progress
- Error handling and validation

**Usage:**
```bash
npm run seed:test-workflows -- --user-id=<uuid>
```

#### Fixtures Index
**File:** `backend/tests/fixtures/workflows/index.ts`

**Features:**
- Central export of all test workflows
- Utility functions for filtering by complexity
- Testing order management
- Metadata about each workflow

---

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

export const myWorkflowTestScenarios = [
    {
        name: "Happy path test",
        triggerType: "manual",
        inputs: { /* ... */ },
        expectedOutput: { /* ... */ }
    }
];
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

---

## Node Type Coverage

### Currently Tested

**AI/ML Nodes:**
- `llm` - Anthropic Claude integration with prompt handling
- `vision` - In development
- `audio` - In development
- `embeddings` - In development

**HTTP Nodes:**
- `http` - External API calls with various methods and authentication

**Data Nodes:**
- `transform` - XML parsing, JSONata expressions, and custom transformations
- `variable` - Workflow-level state management
- `input` - Workflow input handling
- `output` - Result display and formatting
- `fileOperations` - PDF parsing and file handling

**Logic Nodes:**
- `conditional` - Branching logic tested
- `switch` - In development
- `loop` - In development
- `code` - In development
- `wait` - In development

**Integration Nodes:**
- `database` - In development
- `integration` - In development

**User Interaction:**
- `user-input` - Human-in-the-loop (in development)

---

## Test Scenario Format

Each workflow includes test scenarios with comprehensive metadata:

```typescript
{
  name: string,                    // Scenario name
  triggerType: 'manual' | 'webhook' | 'chat' | ...,
  inputs?: Record<string, any>,    // For manual trigger
  config?: {...},                  // For webhook/chat trigger
  expectedOutput?: any,            // Expected results
  expectedError?: boolean,         // Should it fail?
  performanceCheck?: {...},        // Duration expectations
  executionChecks?: {...}          // Node execution verification
}
```

---

## Trigger Type Coverage

The test scenarios cover multiple trigger types:

- ✅ **Manual Trigger:** All phases (primary testing method)
- ✅ **Webhook Trigger:** Phases 2, 4 (HTTP simulation)
- ✅ **Chat Trigger:** Phase 3 (conversational workflows)
- ⏳ **API Trigger:** Not yet implemented in UI
- ⏳ **Form Trigger:** Not yet implemented in UI
- ⏳ **Scheduled Trigger:** Not yet implemented in UI
- ⏳ **File Upload Trigger:** Not yet implemented in UI
- ⏳ **Event Trigger:** Not yet implemented in UI

---

## CI Integration

Tests run automatically in GitHub Actions without requiring any secrets or external service access:

```yaml
- name: Run Integration Tests
  run: npm run test:integration
  env:
    NODE_ENV: test
```

---

## User-Facing Workflow Testing

### Testing Checklist

Users should progressively test workflows in the UI:

**Phase 1: Basic Execution**
- [ ] Test with valid name
- [ ] Test with special characters
- [ ] Test with empty string
- [ ] Verify execution logs
- [ ] Verify timeline visualization

**Phase 2: HTTP & Parallel**
- [ ] Test with valid user ID
- [ ] Test webhook trigger
- [ ] Test error handling (invalid ID)
- [ ] Verify parallel execution performance

**Phase 3: LLM Integration**
- [ ] Test positive sentiment (requires Anthropic key)
- [ ] Test negative sentiment
- [ ] Test chat trigger
- [ ] Verify token tracking

**Phase 4: Conditional Logic**
- [ ] Test data route (Branch A)
- [ ] Test analysis route (Branch B)
- [ ] Verify branch isolation
- [ ] Check performance (only one branch runs)

### Monitoring & Debugging Features

When testing workflows in the UI, users can leverage:

**Real-time Monitoring:**
- Live execution progress
- Node-by-node status updates
- Timeline visualization
- Output preview

**Debugging Tools:**
- Execution logs with timestamps
- Variable values at each step
- Error messages and stack traces
- Network request inspection
- Token usage tracking (LLM nodes)

**Results Inspection:**
- Structured output display
- JSON/object exploration
- Success/failure indicators
- Performance metrics

---

## Known Issues and Limitations

The test suite has a few known limitations being addressed:

- Variable interpolation in nested object paths needs additional debugging
- HTTP node returns data directly rather than using the `outputVariable` config
- LLM executor shows deprecated model warnings (cosmetic issue only)

---

## Contributing New Tests

When adding new node types or features, follow these guidelines:

1. **Create realistic workflows** that demonstrate the new functionality in a practical context
2. **Add comprehensive mocks** for any external APIs the node might call
3. **Follow established patterns** from existing tests for consistency
4. **Ensure tests are self-documenting** so they serve as examples for users
5. **Add test scenarios** covering happy path, error cases, and edge cases
6. **Update this document** with new coverage information

---

## Future Enhancements

### Test Fixtures
- [ ] Add more advanced patterns (loops, switches)
- [ ] Add database integration workflow
- [ ] Add file upload workflow
- [ ] Add error recovery workflow
- [ ] Add long-running workflow example

### Tooling
- [ ] Automated test runner (run all scenarios)
- [ ] Test result comparison (expected vs actual)
- [ ] Performance benchmarking tools
- [ ] Test coverage reporting
- [ ] CI/CD integration for regression testing

### UI Improvements
- [ ] Implement remaining trigger types (API, Form, Scheduled, etc.)
- [ ] Add test scenario templates
- [ ] Add test scenario import/export
- [ ] Add visual regression testing
- [ ] Add test scenario sharing

---

## Resources

- [Jest Documentation](https://jestjs.io/) - Test framework
- [Nock HTTP Mocking](https://github.com/nock/nock) - HTTP request interception
- [Supertest API Testing](https://github.com/visionmedia/supertest) - HTTP assertions
- [Temporal Testing](https://docs.temporal.io/typescript/testing) - Workflow testing patterns

---

## Summary

FlowMaestro's testing strategy combines:

**Developer-Focused Testing:**
- Integration tests with mocked dependencies
- In-memory database and Temporal environment
- Fast, reliable CI execution
- Comprehensive test helpers and utilities

**User-Focused Testing:**
- Progressive complexity workflow fixtures
- Real-world scenario validation
- UI-based execution testing
- Comprehensive monitoring and debugging tools

This dual approach ensures both code quality and user experience are thoroughly validated before deployment.
