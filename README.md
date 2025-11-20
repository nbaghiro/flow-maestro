# FlowMaestro

> Build, Deploy, and Scale AI Workflows with Visual Orchestration

FlowMaestro is a TypeScript-based platform for orchestrating AI agent workflows and building autonomous agents. Design multi-step AI processes through a visual canvas, create conversational agents with tools and memory, and deploy production-ready AI systems with built-in durability and monitoring.

![FlowMaestro Workflow Builder](preview.png)

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

- **[Integration System](./.docs/integrations-system.md)** - Provider SDK architecture with OAuth 2.0, API keys, and MCP support
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

# Setup secrets (pulls from GCP Secret Manager)
./infra/scripts/sync-secrets-local.sh

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

## Secrets Management

FlowMaestro uses a centralized secrets management system with **GCP Secret Manager** as the single source of truth for all environments.

### Local Development

For local development, use the sync script to set up your environment:

```bash
# Create backend/.env with developer secrets from GCP
./infra/scripts/sync-secrets-local.sh
```

This script:

- Uses **local defaults** for system secrets (database, JWT, encryption)
- Pulls **developer secrets** from GCP (LLM API keys, OAuth credentials)
- Creates `backend/.env` with all required variables
- Uses your current `gcloud` default project
- Safe to re-run anytime to sync latest secrets

**Why this approach?**

- System secrets (JWT, encryption keys) are auto-generated and safe to use defaults locally
- Developer secrets (API keys, OAuth) are valuable and should be centrally managed
- Simpler local setup - no need to configure databases or generate secure keys

### Production (GKE)

In production, secrets are managed through the **External Secrets Operator (ESO)**:

1. **GCP Secret Manager**: Single source of truth for all secrets
2. **External Secrets Operator**: Automatically syncs secrets from GCP to Kubernetes
3. **K8s Secrets**: Created and updated automatically by ESO (every 5 minutes)
4. **Application Pods**: Mount secrets as environment variables

#### Updating Production Secrets

```bash
# Update secrets in GCP Secret Manager
./infra/scripts/setup-secrets-gcp.sh

# ESO automatically syncs within 5 minutes
# Restart pods to pick up new values:
kubectl rollout restart deployment/api-server -n flowmaestro
kubectl rollout restart deployment/temporal-worker -n flowmaestro
```

#### Secret Types

The system manages these secret categories:

- **System Secrets**: JWT tokens, encryption keys
- **Database**: PostgreSQL and Temporal database credentials
- **Cache**: Redis connection details
- **LLM APIs**: OpenAI, Anthropic, Google AI keys
- **OAuth**: Slack, Google, Notion client credentials

### Helper Scripts

Located in `infra/scripts/`:

- **`sync-secrets-local.sh`**: Set up local development environment
    - Uses local defaults for system secrets (database, JWT, encryption)
    - Pulls developer secrets (LLM keys, OAuth) from GCP Secret Manager
    - Creates `backend/.env` automatically

- **`setup-secrets-gcp.sh`**: Create/update all secrets in GCP Secret Manager
    - For initial production setup or secret rotation
    - Auto-detects existing secrets and shows them as defaults
    - Supports generating new values (type "generate" when prompted)
    - Used for both system and developer secrets in production

Both scripts:

- Use your current `gcloud` default project
- Include validation and error handling
- Safe to re-run anytime

See [infra/scripts/README.md](./infra/scripts/README.md) for detailed documentation.

## Documentation

Comprehensive documentation is available in the `.docs/` directory:

### Core Documentation

- **[Workflow System](./.docs/workflow-system.md)** - Complete workflow builder guide
- **[Agent Architecture](./.docs/agent-architecture.md)** - AI agent system and memory
- **[Temporal Workflows](./.docs/temporal-workflows.md)** - Durable workflow execution
- **[Integration System](./.docs/integrations-system.md)** - Provider SDK and external connections

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
3. Setup secrets: `./infra/scripts/sync-secrets-local.sh`
4. Start infrastructure: `npm run docker:up`
5. Run migrations: `npm run db:migrate`
6. Start dev servers: `npm run dev`
7. Create a feature branch
8. Make your changes and add tests
9. Run `npm run typecheck` and `npm run lint:fix`
10. Submit a pull request

## Support

- **Documentation**: [.docs/](./.docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/flowmaestro/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flowmaestro/discussions)

## License

MIT

---

Built with ❤️ by the FlowMaestro Team
