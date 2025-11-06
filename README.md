# FlowMaestro

> Build, Deploy, and Scale AI Workflows with Visual Orchestration

![FlowMaestro Workflow Builder](_demos/readme-preview.png)

FlowMaestro is a production-ready platform for orchestrating complex AI agent workflows through a visual canvas interface. Design multi-step AI processes, connect different language models, integrate external services, and monitor execution in real-time—all without writing code.

---

## What is FlowMaestro?

FlowMaestro enables teams to build sophisticated AI workflows by visually connecting nodes that represent different operations: LLM calls, conditional logic, data transformations, API integrations, and human-in-the-loop interactions.

**Key Benefits:**
- **Visual Workflow Builder**: Design AI workflows with drag-and-drop simplicity
- **Durable Execution**: Workflows survive system failures and can be paused, resumed, and retried
- **Multi-LLM Support**: Connect to OpenAI, Anthropic, Google, and Cohere in a single workflow
- **Real-time Monitoring**: Watch your workflows execute with live progress updates
- **Enterprise-Ready**: Built for scale with AWS deployment, monitoring, and security

---

## Core Features

### Workflow Building
- **Visual Canvas**: Drag-and-drop interface powered by React Flow with 23+ pre-built node types
- **Variable System**: Reference outputs from any node using `${node_id.output}` syntax
- **Conditional Logic**: Dynamic routing with if/else conditionals and switch statements
- **Loops & Iteration**: Process arrays and collections with built-in loop constructs
- **Version Control**: Track workflow versions and enable rollback
- **Test Mode**: Test workflows with sample inputs before deployment

### AI & LLM Integration
- **Multi-Provider Support**: OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), Google (Gemini), Cohere
- **Vision Capabilities**: Image analysis with GPT-4 Vision, image generation with DALL-E
- **Audio Processing**: Speech-to-text (Whisper) and text-to-speech
- **Embeddings**: Generate and query vector embeddings for semantic search
- **Streaming**: Real-time streaming of LLM responses during execution

### Data & Integrations
- **File Operations**: Parse PDFs, CSVs, XML, and JSON files
- **Database Connectors**: Query PostgreSQL, MongoDB, and other databases
- **HTTP/API Calls**: Make REST API calls with automatic retry logic
- **Data Transformation**: JSONata and JMESPath for complex data mapping
- **Pre-built Integrations**: Slack, Notion, Email, and custom webhooks

### Workflow Control
- **Human-in-the-Loop**: Pause workflows for human input, review, or approval
- **Error Handling**: Automatic retry with exponential backoff and error propagation
- **Rate Limiting**: Built-in rate limiting for external API calls
- **Batch Processing**: Execute multiple workflow instances in parallel
- **Code Execution**: Sandboxed JavaScript/Python for custom logic

### Monitoring & Observability
- **Real-time Updates**: WebSocket-based live updates for workflow execution
- **Execution Logs**: Comprehensive logs for compliance and debugging
- **Audit Trail**: Full execution history for every workflow run
- **Status Tracking**: Monitor pending, running, completed, and failed executions

---

## Use Cases

### Multi-Agent AI Systems
Orchestrate multiple AI agents with different specializations working together. For example:
- Research agent → Analysis agent → Writing agent → Review agent
- Different models for different tasks (GPT-4 for reasoning, Claude for writing)

### Document Processing Pipelines
Extract, transform, and analyze documents with AI-powered workflows:
- Upload PDF → Extract text → Summarize with LLM → Store in database
- Process invoices, contracts, or reports automatically

### Customer Support Automation
Build intelligent support bots with escalation paths:
- Receive customer message → Classify intent → Route to appropriate response
- Escalate to human agent when needed with full context

### Content Generation
Create complex content pipelines with review steps:
- Generate blog outline → Write sections → Review quality → Publish
- Multiple revisions with different LLMs for creativity and polish

### Data Enrichment
Combine multiple data sources and AI models:
- Fetch customer data → Enrich with external APIs → Analyze sentiment → Update CRM
- Generate insights and recommendations

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **Docker Desktop** (for PostgreSQL, Redis, Temporal)
- **npm** >= 10.0.0

### Quick Start (5 Minutes)

**1. Clone and Install**
```bash
git clone https://github.com/yourusername/flowmaestro.git
cd flowmaestro
npm install
```

**2. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your API keys (optional for testing)
```

**3. Start Infrastructure**
```bash
npm run docker:up
```

**4. Start Application**
```bash
npm run dev
```

**5. Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Temporal UI**: http://localhost:8088

**Default Login**: `test@flowmaestro.dev` / `testpassword123`

### Build Your First Workflow

1. Click "New Workflow" in the workflow library
2. Drag an **Input** node onto the canvas
3. Add an **LLM** node and connect it to the input
4. Add an **Output** node and connect it to the LLM
5. Configure each node by clicking on it
6. Click "Test" to execute with sample inputs
7. Watch real-time progress in the execution panel

---

## Core Concepts

### Workflows
A workflow is a directed acyclic graph (DAG) of nodes connected by edges. Each node performs a specific operation, and edges define the execution order.

### Nodes
Nodes are the building blocks of workflows. There are 23+ node types organized by category:
- **Input/Output**: Define workflow inputs and outputs
- **AI**: LLM, Vision, Audio, Embeddings
- **Logic**: Conditional, Switch, Loop
- **Data**: Transform, Variable, File Operations
- **Integration**: HTTP, Database, Slack, Email
- **Control**: Wait, User Input, Code Execution

### Executions
An execution is a single run of a workflow with specific input parameters. Executions can be monitored in real-time and have statuses: pending, running, completed, failed, or cancelled.

### Variables
Variables allow nodes to reference outputs from previous nodes. Use `${node_id.output_field}` syntax to dynamically insert values.

### Connections
External service connections (API keys, OAuth tokens) are stored securely and can be reused across workflows. Supported providers include OpenAI, Anthropic, Google, Slack, and more.

---

## Documentation

Comprehensive technical documentation is available in the `_docs/` folder:

### Architecture & Technical
- **[Architecture Overview](./_docs/architecture.md)** - System architecture, components, and design decisions
- **[Architecture Summary](./_docs/architecture-summary.md)** - Quick reference guide
- **[Temporal Orchestration](./_docs/temporal-orchestration.md)** - Workflow engine internals

### Features & Implementation
- **[Workflow Triggers](./_docs/workflow-triggers.md)** - Schedules, webhooks, and event-based triggers
- **[External Connections](./_docs/external_connections.md)** - Connection management and encryption
- **[WebSocket Events](./_docs/websocket_events.md)** - Real-time communication protocol
- **[AI Workflow Generation](./_docs/ai-workflow-generation.md)** - Generate workflows from natural language
- **[Voice Calls (LiveKit + Telnyx)](./_docs/voicecalls-livekit-telnyx.md)** - Voice call integration

### Development & Operations
- **[Testing Strategy](./_docs/testing-strategy.md)** - Integration test suite and philosophy
- **[Database Migrations](./_docs/database-migrations.md)** - How to create and run migrations
- **[Development Guidelines](./CLAUDE.md)** - Coding standards and best practices (for developers)

---

## Deployment

### Local Development
```bash
npm run docker:up    # Start PostgreSQL, Redis, Temporal
npm run dev          # Start frontend + backend + worker
```

### Production (GKE)
FlowMaestro is production-ready for deployment on Google Kubernetes Engine (GKE):
- **GKE Autopilot** for managed Kubernetes cluster
- **Cloud SQL PostgreSQL** for data persistence
- **Memorystore Redis** for caching and pub/sub
- **Cloud Storage + CDN** for frontend delivery
- **Global Load Balancer** for API traffic with SSL
- **Temporal Cloud** for durable workflow orchestration

**Quick Deploy:**
```bash
cd infra
./deploy.sh
```

See **[infra/README.md](./infra/README.md)** for complete deployment guide with Pulumi infrastructure-as-code.

---

## API & Integrations

### REST API
FlowMaestro provides a comprehensive REST API for:
- Workflow management (CRUD operations)
- Execution control (start, stop, monitor)
- Integration configuration
- User authentication (JWT-based)

Base URL: `http://localhost:3001` (development) or `https://api.your-domain.com` (production)

Authentication: `Authorization: Bearer <jwt_token>`

### WebSocket API
Real-time updates via WebSocket connection at `ws://localhost:3001/ws`:
- Execution progress updates
- Node completion events
- Streaming LLM responses
- Human-in-the-loop requests

### Supported Integrations
- **LLM Providers**: OpenAI, Anthropic, Google, Cohere
- **Communication**: Slack, Email (SMTP/SES)
- **Knowledge**: Notion, Google Drive (coming soon)
- **Databases**: PostgreSQL, MongoDB
- **Custom**: HTTP webhooks, API calls

---

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run tests and linting (`npm test && npm run lint`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Areas for Contribution
- **New Node Types**: Add executors for new services
- **Integrations**: Connect to more external platforms
- **UI Enhancements**: Improve workflow builder experience
- **Documentation**: Expand guides and examples
- **Testing**: Add test coverage

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

---

## Support

- **Documentation**: [_docs/](./_docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flowmaestro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flowmaestro/discussions)
- **Email**: support@flowmaestro.com

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ by the FlowMaestro Team**

*Empowering teams to orchestrate AI workflows at scale*
