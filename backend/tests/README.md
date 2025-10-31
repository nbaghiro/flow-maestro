# FlowMaestro Integration Testing

This directory contains comprehensive integration tests for FlowMaestro workflows.

## Test Infrastructure Built

### 1. Test Helpers (`tests/helpers/`)
- **DatabaseHelper.ts**: Database operations, test data seeding, cleanup
- **TestConnectionFactory.ts**: Creates mock connections (OpenAI, Anthropic, Slack, etc.)
- **WorkflowTestHarness.ts**: Executes workflows via Temporal and validates results
- **TemporalWorkerHelper.ts**: Helper for starting/stopping Temporal workers (not currently used)

### 2. Test Fixtures (`tests/fixtures/`)
- **workflows/**: JSON workflow definitions for testing
- **documents/**: Sample files (PDFs, CSVs) for file operation tests (to be added)
- **responses/**: Mock API responses for deterministic tests (to be added)

### 3. Test Setup (`jest.setup.ts`)
- PostgreSQL connection pool
- Test environment variables
- Encryption key for connections
- Global test utilities

## Prerequisites

Before running integration tests, ensure these services are running:

### 1. Docker Services
```bash
npm run docker:up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Temporal Server (port 7233)
- Temporal UI (http://localhost:8088)

### 2. Temporal Worker
In a separate terminal, start the Temporal worker:
```bash
cd backend
npm run worker:orchestrator:dev
```

The worker must be running because workflows are executed on the real Temporal server, not mocked.

## Running Tests

### Run all integration tests:
```bash
npm test
```

### Run specific workflow test:
```bash
npm test -- tests/integration/workflows/01-http-transform-database.test.ts
```

### Run specific test case:
```bash
npm test -- tests/integration/workflows/01-http-transform-database.test.ts --testNamePattern="should fetch user from API"
```

### Run with coverage:
```bash
npm run test:coverage
```

## Test Workflows

### Workflow 1: HTTP + Transform + Database
**File**: `tests/integration/workflows/01-http-transform-database.test.ts`

**What it tests**:
- HTTP executor (fetching from JSONPlaceholder API)
- Transform executor (JSONata data transformation)
- Database executor (PostgreSQL insert operations)
- Variable passing between nodes
- Error handling (404 responses)

**Workflow flow**:
1. Input (userId)
2. HTTP Request → Fetch user data from API
3. Transform → Extract and map fields
4. Database → Insert into PostgreSQL
5. Output → Return stored data

**Test cases**:
- ✅ Fetch user from API, transform, and store
- ✅ Handle different user IDs
- ✅ Handle HTTP errors gracefully (404)
- ✅ Store multiple users correctly
- ✅ Complete within reasonable time (<15s)

## Writing New Tests

### Step 1: Create workflow fixture
Create a JSON file in `tests/fixtures/workflows/`:

```json
{
    "name": "My Test Workflow",
    "description": "Description of what this tests",
    "entryPoint": "input-1",
    "nodes": {
        "input-1": {
            "type": "input",
            "name": "Start",
            "config": {},
            "position": { "x": 100, "y": 100 }
        },
        "node-2": {
            "type": "http",
            "name": "Fetch Data",
            "config": {
                "method": "GET",
                "url": "https://api.example.com/data",
                "outputVariable": "result"
            },
            "position": { "x": 300, "y": 100 }
        }
    },
    "edges": [
        {
            "id": "e1",
            "source": "input-1",
            "target": "node-2"
        }
    ]
}
```

### Step 2: Create test file
Create a test file in `tests/integration/workflows/`:

```typescript
import { Pool } from "pg";
import { getGlobalTestPool, getGlobalDbHelper } from "../../../jest.setup";
import { DatabaseHelper } from "../../helpers/DatabaseHelper";
import { WorkflowTestHarness } from "../../helpers/WorkflowTestHarness";
import { TestConnectionFactory } from "../../helpers/TestConnectionFactory";
import workflowDefinition from "../../fixtures/workflows/my-workflow.json";

describe("My Test Workflow", () => {
    let pool: Pool;
    let dbHelper: DatabaseHelper;
    let testHarness: WorkflowTestHarness;
    let testUserId: string;

    beforeAll(async () => {
        pool = getGlobalTestPool();
        dbHelper = getGlobalDbHelper();
        testHarness = new WorkflowTestHarness(pool);

        await testHarness.initialize();
        testUserId = await dbHelper.seedTestUser();
    });

    afterAll(async () => {
        await dbHelper.cleanup();
        await testHarness.cleanup();
    });

    it("should execute workflow successfully", async () => {
        const result = await testHarness.executeWorkflow(
            workflowDefinition,
            { input: "test" }
        );

        expect(result.success).toBe(true);
        expect(result.outputs).toBeDefined();
    });
});
```

### Step 3: Run and validate
1. Start Docker services
2. Start Temporal worker
3. Run test: `npm test -- tests/integration/workflows/my-workflow.test.ts`

## Test Strategy

This test suite follows **Strategy 1: Local Service Ecosystem** with some real API tests:

### Local Infrastructure (No cost, fast)
- ✅ PostgreSQL, MongoDB, Redis (via Docker)
- ✅ Temporal for workflow orchestration
- ✅ HTTP requests to public test APIs (httpbin.org, jsonplaceholder.typicode.com)
- ✅ File operations with local test files
- ✅ Transform, Code, Conditional, Loop, Variable nodes (pure logic)

### Real API Integration (Small cost, validates real services)
- 🔄 OpenAI API (gpt-3.5-turbo, text-embedding-3-small)
- 🔄 Anthropic API (claude-3-haiku)
- 🔄 Slack API (test workspace)
- 🔄 Knowledge Base RAG with real embeddings

## Troubleshooting

### Tests fail with "relation does not exist"
**Solution**: Run database migrations
```bash
npm run db:migrate
```

### Tests timeout
**Causes**:
1. Temporal worker not running → Start worker in separate terminal
2. Docker services not running → Run `npm run docker:up`
3. Network issues with external APIs → Check internet connection

**Solution**: Verify prerequisites are running

### "Webpack finished with errors"
**Cause**: Attempting to start Temporal worker in test (old approach)

**Solution**: Start worker manually before running tests

### Database connection errors
**Solution**: Check Docker services:
```bash
docker ps | grep flowmaestro-postgres
```

If not running:
```bash
npm run docker:up
```

## Next Steps

### Planned Workflows
1. ✅ **Workflow 1**: HTTP + Transform + Database
2. 🔄 **Workflow 2**: File Operations + Transform + Code
3. 🔄 **Workflow 3**: Knowledge Base RAG
4. 🔄 **Workflow 4**: Conditional Logic
5. 🔄 **Workflow 5**: Loop Processing
6. 🔄 **Workflow 6**: Error Handling & Retries
7. 🔄 **Workflow 7**: Switch Logic
8. 🔄 **Workflow 8**: Variable Operations
9. 🔄 **Workflow 9**: LLM Integration (Real OpenAI/Anthropic)
10. 🔄 **Workflow 10**: Multi-Provider AI
11. 🔄 **Workflow 11**: Embeddings + RAG (Real API)
12. 🔄 **Workflow 12**: Integration Services (Real Slack)

### To Do
- [ ] Validate Workflow 1 passes all tests
- [ ] Build remaining 11 workflows
- [ ] Add file fixtures (PDFs, CSVs) for file operation tests
- [ ] Add mock response fixtures for deterministic LLM tests
- [ ] Create test script that checks prerequisites automatically
- [ ] Add CI/CD integration

## Cost Analysis

### Local Tests (Workflows 1-8)
- **Cost**: $0/run
- **Runtime**: ~5-10 minutes total
- **Frequency**: Run on every commit

### Real API Tests (Workflows 9-12)
- **Cost**: ~$0.0014/run (~$1.40 per 1000 runs)
- **Runtime**: ~2-3 minutes total
- **Frequency**: Run before releases or weekly

**Annual cost estimate** (assuming 100 runs/day of local + 10 runs/day of API tests):
- Local: $0
- API: 10 runs/day × 365 days × $0.0014 = **~$5.11/year**

## Support

For issues or questions about testing:
1. Check this README
2. Review existing test files for patterns
3. Check test output for specific error messages
4. Verify prerequisites are running

---

**Status**: 🚧 Work in Progress (1/12 workflows completed)
**Last Updated**: 2025-10-31
