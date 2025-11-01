# Running LLM Integration Tests

This guide explains how to run the LLM integration tests that make real API calls to OpenAI and Anthropic.

## Prerequisites

### 1. Get API Keys

You'll need API keys from both providers:

**OpenAI:**
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-proj-...`)

**Anthropic:**
1. Go to https://console.anthropic.com/settings/keys
2. Create a new API key
3. Copy the key (starts with `sk-ant-...`)

### 2. Set Environment Variables

Add your API keys to the environment:

**Option A: Create `.env` file in backend directory**
```bash
cd backend
cat > .env << EOF
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
EOF
```

**Option B: Export in terminal**
```bash
export OPENAI_API_KEY=sk-proj-your-key-here
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Start Required Services

**Terminal 1: Docker Services**
```bash
npm run docker:up
```

**Terminal 2: Temporal Worker**
```bash
cd backend
npm run worker:orchestrator:dev
```

## Running the Tests

### Run All Integration Tests (including LLM)
```bash
cd backend
npm test
```

### Run Only LLM Tests
```bash
cd backend
npm test -- tests/integration/workflows/02-llm-chained-providers.test.ts
```

### Run Specific Test Case
```bash
cd backend
npm test -- tests/integration/workflows/02-llm-chained-providers.test.ts --testNamePattern="should chain OpenAI and Anthropic"
```

### Run with Verbose Output
```bash
cd backend
npm test -- tests/integration/workflows/02-llm-chained-providers.test.ts --verbose
```

## What the Tests Do

The LLM integration test workflow:

1. **Input**: Receives a topic (e.g., "artificial intelligence")
2. **OpenAI LLM**: Generates a creative sentence about the topic using `gpt-4o-mini`
3. **Anthropic LLM**: Refines the sentence with humor using `claude-haiku-4-5-20251001`
4. **Transform**: Combines both responses with token usage statistics
5. **Output**: Returns JSON with original, refined, and token counts

## Expected Output

When the test runs successfully, you'll see:

```
🔍 LLM Chained workflow result: {
  "success": true,
  "outputs": {
    "finalResult": {
      "original": "Artificial intelligence transforms how we interact with technology...",
      "refined": "Artificial intelligence transforms how we interact with technology—though...",
      "openai_tokens": 45,
      "anthropic_tokens": 52,
      "total_tokens": 97
    }
  }
}

📝 Example LLM Output:
Original (OpenAI): Artificial intelligence transforms how we interact with technology...
Refined (Anthropic): Artificial intelligence transforms how we interact with technology—though...
Token Usage: OpenAI=45, Anthropic=52, Total=97
```

## Cost Information

Each test run costs approximately **$0.001** (one-tenth of a cent):

- OpenAI `gpt-4o-mini`: ~$0.0004 per test
- Anthropic `claude-haiku-4-5`: ~$0.0006 per test

Running the test 1000 times would cost about **$1**.

## Troubleshooting

### "Skipping test - API keys not available"
- **Cause**: Environment variables not set
- **Fix**: Set `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` as shown above

### "Connection refused" or timeout
- **Cause**: Temporal worker or Docker services not running
- **Fix**:
  1. Check Docker: `docker ps | grep flowmaestro`
  2. Start worker in separate terminal
  3. Verify Temporal UI: http://localhost:8088

### "404 model not found" error
- **Cause**: Using deprecated Anthropic model
- **Fix**: The test uses the latest models (`claude-haiku-4-5-20251001`), which should work

### Test fails with "Invalid API key"
- **Cause**: Incorrect or expired API key
- **Fix**:
  1. Verify your API keys are active
  2. Check you copied the full key (including prefix)
  3. Regenerate keys if needed

## Test Coverage

The LLM test validates:

- ✅ Real API integration with OpenAI
- ✅ Real API integration with Anthropic
- ✅ Variable interpolation between LLM calls (`${openai_response.text}`)
- ✅ JSONata transform expressions
- ✅ Token usage tracking
- ✅ Output node with JSON formatting
- ✅ End-to-end workflow execution

## CI/CD Considerations

For CI/CD pipelines:

1. **Store API keys as secrets** (not in code)
2. **Run LLM tests only on merge to main** (to minimize costs)
3. **Set test timeout to 60 seconds** (LLM calls can take time)
4. **Monitor costs** in provider dashboards

Example GitHub Actions:
```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run LLM Tests
        if: github.ref == 'refs/heads/main'
        run: npm test -- tests/integration/workflows/02-llm-chained-providers.test.ts
```

## Next Steps

After validating this test works:

1. Use it as a regression test for LLM features
2. Expand with additional LLM providers (Google, Cohere)
3. Add vision model tests
4. Add embedding model tests
5. Test error handling and retry logic
