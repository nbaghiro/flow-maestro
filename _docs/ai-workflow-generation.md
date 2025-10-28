# AI Workflow Generation Feature

## Overview

This document describes the AI-powered workflow generation feature that allows users to create complete, executable workflows from natural language descriptions. The feature uses a one-shot prompting strategy with user-provided LLM credentials to generate structured workflow definitions.

## Architecture

### User Flow
1. User clicks magic wand icon button (positioned left of Test/Trigger buttons)
2. Dialog opens with prompt textarea and credential selector
3. User enters natural language description (e.g., "Fetch news from API and summarize with AI")
4. User selects their preferred LLM credential (OpenAI, Anthropic, etc.)
5. Backend calls LLM with system prompt + user request
6. LLM returns structured JSON workflow
7. Frontend validates, auto-layouts nodes, and adds to canvas
8. User can immediately test or refine the workflow

### Components

**Backend:**
- `/api/workflows/generate` - POST endpoint for workflow generation
- `/services/workflow-generator.ts` - Core generation logic and prompt building
- Uses existing `executeLLMNode` for LLM calls with user credentials

**Frontend:**
- `AIGenerateButton.tsx` - Magic wand button component
- `AIGenerateDialog.tsx` - Prompt input modal with credential selector
- `workflow-layout.ts` - Auto-layout algorithm for positioning nodes
- `workflowStore.ts` - State management for generated workflows

## System Prompt Strategy

### Prompt Structure (~3000-4000 tokens)

The system prompt consists of four main parts:

1. **Role & Objective** - Clear instructions about the task
2. **Node Catalog** - Complete specifications for all 16 node types
3. **Edge Connection Rules** - How to connect nodes properly
4. **Output JSON Schema** - Expected output format

### Part 1: Role & Objective

```
You are an expert workflow automation designer for FlowMaestro, a visual workflow builder.

Your task: Convert user's natural language descriptions into complete, executable workflow definitions.

Output Format: Valid JSON with nodes array, edges array, and metadata.

Rules:
- Create workflows that are practical and executable
- Generate a concise workflow name (3-6 words) that captures the essence of what the workflow does
- Use smart defaults for all configurations
- Generate descriptive labels for each node
- Ensure proper node connections (edges)
- Include necessary error handling (conditional nodes)
- Keep workflows simple but complete
- Always specify credentialId for nodes requiring auth (LLM, HTTP with auth, etc.)
```

### Part 2: Node Catalog (16 Node Types)

#### 1. LLM Node (type: "llm")

**Purpose**: Text generation using large language models

**Providers**: openai, anthropic, google, cohere

**Common Use Cases**:
- Text summarization
- Content generation
- Question answering
- Data extraction
- Classification
- Translation

**Configuration Schema**:
```json
{
  "provider": "openai" | "anthropic" | "google" | "cohere",
  "model": "string",
  "credentialId": "string (REQUIRED - user's stored credential)",
  "prompt": "string (supports variable interpolation: ${variableName})",
  "systemPrompt": "string (optional)",
  "temperature": "number (0-1, default: 0.7)",
  "maxTokens": "number (default: 1000)",
  "outputVariable": "string (optional - wraps output in named variable)"
}
```

**Smart Defaults**:
- provider: "openai"
- model: "gpt-4"
- temperature: 0.7
- maxTokens: 1000

**Outputs**: Single output handle containing `{ text, usage, model, provider }`

**Example**:
```json
{
  "type": "llm",
  "label": "Summarize Article",
  "config": {
    "provider": "openai",
    "model": "gpt-4",
    "credentialId": "${userCredentialId}",
    "prompt": "Summarize the following article in 3 bullet points:\n\n${article}",
    "temperature": 0.5,
    "maxTokens": 500
  }
}
```

---

#### 2. HTTP Node (type: "http")

**Purpose**: Make HTTP requests to external APIs

**Methods**: GET, POST, PUT, DELETE, PATCH

**Configuration Schema**:
```json
{
  "method": "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  "url": "string (supports variable interpolation)",
  "headers": "Record<string, string>",
  "body": "any (for POST/PUT/PATCH)",
  "queryParams": "Record<string, string>",
  "credentialId": "string (optional - for API key auth)",
  "timeout": "number (ms, default: 30000)"
}
```

**Smart Defaults**:
- method: "GET"
- timeout: 30000
- headers: { "Content-Type": "application/json" }

**Outputs**: Single output with `{ status, data, headers }`

**Example**:
```json
{
  "type": "http",
  "label": "Fetch News Articles",
  "config": {
    "method": "GET",
    "url": "https://newsapi.org/v2/top-headlines",
    "queryParams": {
      "country": "us",
      "category": "technology"
    },
    "credentialId": "${newsApiCredentialId}"
  }
}
```

---

#### 3. Conditional Node (type: "conditional")

**Purpose**: Branch workflow based on conditions

**Outputs**: Two handles - "true" and "false"

**Configuration Schema**:
```json
{
  "condition": "string (JavaScript expression or simple comparison)",
  "leftValue": "any (supports variable interpolation)",
  "operator": "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith" | "endsWith",
  "rightValue": "any",
  "mode": "simple" | "expression" (default: "simple")"
}
```

**Smart Defaults**:
- mode: "simple"
- operator: "=="

**Example (Simple)**:
```json
{
  "type": "conditional",
  "label": "Check Status Code",
  "config": {
    "mode": "simple",
    "leftValue": "${response.status}",
    "operator": "==",
    "rightValue": 200
  }
}
```

**Example (Expression)**:
```json
{
  "type": "conditional",
  "label": "Validate Response",
  "config": {
    "mode": "expression",
    "condition": "${response.data.length} > 0 && ${response.status} === 200"
  }
}
```

---

#### 4. Transform Node (type: "transform")

**Purpose**: Transform, filter, or extract data

**Methods**: JSONPath, templates, filters

**Configuration Schema**:
```json
{
  "mode": "jsonpath" | "template" | "filter",
  "jsonPath": "string (for jsonpath mode)",
  "template": "string (for template mode)",
  "filterExpression": "string (for filter mode)",
  "outputVariable": "string (optional)"
}
```

**Example (JSONPath)**:
```json
{
  "type": "transform",
  "label": "Extract Article Titles",
  "config": {
    "mode": "jsonpath",
    "jsonPath": "$.articles[*].title",
    "outputVariable": "titles"
  }
}
```

**Example (Template)**:
```json
{
  "type": "transform",
  "label": "Format Output",
  "config": {
    "mode": "template",
    "template": "Summary for ${article.title}:\n\n${summary}"
  }
}
```

---

#### 5. Loop Node (type: "loop")

**Purpose**: Iterate over arrays/lists

**Behavior**: Executes connected nodes for each item

**Configuration Schema**:
```json
{
  "items": "string (variable reference to array, e.g., ${articles})",
  "itemVariable": "string (variable name for current item, default: item)",
  "indexVariable": "string (variable name for index, default: index)",
  "maxConcurrency": "number (default: 1 for sequential, >1 for parallel)"
}
```

**Outputs**: Single output that runs for each iteration

**Example**:
```json
{
  "type": "loop",
  "label": "Process Each Article",
  "config": {
    "items": "${articles}",
    "itemVariable": "article",
    "indexVariable": "i",
    "maxConcurrency": 3
  }
}
```

---

#### 6. Vision Node (type: "vision")

**Purpose**: Image generation and analysis

**Configuration Schema**:
```json
{
  "mode": "generate" | "analyze",
  "provider": "openai" | "replicate",
  "credentialId": "string (REQUIRED)",
  "prompt": "string (for generation)",
  "imageUrl": "string (for analysis)",
  "size": "256x256" | "512x512" | "1024x1024",
  "model": "string"
}
```

---

#### 7. Audio Node (type: "audio")

**Purpose**: Speech-to-text and text-to-speech

**Configuration Schema**:
```json
{
  "mode": "transcribe" | "synthesize",
  "provider": "openai" | "google",
  "credentialId": "string (REQUIRED)",
  "audioUrl": "string (for transcription)",
  "text": "string (for synthesis)",
  "voice": "string",
  "language": "string"
}
```

---

#### 8. Input Node (type: "input")

**Purpose**: Accept user input at workflow start

**Configuration Schema**:
```json
{
  "inputType": "text" | "number" | "file" | "choice",
  "label": "string",
  "placeholder": "string",
  "required": "boolean",
  "defaultValue": "any",
  "choices": "string[] (for choice type)",
  "variable": "string (variable name to store input)"
}
```

**Example**:
```json
{
  "type": "input",
  "label": "Enter Topic",
  "config": {
    "inputType": "text",
    "label": "What topic should I search for?",
    "placeholder": "e.g., artificial intelligence",
    "required": true,
    "variable": "topic"
  }
}
```

---

#### 9. Output Node (type: "output")

**Purpose**: Display results to user

**Configuration Schema**:
```json
{
  "format": "text" | "json" | "markdown" | "html",
  "value": "string (variable reference or template)",
  "label": "string"
}
```

**Example**:
```json
{
  "type": "output",
  "label": "Show Results",
  "config": {
    "format": "markdown",
    "value": "${formattedResults}",
    "label": "Search Results"
  }
}
```

---

#### 10. Variable Node (type: "variable")

**Purpose**: Set or get workflow-level variables

**Configuration Schema**:
```json
{
  "operation": "set" | "get",
  "variableName": "string",
  "value": "any (for set operation)"
}
```

---

#### 11. Switch Node (type: "switch")

**Purpose**: Multiple conditional branches

**Outputs**: Multiple named handles based on cases

**Configuration Schema**:
```json
{
  "value": "string (variable to evaluate)",
  "cases": "Array<{ match: any, output: string }>",
  "defaultOutput": "string"
}
```

---

#### 12. Code Node (type: "code")

**Purpose**: Execute custom JavaScript or Python

**Configuration Schema**:
```json
{
  "language": "javascript" | "python",
  "code": "string",
  "inputs": "Record<string, any>",
  "outputVariable": "string"
}
```

---

#### 13. Wait Node (type: "wait")

**Purpose**: Delay workflow execution

**Configuration Schema**:
```json
{
  "duration": "number (milliseconds)",
  "unit": "ms" | "seconds" | "minutes"
}
```

---

#### 14. Database Node (type: "database")

**Purpose**: Query SQL/NoSQL databases

**Configuration Schema**:
```json
{
  "databaseType": "postgres" | "mysql" | "mongodb",
  "credentialId": "string (REQUIRED)",
  "query": "string",
  "parameters": "Record<string, any>"
}
```

---

#### 15. Integration Node (type: "integration")

**Purpose**: Connect to third-party services

**Configuration Schema**:
```json
{
  "service": "slack" | "email" | "googlesheets",
  "action": "string (service-specific)",
  "credentialId": "string (REQUIRED)",
  "config": "Record<string, any> (service-specific)"
}
```

---

#### 16. Embeddings Node (type: "embeddings")

**Purpose**: Generate vector embeddings for semantic search

**Configuration Schema**:
```json
{
  "provider": "openai" | "cohere",
  "model": "string",
  "credentialId": "string (REQUIRED)",
  "text": "string"
}
```

---

### Part 3: Edge Connection Rules

**Node IDs**: Use format "node-0", "node-1", "node-2", etc.

**Source Handles**:
- Most nodes: "output"
- Conditional: "true" or "false"
- Switch: case names from config

**Target Handles**: "input"

**Entry Point**: First node in execution order (usually Input or HTTP)

**Edge Schema**:
```json
{
  "source": "node-0",
  "target": "node-1",
  "sourceHandle": "output",
  "targetHandle": "input"
}
```

---

### Part 4: Output JSON Schema

```json
{
  "nodes": [
    {
      "id": "node-0",
      "type": "input|llm|http|...",
      "label": "User-friendly name",
      "config": { }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "name": "Concise workflow name (3-6 words)",
    "entryNodeId": "node-0",
    "description": "Brief description of what this workflow does"
  }
}
```

---

## Example Workflows

### Example 1: Simple API + AI Summarization

**User Input**:
> "Fetch latest tech news from NewsAPI and summarize each article with GPT-4"

**Generated Workflow**:
```json
{
  "nodes": [
    {
      "id": "node-0",
      "type": "http",
      "label": "Fetch Tech News",
      "config": {
        "method": "GET",
        "url": "https://newsapi.org/v2/top-headlines",
        "queryParams": {
          "category": "technology",
          "pageSize": "5"
        },
        "credentialId": "${userCredentialId}"
      }
    },
    {
      "id": "node-1",
      "type": "transform",
      "label": "Extract Articles",
      "config": {
        "mode": "jsonpath",
        "jsonPath": "$.articles",
        "outputVariable": "articles"
      }
    },
    {
      "id": "node-2",
      "type": "loop",
      "label": "Process Each Article",
      "config": {
        "items": "${articles}",
        "itemVariable": "article",
        "maxConcurrency": 3
      }
    },
    {
      "id": "node-3",
      "type": "llm",
      "label": "Summarize Article",
      "config": {
        "provider": "openai",
        "model": "gpt-4",
        "credentialId": "${userCredentialId}",
        "prompt": "Summarize this article in 2-3 sentences:\n\nTitle: ${article.title}\nContent: ${article.description}",
        "temperature": 0.5,
        "maxTokens": 200,
        "outputVariable": "summary"
      }
    },
    {
      "id": "node-4",
      "type": "output",
      "label": "Display Summaries",
      "config": {
        "format": "markdown",
        "value": "${summary}",
        "label": "Article Summary"
      }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-3",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-3",
      "target": "node-4",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "entryNodeId": "node-0",
    "description": "Fetches latest tech news and generates AI summaries for each article"
  }
}
```

**Flow**: HTTP → Transform → Loop → LLM → Output

---

### Example 2: Content Classification & Routing

**User Input**:
> "Let users submit feedback, use AI to classify it as bug/feature/question, and route to different outputs"

**Generated Workflow**:
```json
{
  "nodes": [
    {
      "id": "node-0",
      "type": "input",
      "label": "Feedback Input",
      "config": {
        "inputType": "text",
        "label": "Submit your feedback",
        "placeholder": "Describe your issue or suggestion...",
        "required": true,
        "variable": "feedback"
      }
    },
    {
      "id": "node-1",
      "type": "llm",
      "label": "Classify Feedback",
      "config": {
        "provider": "openai",
        "model": "gpt-4",
        "credentialId": "${userCredentialId}",
        "systemPrompt": "You are a feedback classifier. Respond with ONLY one word: BUG, FEATURE, or QUESTION",
        "prompt": "Classify this feedback:\n\n${feedback}",
        "temperature": 0.3,
        "maxTokens": 10,
        "outputVariable": "category"
      }
    },
    {
      "id": "node-2",
      "type": "switch",
      "label": "Route by Category",
      "config": {
        "value": "${category.text}",
        "cases": [
          { "match": "BUG", "output": "bug" },
          { "match": "FEATURE", "output": "feature" },
          { "match": "QUESTION", "output": "question" }
        ],
        "defaultOutput": "question"
      }
    },
    {
      "id": "node-3",
      "type": "output",
      "label": "Bug Report",
      "config": {
        "format": "text",
        "value": "Bug reported: ${feedback}",
        "label": "Bug Tracking"
      }
    },
    {
      "id": "node-4",
      "type": "output",
      "label": "Feature Request",
      "config": {
        "format": "text",
        "value": "Feature requested: ${feedback}",
        "label": "Product Backlog"
      }
    },
    {
      "id": "node-5",
      "type": "output",
      "label": "Question Response",
      "config": {
        "format": "text",
        "value": "Question received: ${feedback}",
        "label": "Support Queue"
      }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-3",
      "sourceHandle": "bug",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-4",
      "sourceHandle": "feature",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-5",
      "sourceHandle": "question",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "entryNodeId": "node-0",
    "description": "Classifies user feedback using AI and routes to appropriate output"
  }
}
```

**Flow**: Input → LLM → Switch → 3x Output (branching)

---

### Example 3: Data Processing Pipeline

**User Input**:
> "Get customer data from my PostgreSQL database, filter active customers, and generate personalized email content for each using Claude"

**Generated Workflow**:
```json
{
  "nodes": [
    {
      "id": "node-0",
      "type": "database",
      "label": "Fetch Customers",
      "config": {
        "databaseType": "postgres",
        "credentialId": "${userCredentialId}",
        "query": "SELECT * FROM customers WHERE status = $1",
        "parameters": {
          "1": "active"
        }
      }
    },
    {
      "id": "node-1",
      "type": "conditional",
      "label": "Check Results",
      "config": {
        "mode": "expression",
        "condition": "${response.rows.length} > 0"
      }
    },
    {
      "id": "node-2",
      "type": "loop",
      "label": "Process Each Customer",
      "config": {
        "items": "${response.rows}",
        "itemVariable": "customer",
        "maxConcurrency": 5
      }
    },
    {
      "id": "node-3",
      "type": "llm",
      "label": "Generate Email",
      "config": {
        "provider": "anthropic",
        "model": "claude-3-5-sonnet-20241022",
        "credentialId": "${userCredentialId}",
        "systemPrompt": "You are a friendly marketing email writer. Write personalized, engaging emails.",
        "prompt": "Write a personalized email for:\n\nName: ${customer.name}\nPlan: ${customer.plan}\nJoin Date: ${customer.created_at}\n\nPromote our new premium features.",
        "temperature": 0.7,
        "maxTokens": 500,
        "outputVariable": "emailContent"
      }
    },
    {
      "id": "node-4",
      "type": "output",
      "label": "Email Preview",
      "config": {
        "format": "markdown",
        "value": "**To:** ${customer.email}\n\n${emailContent.text}",
        "label": "Generated Email"
      }
    },
    {
      "id": "node-5",
      "type": "output",
      "label": "No Customers Found",
      "config": {
        "format": "text",
        "value": "No active customers found in database",
        "label": "Error"
      }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "true",
      "targetHandle": "input"
    },
    {
      "source": "node-1",
      "target": "node-5",
      "sourceHandle": "false",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-3",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-3",
      "target": "node-4",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "entryNodeId": "node-0",
    "description": "Generates personalized emails for active customers from database"
  }
}
```

**Flow**: Database → Conditional → (True: Loop → LLM → Output) | (False: Error Output)

---

### Example 4: Image Generation Workflow

**User Input**:
> "Let users describe an image, enhance the description with GPT-4, generate the image with DALL-E, and show the result"

**Generated Workflow**:
```json
{
  "nodes": [
    {
      "id": "node-0",
      "type": "input",
      "label": "Image Description",
      "config": {
        "inputType": "text",
        "label": "Describe the image you want to create",
        "placeholder": "A serene mountain landscape...",
        "required": true,
        "variable": "userDescription"
      }
    },
    {
      "id": "node-1",
      "type": "llm",
      "label": "Enhance Description",
      "config": {
        "provider": "openai",
        "model": "gpt-4",
        "credentialId": "${userCredentialId}",
        "systemPrompt": "You are an expert at writing detailed image generation prompts. Enhance the user's description with artistic details, lighting, composition, and style elements.",
        "prompt": "Enhance this image description for DALL-E:\n\n${userDescription}",
        "temperature": 0.8,
        "maxTokens": 300,
        "outputVariable": "enhancedPrompt"
      }
    },
    {
      "id": "node-2",
      "type": "vision",
      "label": "Generate Image",
      "config": {
        "mode": "generate",
        "provider": "openai",
        "credentialId": "${userCredentialId}",
        "prompt": "${enhancedPrompt.text}",
        "size": "1024x1024"
      }
    },
    {
      "id": "node-3",
      "type": "output",
      "label": "Show Image",
      "config": {
        "format": "html",
        "value": "<img src='${imageUrl}' alt='Generated Image' /><p>${enhancedPrompt.text}</p>",
        "label": "Generated Image"
      }
    }
  ],
  "edges": [
    {
      "source": "node-0",
      "target": "node-1",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    },
    {
      "source": "node-2",
      "target": "node-3",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ],
  "metadata": {
    "entryNodeId": "node-0",
    "description": "Enhances user's image description and generates image with AI"
  }
}
```

**Flow**: Input → LLM → Vision → Output

---

## Key Prompting Strategies

### 1. Credential Handling
- Always use placeholder `${userCredentialId}` in generated workflows
- Frontend will replace with actual credential selected by user
- Clearly document which nodes require credentials

### 2. Variable Interpolation
- Use `${variableName}` syntax consistently
- Support nested paths: `${response.data.items[0].title}`
- Document variable flow between nodes

### 3. Smart Defaults
- **LLM**: OpenAI GPT-4, temperature 0.7, 1000 tokens
- **HTTP**: GET method, 30s timeout
- **Conditional**: Simple mode
- **Loop**: Sequential execution (concurrency=1)

### 4. Error Handling
- Add conditional nodes to check HTTP status codes
- Validate data exists before processing
- Provide fallback outputs for error cases

### 5. Label Generation
- Use descriptive, action-oriented labels
- "Summarize Article" not "LLM Node"
- "Fetch User Data" not "HTTP Request"

### 6. Workflow Complexity
- Prefer 3-7 nodes for most workflows
- Use loops for batch processing
- Use conditionals for error handling
- Keep branching simple (max 3-4 branches)

---

## Auto-Layout Algorithm

When nodes are generated, they need to be positioned on the canvas. The auto-layout algorithm:

1. **Start Position**: Entry node at (100, 300)
2. **Build Dependency Graph**: Analyze edges to understand relationships
3. **Topological Sort**: Order nodes by execution flow
4. **Level Assignment**: Use BFS from entry node to assign depth levels
5. **Position Calculation**:
   - x = level × 250
   - y = 300 + (nodeInLevel × 150)
6. **Special Handling**:
   - **Conditional**: True branch offset up, false branch offset down
   - **Loop**: Stack iterations vertically
   - **Parallel branches**: Fan out vertically

---

## Implementation Overview

The AI workflow generation feature is implemented across backend API endpoints, frontend components, and supporting utilities, with comprehensive testing to ensure reliability.

### Backend Implementation

The backend consists of three key files working together to handle workflow generation requests. The **POST endpoint** (`/backend/src/api/routes/workflows/generate.ts`) accepts user prompts and credential IDs, validates the input, and orchestrates the generation process. The **workflow generator service** (`/backend/src/services/workflow-generator.ts`) is the core of the system, responsible for building the comprehensive system prompt from the node catalog, constructing the user message, calling the LLM using the user's selected credential, and validating the returned JSON against the expected schema. Finally, the **route registration** (`/backend/src/api/routes/workflows/index.ts`) integrates the generate endpoint into the main workflow routes, making it accessible through the API.

### Frontend Implementation

The frontend provides a complete user experience through five interconnected components. The **AIGenerateButton** (`/frontend/src/components/AIGenerateButton.tsx`) is the magic wand icon button positioned prominently on the workflow builder canvas, serving as the entry point for AI generation. The **AIGenerateDialog** (`/frontend/src/components/AIGenerateDialog.tsx`) presents the modal interface where users enter their workflow description, select their preferred LLM credential, and view example prompts for inspiration. The **auto-layout algorithm** (`/frontend/src/lib/workflow-layout.ts`) takes the generated nodes and edges and calculates optimal positions for each node on the canvas, handling special cases like conditional branching and loops. The **workflow store** (`/frontend/src/stores/workflowStore.ts`) is extended with a generation action that calls the backend API, processes the response, applies auto-layout, and adds nodes to the canvas. Finally, the **workflow canvas** (`/frontend/src/canvas/WorkflowCanvas.tsx`) integrates the generate button into the builder interface.

### Testing Strategy

Comprehensive testing ensures the feature works reliably across diverse scenarios. Testing includes trying various user prompts ranging from simple (single API call with LLM summary) to complex (multi-step workflows with conditionals and loops), verifying that the credential replacement mechanism correctly substitutes `${userCredentialId}` placeholders with actual credential IDs selected by the user, testing the auto-layout algorithm with different workflow structures including linear flows, branching conditionals, loops, and parallel branches, validating that all generated JSON conforms to the expected schema with proper node types, configurations, and edge connections, and testing error handling for cases like invalid prompts that the LLM can't interpret, malformed JSON responses from the LLM, and missing or invalid credentials.

---

## Future Enhancements

The current implementation provides a solid foundation that can be extended with several advanced features to improve the user experience and generation quality.

**Multi-turn Generation** would allow users to refine workflows through conversational follow-up prompts. After the initial generation, users could say "make the LLM temperature lower" or "add error handling for API failures" and the system would modify the existing workflow rather than generating from scratch. This requires maintaining conversation context and understanding modification intents.

**Template Library** functionality would enable users to save generated workflows as reusable templates. When generating a new workflow, the system could suggest similar templates or allow users to start from a template and modify it. This creates a growing library of proven workflow patterns that improves over time.

**Smart Suggestions** could analyze a user's existing workflows to recommend improvements. The system might notice that a workflow lacks error handling and suggest adding conditional nodes, or identify opportunities to parallelize sequential operations for better performance. This proactive guidance helps users follow best practices.

**Visual Preview** would show a diagram of the generated workflow before adding it to the canvas. Users could review the structure, understand the flow, and make a decision about whether to accept, modify, or regenerate. This prevents cluttering the canvas with unwanted workflows.

**Batch Generation** would create multiple workflow variations from a single prompt. For example, generating a news summarization workflow with different LLM providers (OpenAI, Anthropic, Google) or different complexity levels (simple, intermediate, advanced). Users could review all variations and choose the best fit.

**Learning System** would improve prompt quality based on user feedback. By tracking which generated workflows users keep versus delete, which they modify versus use as-is, and explicit feedback signals, the system could refine its prompts and generation strategy over time, becoming more aligned with user needs.
