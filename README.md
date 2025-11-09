# FlowMaestro

> Build, Deploy, and Scale AI Workflows with Visual Orchestration

FlowMaestro is a TypeScript-based platform for orchestrating AI agent workflows and building autonomous agents. Design multi-step AI processes through a visual canvas, create conversational agents with tools and memory, and deploy production-ready AI systems with built-in durability and monitoring.

## Why FlowMaestro?

Built for TypeScript developers who need both visual workflow orchestration and programmatic AI agents, FlowMaestro provides everything you need to build production AI applications.

### Visual Workflows

- **[Workflow Canvas](./.docs/workflow-system.md)** - Drag-and-drop builder with 20+ node types (LLM, HTTP, Transform, Conditional, Loop, etc.)
- **[Durable Execution](./.docs/temporal-workflows.md)** - Powered by Temporal for retry logic, timeouts, and failure recovery
- **[Workflow Triggers](./.docs/workflow-system.md#triggers)** - Schedule, webhook, event-based, and manual execution
- **Real-time Monitoring** - WebSocket-based live execution updates

### AI Agents

- **[Agent System](./.docs/agent-architecture.md)** - Autonomous agents with LLM reasoning, tool use, and iterative problem-solving
- **[Memory Management](./.docs/agent-architecture.md#memory-system)** - Buffer, summary, working memory, and vector memory with RAG
- **[Streaming](./.docs/agent-architecture.md#streaming)** - Real-time SSE token streaming for responsive UIs
- **[MCP Integration](./.docs/agent-architecture.md#mcp-integration)** - Model Context Protocol client and server support

### Integrations & Context

- **[External Connections](./.docs/external-connections.md)** - OAuth 2.0, API keys, and MCP for 40+ AI providers and services
- **[Knowledge Bases](./.docs/workflow-system.md#knowledge-base)** - RAG with document processing, chunking, and vector search
- **[Voice Calls](./.docs/voice-calls.md)** - Telnyx + LiveKit integration for phone-based AI agents
- **Multi-LLM Support** - OpenAI, Anthropic, Google Gemini, Cohere through unified interface

### Production Ready

- **[Deployment Guide](./.docs/deployment-guide.md)** - Google Kubernetes Engine with Pulumi infrastructure-as-code
- **[Testing](./.docs/testing-guide.md)** - Integration test suite with real-world scenarios
- **[Observability](./.docs/agent-architecture.md#observability)** - Execution spans, logging, and telemetry
- **Security** - AES-256-GCM encryption, multi-tenancy, Workload Identity

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ (with pgvector extension)
- Redis 7+
- Temporal Server 1.23+

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/flowmaestro.git
cd flowmaestro

# Install dependencies
npm install

# Start infrastructure (Docker Compose)
npm run docker:up

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

Access the application:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Temporal UI**: http://localhost:8088

See [Deployment Guide](./.docs/deployment-guide.md) for production setup.

## Documentation

Comprehensive documentation is available in the `.docs/` directory:

### Core Documentation

- **[Workflow System](./.docs/workflow-system.md)** - Complete workflow builder guide
- **[Agent Architecture](./.docs/agent-architecture.md)** - AI agent system and memory
- **[Temporal Workflows](./.docs/temporal-workflows.md)** - Durable workflow execution
- **[External Connections](./.docs/external-connections.md)** - Integrations and OAuth

### Infrastructure & Operations

- **[Deployment Guide](./.docs/deployment-guide.md)** - GKE deployment and infrastructure
- **[Testing Guide](./.docs/testing-guide.md)** - Integration testing strategy
- **[Linting Setup](./.docs/linting-setup.md)** - Code quality and formatting

### Real-Time Features

- **[Voice Calls](./.docs/voice-calls.md)** - Telnyx & LiveKit integration
- **[WebSocket Events](./.docs/websocket-events.md)** - Real-time update system

## Architecture

FlowMaestro is a full-stack TypeScript monorepo:

```
flowmaestro/
├── frontend/          # React + Vite SPA (workflow canvas, agent builder)
├── backend/           # Fastify API + Temporal workers
├── shared/            # Shared TypeScript types and utilities
├── marketing/         # Marketing website
└── infra/            # Kubernetes manifests and Pulumi IaC
    ├── local/        # Docker Compose for local development
    ├── k8s/          # Kubernetes deployments
    └── pulumi/       # Infrastructure as Code
```

**Tech Stack:**

- Frontend: React 18, Vite, TailwindCSS, React Flow
- Backend: Fastify, Temporal, PostgreSQL, Redis
- AI/ML: OpenAI SDK, Anthropic SDK, Google AI, Embeddings
- Infrastructure: GKE, Cloud SQL, Memorystore, GCS
- Deployment: Kubernetes, Pulumi, Docker

## Development

```bash
# Start local infrastructure
npm run docker:up

# Run migrations
npm run db:migrate

# Start dev servers (backend + frontend)
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint:fix

# Run tests
npm run test
```

See [CLAUDE.md](./CLAUDE.md) for detailed coding standards and development guidelines.

## Contributing

Contributions are welcome! Please read our development guidelines in [CLAUDE.md](./CLAUDE.md) before submitting pull requests.

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Start infrastructure: `npm run docker:up`
4. Run migrations: `npm run db:migrate`
5. Start dev servers: `npm run dev`
6. Create a feature branch
7. Make your changes and add tests
8. Run `npm run typecheck` and `npm run lint:fix`
9. Submit a pull request

## Support

- **Documentation**: [.docs/](./.docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flowmaestro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flowmaestro/discussions)

## License

MIT

---

Built with ❤️ by the FlowMaestro Team
