# Axiom.co Integration Exploration

**Date**: November 7, 2025 (Updated November 9, 2025 with Frontend Analysis)
**Status**: Research Complete - Ready for Future Implementation
**Decision**: Recommended for Phase 2 Integration (Full-Stack Hybrid Approach)

---

## Executive Summary

Axiom.co is a **managed observability platform** purpose-built for AI/LLM applications that offers significant advantages over self-hosted solutions. After completing Sprint 1 (building our own SpanService), we've evaluated Axiom as a potential managed backend for production deployments.

**NEW (November 2025)**: Axiom now offers **full-stack observability** with native frontend logging via `@axiomhq/react`, enabling unified backend + frontend logging in a single platform.

**Recommendation**: Integrate Axiom using a **full-stack hybrid approach**:

- Keep our SpanService for local development/queries
- Export backend logs/traces to Axiom for production observability
- Add frontend logging with `@axiomhq/react` for unified observability
- Get AI-native dashboards, Web Vitals tracking, and cross-stack correlation

---

## What is Axiom?

Axiom is an **Event Data Platform** that provides unified log, trace, and metrics capabilities with:

- **Event-driven architecture**: Custom "EventDB" with 95% compression
- **Serverless querying**: On-demand compute, no infrastructure management
- **AI-native features**: Built specifically for LLM/agent workflow observability
- **OpenTelemetry standard**: Works with our existing instrumentation
- **Usage-based pricing**: Predictable costs, generous free tier

**Key Differentiator**: While traditional observability tools (Datadog, New Relic) are general-purpose, Axiom is **purpose-built for AI engineering** with native token tracking, cost monitoring, and multi-step agent tracing.

---

## Core Features

### 1. AI/LLM Observability (Perfect for FlowMaestro!)

**Native AI Workflow Tracing:**

- Multi-step agent chain visualization with trace waterfall
- Inspect inputs/outputs at every stage of agent loops
- Identify high-latency steps in complex workflows
- Track unexpected errors in agentic systems

**Automatic Cost & Token Tracking:**

- Track costs across providers (OpenAI, Anthropic, Google, Cohere)
- Per-capability cost breakdowns
- Per-model usage analytics
- Per-user cost attribution
- Automatic token counting from OpenTelemetry attributes

**Pre-Built AI Dashboard:**

- Automatically appears when sending AI telemetry
- At-a-glance cost tracking
- Model performance comparison
- Latency distribution analysis
- Error rate monitoring

**Enhanced OpenTelemetry Attributes:**
Axiom augments the OTel spec with AI-specific attributes:

- `gen_ai.capability.name` - Feature/workflow identification
- `gen_ai.step.name` - Individual step tracking
- `gen_ai.prompt.tokens` - Token usage
- `gen_ai.completion.tokens` - Response tokens
- `gen_ai.model` - Model identifier
- `gen_ai.provider` - Provider (OpenAI, Anthropic, etc.)

**TypeScript SDK for AI:**

- `@axiomhq/ai` - Purpose-built SDK for generative AI
- Built on OpenTelemetry standard
- Model wrappers for automatic trace capture
- Integration with Vercel AI SDK

### 2. Core Observability Features

**Distributed Tracing:**

- OpenTelemetry native support
- Span waterfall visualization
- Parent-child relationship tracking
- Cross-service trace correlation
- Zero sampling (keep 100% of traces)

**Log Aggregation:**

- Real-time log ingestion
- Structured log support (JSON)
- APL (Axiom Processing Language) for queries
- Virtual fields for query-time transformation
- Retention up to years (configurable)

**Metrics (Coming Soon):**

- Time-series metrics storage
- Integration with existing metrics systems
- Custom dashboards

**Querying:**

- APL (Axiom Processing Language) - piped operations
- Sub-second query performance
- Serverless compute (no cold starts)
- Automatic query optimization
- "Spotlight" feature - automated analysis

**Dashboards & Alerting:**

- Pre-built dashboards (AI, general observability)
- Custom dashboard builder
- Real-time monitors
- Slack/PagerDuty/webhook integrations
- Spend alerts

### 3. Platform Features

**Compression & Storage:**

- 95% compression ratio (~20x reduction)
- Compressed storage at $0.03/GB/month
- Long-term retention (year+) economically viable

**Performance:**

- Petabyte-scale ingestion (178B rows/second capacity)
- Sub-second query response
- Serverless architecture (no infrastructure)
- Global edge deployment

**Security & Compliance:**

- SAML SSO (enterprise add-on)
- Directory Sync (enterprise add-on)
- Role-Based Access Control (RBAC)
- Audit logs
- SOC 2 compliant

**Developer Experience:**

- 5-minute setup (documented)
- CLI tooling
- Infrastructure as Code support
- Extensive integration library
- OpenTelemetry SDK

### 4. Frontend Integration (NEW - November 2025)

Axiom released a completely reimagined JavaScript logging ecosystem with native React support:

**New JavaScript Libraries:**

- `@axiomhq/logging` - Framework-agnostic core library
- `@axiomhq/react` - React-specific hooks and components
- `@axiomhq/nextjs` - Next.js middleware and route helpers

**React Features:**

**`useLogger` Hook:**

- Custom React hook for logging from components
- Structured logging with data objects
- Automatic context injection (component name, user agent)
- Standard log levels (info, warn, error, debug)

```typescript
import { useLogger } from "@axiomhq/react";

function WorkflowCanvas() {
    const log = useLogger();

    const handleNodeAdded = (nodeType: string) => {
        log.info("Node added to canvas", {
            event: "node_added",
            nodeType,
            canvasNodeCount: nodes.length + 1,
            userId: user.id,
            workflowId: workflow.id
        });
    };

    return <ReactFlowCanvas onNodeAdd={handleNodeAdded} />;
}
```

**`WebVitals` Component:**

- Automatic Web Vitals tracking for RUM
- Mount once at app root
- Tracks LCP, FID, CLS, FCP, TTFB
- Includes user agent, environment data, page URL

```typescript
import { AxiomProvider, WebVitals } from "@axiomhq/react";

function App() {
    return (
        <AxiomProvider config={axiomConfig}>
            <WebVitals />
            <YourApp />
        </AxiomProvider>
    );
}
```

**Key Improvements:**

- Multiple transports (Axiom + console simultaneously)
- Explicit configuration (no environment variable guessing)
- Consistent API across server and client
- TypeScript support

**Frontend Use Cases:**

- Client-side error tracking
- User action logging (clicks, form submissions)
- API request/response logging
- Web Vitals performance monitoring
- Session tracking
- Cross-stack trace correlation

---

## Pricing Analysis

### Free Tier (Personal Plan)

**Always Free:**

- 500 GB/month data loading
- 10 GB-hours/month query compute
- 25 GB storage
- 30-day maximum retention
- 2 datasets, 256 fields per dataset
- 1 user, 3 monitors

**Perfect for:**

- Development environments
- Small teams
- Early-stage products
- Proof of concept

### Paid Tier (Axiom Cloud)

**Base Structure:**

- $25/month minimum platform fee
- Usage-based billing (credits system)
- 1 credit = $1 (discounts with volume)

**Always Free Allowances (higher than Personal):**

- 1,000 GB/month data loading (2x free tier)
- 100 GB-hours/month query compute (10x free tier)
- 100 GB storage (4x free tier)

**Credit Pricing:**

- Data loading: $0.096-0.12/GB (volume discounts)
- Query compute: $0.12-0.2/GB-hour
- Storage: $0.030/GB/month (compressed)

**Volume Discounts (Pre-Purchase):**

- 25K-99K credits: $0.90/credit (10% off)
- 100K-249K credits: $0.85/credit (15% off)
- 250K-499K credits: $0.80/credit (20% off)
- 500K-999K credits: $0.75/credit (25% off)
- 1M+ credits: $0.70/credit (30% off)

### Enterprise Add-Ons

- SAML SSO: $100/month
- Directory Sync: $100/month
- RBAC: $50/month
- Audit Logs: $50/month

### Cost Examples for FlowMaestro

#### Scenario 1: Development (Light Usage)

**Volume:** 100 GB spans/month

- Ingestion: Covered by free tier (500 GB/month)
- Storage: ~5 GB compressed × $0.03 = $0.15/month
- Query: Covered by free tier (10 GB-hours/month)
- **Total: $0/month** ✅

#### Scenario 2: Growing Production (Moderate Usage)

**Volume:** 1 TB spans/month

- Ingestion: Covered by free allowance (1,000 GB/month)
- Storage: ~50 GB compressed × $0.03 = $1.50/month
- Query: ~20 GB-hours (some covered, rest ~$2/month)
- **Total: $25 + $1.50 + $2 = $28.50/month**

#### Scenario 3: High Scale Production

**Volume:** 5 TB spans/month

- Ingestion: 5,000 GB × $0.096 = $480/month
- Storage: ~250 GB compressed × $0.03 = $7.50/month
- Query: ~100 GB-hours × $0.12 = $12/month
- **Total: $25 + $480 + $7.50 + $12 = $524.50/month**

**Comparison to Alternatives:**

- AWS CloudWatch (5TB/day): ~$79,500/month
- Datadog (5TB/month): ~$5,000-10,000/month
- Self-hosted Grafana Loki: ~$200-500/month (infra) + ops time
- **Axiom: $525/month (90-95% cheaper)** 🎯

#### Scenario 4: Frontend Logging (NEW)

**Typical Frontend Log Volume:**

- User actions: ~10-50 events/session
- API requests: ~20-100 requests/session
- Errors: ~1-5 errors/session
- Web Vitals: ~5 metrics/page load
- **Per Session**: ~100-200 events × 500 bytes = **50-100 KB/session**

**Monthly Estimates:**

| Active Users | Sessions/Month | Data Volume | Axiom Cost         |
| ------------ | -------------- | ----------- | ------------------ |
| 100          | 2,000          | 100-200 GB  | **$0** (free tier) |
| 1,000        | 20,000         | 1-2 TB      | **$25-50/mo**      |
| 10,000       | 200,000        | 10-20 TB    | **$500-1000/mo**   |

#### Scenario 5: Full-Stack (Backend + Frontend)

**Combined for 1,000 active users:**

- Backend: 1 TB/month (AI workflows, API logs)
- Frontend: 1-2 TB/month (user actions, Web Vitals, errors)
- **Total: 2-3 TB/month**
- **Cost: $50-75/month**

**vs. Datadog Full-Stack:**

- Datadog APM: ~$2,000-4,000/month
- Datadog RUM: $1.50 per 1K sessions = $30/month (20K sessions)
- Datadog Logs: ~$2,000-5,000/month
- **Total Datadog: $4,000-9,000/month**
- **Axiom Savings: 95-98% cheaper** 🎯

---

## Full-Stack Architecture with Axiom

### Recommended Setup: Separate Datasets

```
┌─────────────────────────────────────────────┐
│ Frontend (React)                            │
│ - @axiomhq/react (useLogger hook)          │
│ - WebVitals component                      │
│ - Structured client logs                   │
│ - API request tracking                     │
└─────────────────┬───────────────────────────┘
                  │
                  │ HTTP/Beacon API
                  │
            ┌─────▼──────────────────┐
            │   Axiom Cloud          │
            │                        │
            │ Dataset:               │
            │ flowmaestro-frontend   │
            │ - Browser logs         │
            │ - Web Vitals           │
            │ - User actions         │
            │ - API client logs      │
            └────────────────────────┘
                  │
                  │ Cross-stack correlation
                  │ via trace IDs
                  │
┌─────────────────▼───────────────────────────┐
│ Backend (Fastify)                           │
│ - Pino (built-in)                          │
│ - Axiom exporter (OTLP)                    │
│ - AI/LLM telemetry                         │
│ - Temporal workflows                       │
└─────────────────┬───────────────────────────┘
                  │
                  │ OTLP/HTTP
                  │
            ┌─────▼──────────────────┐
            │   Axiom Cloud          │
            │                        │
            │ Dataset:               │
            │ flowmaestro-backend    │
            │ - Pino logs            │
            │ - AI traces            │
            │ - Workflow spans       │
            │ - API server logs      │
            └────────────────────────┘
                  │
                  │ Unified view
                  │
            ┌─────▼──────────────────┐
            │   Axiom Dashboards     │
            │                        │
            │ - Frontend metrics     │
            │ - Backend traces       │
            │ - AI costs/tokens      │
            │ - Cross-stack traces   │
            │ - Web Vitals           │
            │ - Error tracking       │
            └────────────────────────┘
```

**Why Separate Datasets:**

- ✅ Clean separation of concerns (frontend vs backend)
- ✅ Independent retention policies
- ✅ Easier to manage data volumes
- ✅ Simpler querying for domain-specific analysis
- ✅ Can still correlate via trace IDs when needed

**Cross-Stack Correlation:**

```sql
-- Query both datasets for full trace
['flowmaestro-frontend', 'flowmaestro-backend']
| where traceId == "abc-123-def"
| order by timestamp asc
| project timestamp, dataset, span_name, duration_ms, attributes
```

---

## Axiom vs Self-Hosted Comparison

### Our Current Setup (Post Sprint 1)

**What We Built:**

- SpanService with batching and auto-flush
- PostgreSQL storage with 9 optimized indexes
- RequestContext for distributed tracing
- Structured logging with correlation IDs
- Tool validation with Zod

**Pros:**

- ✅ Full control over data
- ✅ No vendor lock-in
- ✅ Zero external costs (just database)
- ✅ Fast local queries (50-150ms)
- ✅ Custom features (RequestContext, tool validation)

**Cons:**

- ❌ Maintenance burden (migrations, backups, tuning)
- ❌ Scaling challenges (need to add infrastructure)
- ❌ No AI-native dashboards (need to build)
- ❌ Manual token tracking (via custom spans)
- ❌ No alerting (need to build)
- ❌ Storage costs grow linearly

### Axiom Managed

**Pros:**

- ✅ Zero operational overhead
- ✅ AI-native features (token tracking, cost dashboards)
- ✅ Pre-built dashboards
- ✅ Petabyte-scale automatically
- ✅ 95% compression (20x storage savings)
- ✅ Sub-second queries
- ✅ Built-in alerting
- ✅ OpenTelemetry standard

**Cons:**

- ❌ Vendor lock-in (mitigated by OTel standard)
- ❌ Network latency for queries
- ❌ Monthly costs (after free tier)
- ❌ 30-day retention on free tier (paid: configurable)

### Side-by-Side Comparison

| Feature             | Self-Hosted (Ours)             | Axiom Managed             | Winner            |
| ------------------- | ------------------------------ | ------------------------- | ----------------- |
| **Setup Time**      | 6 hours                        | 5-10 minutes              | Axiom             |
| **Maintenance**     | Ongoing (migrations, backups)  | Zero                      | Axiom             |
| **AI Features**     | Custom (manual token tracking) | Native (automatic)        | Axiom             |
| **Dashboards**      | Need to build                  | Pre-built                 | Axiom             |
| **Scaling**         | Manual                         | Automatic                 | Axiom             |
| **Query Speed**     | 50-150ms (local)               | Sub-second (serverless)   | Tie               |
| **Cost (dev)**      | $0                             | $0 (free tier)            | Tie               |
| **Cost (prod 1TB)** | ~$50/mo + ops time             | ~$28/month                | Axiom             |
| **Cost (prod 5TB)** | ~$200/mo + ops time            | ~$525/month               | Context-dependent |
| **Data Control**    | Full                           | Vendor-managed            | Self-hosted       |
| **Compression**     | 2-3x (JSONB)                   | 20x (95%)                 | Axiom             |
| **Retention**       | Custom (we control)            | 30 days free, paid: years | Self-hosted       |
| **Alerting**        | Need to build                  | Built-in                  | Axiom             |
| **Log Aggregation** | Need to add                    | Native                    | Axiom             |
| **Custom Features** | Full flexibility               | API/SDK limits            | Self-hosted       |

---

## Frontend Logging Alternatives Comparison

### Axiom vs Other Frontend Logging Solutions

| Feature                      | Axiom (@axiomhq/react) | LogTape             | Sentry          | LogRocket      | Datadog RUM       |
| ---------------------------- | ---------------------- | ------------------- | --------------- | -------------- | ----------------- |
| **Backend Integration**      | ⭐⭐⭐⭐⭐ Native      | ⭐⭐⭐ Universal    | ⭐⭐⭐ API      | ⭐⭐⭐ API     | ⭐⭐⭐⭐⭐ Native |
| **Web Vitals**               | ✅ Built-in            | ❌ Manual           | ✅ Built-in     | ✅ Built-in    | ✅ Built-in       |
| **Structured Logging**       | ✅ Native              | ✅ Native           | ⚠️ Limited      | ✅ Yes         | ✅ Native         |
| **Session Replay**           | ❌ No                  | ❌ No               | ✅ Yes          | ✅ Yes         | ✅ Yes            |
| **Error Tracking**           | ✅ Logs                | ❌ Logs only        | ⭐⭐⭐⭐⭐ Best | ⭐⭐⭐⭐ Good  | ⭐⭐⭐⭐ Good     |
| **Performance**              | ⭐⭐⭐⭐ Good          | ⭐⭐⭐⭐⭐ Best     | ⭐⭐⭐⭐ Good   | ⭐⭐⭐ Heavy   | ⭐⭐⭐⭐ Good     |
| **Bundle Size**              | Medium                 | ⭐⭐⭐⭐⭐ Tiny     | Medium          | Large          | Medium            |
| **TypeScript**               | ✅ Native              | ✅ Native           | ✅ Native       | ✅ Native      | ✅ Native         |
| **Cost (1K users)**          | $25-50/mo              | Free (need backend) | $26-80/mo       | $99-249/mo     | $1,500-3,000/mo   |
| **Learning Curve**           | Low                    | Low                 | Low             | Medium         | Medium            |
| **Unified Backend+Frontend** | ⭐⭐⭐⭐⭐ Yes         | ❌ Separate         | ❌ Separate     | ❌ Separate    | ✅ Yes            |
| **AI Telemetry**             | ⭐⭐⭐⭐⭐ Native      | ❌ Manual           | ❌ Manual       | ❌ Manual      | ⚠️ Custom         |
| **Free Tier**                | 500GB/mo               | N/A                 | 5K errors/mo    | 1K sessions/mo | Limited           |

### When to Use Each Solution

**Use Axiom (@axiomhq/react) if:**

- ✅ You want unified backend + frontend observability
- ✅ You're already using Axiom for backend/AI telemetry
- ✅ You need cost-effective structured logging at scale
- ✅ You want Web Vitals without expensive RUM
- ✅ You prefer logs over session replay

**Use Sentry if:**

- ✅ Error tracking is your primary concern
- ✅ You need best-in-class error grouping/deduplication
- ✅ You want session replay for error debugging
- ✅ You have budget for specialized error tracking

**Use LogRocket if:**

- ✅ Session replay is critical (video playback)
- ✅ You need Redux DevTools integration
- ✅ You're debugging complex user interactions
- ✅ You have enterprise budget

**Use Datadog RUM if:**

- ✅ You're already heavily invested in Datadog
- ✅ You need best-in-class full-stack correlation
- ✅ Budget is not a constraint
- ✅ You want enterprise-grade everything

**Use LogTape if:**

- ✅ You want minimal bundle size
- ✅ You only need logging (no RUM features)
- ✅ You're building your own aggregation
- ✅ You need universal runtime support (Deno, Bun, etc.)

### Recommended Hybrid Approach for FlowMaestro

**Option A: Axiom-Only (Simplest)**

- Frontend: @axiomhq/react → Axiom
- Backend: Pino → Axiom
- Cost: $50-75/month
- **Best for:** Unified observability, cost-effectiveness

**Option B: Axiom + Sentry (Best of Both)**

- Frontend Errors: Sentry (error tracking focus)
- Frontend Logs: @axiomhq/react → Axiom
- Backend: Pino → Axiom
- Cost: $75-100/month
- **Best for:** Enhanced error tracking + unified logs

**Option C: LogTape + Axiom (Minimal)**

- Frontend: LogTape → Backend endpoint → Axiom
- Backend: Pino → Axiom
- Cost: $50-75/month
- **Best for:** Smallest bundle size, full control

---

## Integration Strategies

### Option A: Backend-Only Hybrid Approach

**Architecture:**

```
┌─────────────────┐
│   FlowMaestro   │
│    Backend      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
    ┌────▼────┐       ┌────▼────┐
    │ SpanSvc │       │ Axiom   │
    │  Local  │       │ Exporter│
    └────┬────┘       └────┬────┘
         │                  │
    ┌────▼────┐       ┌────▼────┐
    │PostgreSQL│      │ Axiom   │
    │  (Fast) │       │ (Cloud) │
    └─────────┘       └─────────┘
```

**Implementation:**

```typescript
// backend/src/shared/observability/axiom-exporter.ts
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export class AxiomExporter {
    private exporter: OTLPTraceExporter;

    constructor() {
        this.exporter = new OTLPTraceExporter({
            url: "https://api.axiom.co/v1/traces",
            headers: {
                "Authorization": `Bearer ${process.env.AXIOM_TOKEN}`,
                "X-Axiom-Dataset": process.env.AXIOM_DATASET || "flowmaestro-traces"
            }
        });
    }

    async export(spans: Span[]): Promise<void> {
        // Convert to OTel format and export
        const otlpSpans = spans.map(this.convertToOTLP);
        await this.exporter.export(otlpSpans);
    }

    private convertToOTLP(span: Span): OTLPSpan {
        // Convert our span format to OTel format
    }
}

// Modify SpanService.flush()
async flush(): Promise<void> {
    if (this.spanBatch.length === 0) return;

    const spans = [...this.spanBatch];
    this.spanBatch = [];

    // Dual-write: PostgreSQL + Axiom (non-blocking)
    await Promise.allSettled([
        this.flushToPostgres(spans),
        this.flushToAxiom(spans)  // Best-effort, don't fail if Axiom down
    ]);
}
```

**Benefits:**

- ✅ Keep fast local queries (development)
- ✅ Get AI-native dashboards (production)
- ✅ Zero migration effort (additive change)
- ✅ Fallback if Axiom is down
- ✅ Easy to toggle on/off
- ✅ Best of both worlds

**Drawbacks:**

- Slight complexity (two backends)
- Need to manage Axiom credentials
- Small network overhead

**When to Use:**

- Development: Query PostgreSQL (fast, local)
- Production: View Axiom dashboards (managed, scalable)
- Debugging: Use both (local detail + long-term trends)

### Option B: Axiom-Only (Full Migration)

**Architecture:**

```
┌─────────────────┐
│   FlowMaestro   │
│    Backend      │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Axiom   │
    │   SDK   │
    └────┬────┘
         │
    ┌────▼────┐
    │ Axiom   │
    │ (Cloud) │
    └─────────┘
```

**Implementation:**

```typescript
// Replace SpanService with Axiom SDK
import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({
    token: process.env.AXIOM_TOKEN,
    dataset: "flowmaestro-traces"
});

// Send spans directly
await axiom.ingest("traces", spans);

// Query spans
const results = await axiom.query(`
    ['traces']
    | where userId == 'user-123'
    | where span_type == 'agent_run'
    | project timestamp, name, duration_ms, attributes
`);
```

**Benefits:**

- ✅ Simplest architecture
- ✅ Lowest maintenance
- ✅ Native AI features
- ✅ No local database needed

**Drawbacks:**

- ❌ Lose local query capability
- ❌ Vendor lock-in (mitigated by OTel)
- ❌ Network latency for all queries
- ❌ Migration effort (remove SpanService)

**When to Use:**

- Pure cloud deployment
- No local development needs
- Want minimal infrastructure
- Trust Axiom uptime

### Option C: PostgreSQL-Only (Current State)

**Keep our current setup, no Axiom integration**

**Benefits:**

- ✅ Full control
- ✅ No vendor costs
- ✅ No vendor dependencies

**Drawbacks:**

- ❌ No AI-native dashboards
- ❌ Manual token tracking
- ❌ Ongoing maintenance
- ❌ Scaling challenges

**When to Use:**

- Strict data sovereignty requirements
- Very small scale (< 100GB/month)
- Strong DevOps team available

### Option D: Full-Stack Hybrid (UPDATED RECOMMENDATION)

**Architecture:**

```
Frontend (@axiomhq/react) → Axiom (flowmaestro-frontend dataset)
Backend (Pino) → PostgreSQL (local) + Axiom (flowmaestro-backend dataset)
```

**Implementation:**

**Backend Setup** (same as Option A):

```typescript
// backend/src/shared/observability/axiom-exporter.ts
export class AxiomExporter {
    async export(spans: Span[]): Promise<void> {
        await this.otlpExporter.export({
            dataset: "flowmaestro-backend",
            spans: spans.map(this.convertToOTLP)
        });
    }
}
```

**Frontend Setup** (NEW):

```typescript
// frontend/src/lib/axiom.ts
import { createLogger } from "@axiomhq/logging";
import { AxiomJSTransport } from "@axiomhq/logging";

export const axiomConfig = {
    transports: [
        new AxiomJSTransport({
            token: import.meta.env.VITE_AXIOM_TOKEN,
            dataset: "flowmaestro-frontend"
        }),
        // Console in development
        ...(import.meta.env.DEV ? [consoleTransport()] : [])
    ],
    level: import.meta.env.PROD ? "info" : "debug"
};

// frontend/src/main.tsx
import { AxiomProvider, WebVitals } from "@axiomhq/react";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <AxiomProvider config={axiomConfig}>
        <WebVitals />
        <App />
    </AxiomProvider>
);

// In components
import { useLogger } from "@axiomhq/react";

function MyComponent() {
    const log = useLogger();
    log.info("User action", { action: "click", target: "button" });
}
```

**Benefits:**

- ✅ **Unified observability** across frontend and backend
- ✅ **Cross-stack correlation** via trace IDs
- ✅ **Web Vitals tracking** built-in
- ✅ Keep fast local queries (PostgreSQL for dev)
- ✅ **AI-native dashboards** for production
- ✅ **Cost-effective** ($50-75/month for 1K users)
- ✅ Separate datasets for clean domain separation
- ✅ **Best of all worlds**

**Drawbacks:**

- Slight complexity (manage two datasets)
- Need to manage Axiom tokens for both frontend and backend
- Frontend adds ~1-2TB/month data volume

**When to Use:**

- ✅ **You want full-stack visibility** (frontend + backend)
- ✅ You're building a SaaS product with web frontend
- ✅ You need Web Vitals and user behavior tracking
- ✅ You want unified debugging (user click → API → LLM)
- ✅ **RECOMMENDED for FlowMaestro** 🎯

---

## Recommended Integration Plan

### Phase 1: Add Axiom Exporter (1-2 hours)

**Goal**: Export spans to Axiom in parallel with PostgreSQL storage

**Tasks:**

1. Install Axiom packages

    ```bash
    npm install @axiomhq/js @opentelemetry/exporter-trace-otlp-http
    ```

2. Create Axiom account and get API token
    - Sign up: https://app.axiom.co
    - Create dataset: `flowmaestro-traces`
    - Generate API token

3. Add environment variables

    ```bash
    AXIOM_TOKEN=your_token_here
    AXIOM_DATASET=flowmaestro-traces
    AXIOM_ENABLED=true  # Toggle for dev/prod
    ```

4. Create AxiomExporter class
    - Location: `backend/src/shared/observability/axiom-exporter.ts`
    - Convert spans to OTel format
    - Export via OTLP HTTP

5. Update SpanService.flush()
    - Add dual-write to PostgreSQL and Axiom
    - Make Axiom export non-blocking (best-effort)
    - Add error handling (log but don't fail)

6. Test locally
    - Start backend
    - Trigger agent execution
    - Verify spans appear in Axiom dashboard

**Success Criteria:**

- ✅ Spans visible in Axiom dashboard
- ✅ Pre-built AI dashboard appears
- ✅ Token usage tracked automatically
- ✅ No impact on local query performance

**Estimated Time**: 1-2 hours

### Phase 2: Configure AI Dashboard (30 minutes)

**Goal**: Set up monitoring and alerting in Axiom

**Tasks:**

1. Configure pre-built AI dashboard
    - Token usage by model
    - Cost by capability
    - Latency distribution
    - Error rates

2. Set up monitors
    - High token usage alert (> 1M tokens/day)
    - High cost alert (> $100/day)
    - High error rate alert (> 5%)
    - Slow execution alert (p95 > 10s)

3. Configure integrations
    - Slack for critical alerts
    - Email for daily summaries

**Success Criteria:**

- ✅ Dashboard shows real-time metrics
- ✅ Alerts trigger correctly
- ✅ Team has visibility into costs

**Estimated Time**: 30 minutes

### Phase 2.5: Add Frontend Logging (NEW - 2-3 hours)

**Goal**: Integrate @axiomhq/react for frontend logging and Web Vitals tracking

**Tasks:**

1. **Install Axiom React packages**

    ```bash
    cd frontend
    npm install @axiomhq/react @axiomhq/logging
    ```

2. **Add environment variables**

    ```bash
    # frontend/.env
    VITE_AXIOM_TOKEN=your_token_here
    VITE_AXIOM_DATASET=flowmaestro-frontend
    ```

3. **Create Axiom config** (`frontend/src/lib/axiom.ts`)

    ```typescript
    import { AxiomJSTransport } from "@axiomhq/logging";

    export const axiomConfig = {
        transports: [
            new AxiomJSTransport({
                token: import.meta.env.VITE_AXIOM_TOKEN,
                dataset: "flowmaestro-frontend"
            }),
            ...(import.meta.env.DEV ? [consoleTransport()] : [])
        ],
        level: import.meta.env.PROD ? "info" : "debug"
    };
    ```

4. **Add provider to root** (`frontend/src/main.tsx`)

    ```typescript
    import { AxiomProvider, WebVitals } from "@axiomhq/react";
    import { axiomConfig } from "./lib/axiom";

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <AxiomProvider config={axiomConfig}>
            <WebVitals />
            <App />
        </AxiomProvider>
    );
    ```

5. **Replace console.log in key components**
    - WorkflowCanvas: Log node additions, workflow execution
    - API client: Log request/response, errors, latency
    - Error boundaries: Log React errors with stack traces

    ```typescript
    import { useLogger } from "@axiomhq/react";

    function WorkflowCanvas() {
        const log = useLogger();

        const handleNodeAdded = (nodeType: string) => {
            log.info("Node added", {
                event: "node_added",
                nodeType,
                workflowId: workflow.id
            });
        };
    }
    ```

6. **Add API request logging** (`frontend/src/lib/api.ts`)

    ```typescript
    import { createLogger } from "@axiomhq/logging";
    import { axiomConfig } from "./axiom";

    const log = createLogger(axiomConfig);

    class APIClient {
        async request(endpoint, options) {
            const startTime = Date.now();
            log.info("API request started", { endpoint, method: options?.method });

            try {
                const response = await fetch(`${API_URL}${endpoint}`, options);
                log.info("API request completed", {
                    endpoint,
                    status: response.status,
                    duration: Date.now() - startTime
                });
                return await response.json();
            } catch (error) {
                log.error("API request failed", {
                    endpoint,
                    error: error.message,
                    duration: Date.now() - startTime
                });
                throw error;
            }
        }
    }
    ```

7. **Test frontend logging**
    - Open browser DevTools → Network tab
    - Trigger user actions (create workflow, add nodes)
    - Verify logs sent to Axiom
    - Check Axiom dashboard for frontend data

8. **Create frontend dataset in Axiom**
    - Navigate to Axiom dashboard
    - Create new dataset: `flowmaestro-frontend`
    - Verify logs and Web Vitals appearing

**Success Criteria:**

- ✅ Web Vitals metrics appearing in Axiom
- ✅ User actions logged (workflow creation, node additions)
- ✅ API requests tracked with latency
- ✅ Errors captured with component context
- ✅ Frontend dashboard populated with data

**Estimated Time**: 2-3 hours

### Phase 3: Evaluate Value (1-2 weeks)

**Goal**: Assess whether Axiom provides sufficient value

**Metrics to Track:**

1. **Query Performance**
    - Local (PostgreSQL): measure query times
    - Axiom: measure query times
    - Compare usability

2. **Cost Analysis**
    - Axiom usage (GB ingested, storage, compute)
    - Backend data: ~1 TB/month
    - Frontend data: ~1-2 TB/month
    - Projected monthly cost (~$50-75 for 1K users)
    - Compare to self-hosted costs (infra + ops time)
    - Compare to Datadog ($4-9K/month for same features)

3. **Feature Utilization**
    - AI dashboard usage (backend)
    - Web Vitals dashboard usage (frontend)
    - Alert effectiveness
    - Query frequency
    - Dashboard views
    - Cross-stack trace queries

4. **Developer Experience**
    - Time saved on debugging
    - Insights gained from dashboards
    - Ease of querying (APL vs SQL)
    - Frontend error visibility
    - User journey tracking usefulness

5. **Frontend-Specific Metrics**
    - Web Vitals trends (LCP, FID, CLS)
    - User action tracking coverage
    - API error detection rate
    - Performance regression detection

**Decision Points:**

- If value > cost: Continue with Axiom, consider upgrading tier
- If value < cost: Disable Axiom, stick with PostgreSQL
- If unclear: Extend evaluation period

**Estimated Time**: 1-2 weeks of usage

### Phase 4: Optimize or Migrate (Optional)

**Option A: Optimize Full-Stack Hybrid**

- Fine-tune what data goes to Axiom (backend and frontend)
- Keep only production in Axiom
- Use PostgreSQL for backend dev/test
- Use console logging for frontend dev
- Implement sampling for high-volume events

**Option B: Full Migration to Axiom**

- Remove PostgreSQL span storage
- Use Axiom as primary backend for all data
- Keep RequestContext and tool validation
- Unified frontend + backend in Axiom only

**Option C: Add Sentry for Enhanced Error Tracking**

- Keep Axiom for logs and Web Vitals
- Add Sentry for frontend errors (session replay, advanced grouping)
- Cost: +$26/month for 10K errors
- Best of both worlds approach

**Option D: Remove Axiom**

- Disable Axiom exporter (backend and frontend)
- Enhance PostgreSQL dashboards
- Build custom alerting
- Use LogTape or alternative for frontend logging

---

## Technical Integration Details

### OpenTelemetry Compatibility

Axiom is fully compatible with OpenTelemetry, meaning:

1. **Our SpanService is compatible**
    - We use OTel-style attributes
    - We have trace/span IDs
    - We track parent-child relationships

2. **Conversion is straightforward**

    ```typescript
    // Our span format
    {
        traceId, spanId, parentSpanId,
        name, spanType, entityId,
        startedAt, endedAt, durationMs,
        input, output, error,
        attributes: { userId, modelId, tokens, ... }
    }

    // OTel format (what Axiom expects)
    {
        traceId, spanId, parentSpanId,
        name, kind,
        startTime, endTime,
        attributes: {
            "gen_ai.capability.name": entityId,
            "gen_ai.model": modelId,
            "gen_ai.prompt.tokens": tokens,
            "userId": userId,
            ...
        }
    }
    ```

3. **We can add AI-specific attributes**
    ```typescript
    // Enhance our spans with Axiom's AI attributes
    attributes: {
        "gen_ai.capability.name": "customer-support-agent",
        "gen_ai.step.name": "llm-generation",
        "gen_ai.model": "gpt-4o",
        "gen_ai.provider": "openai",
        "gen_ai.prompt.tokens": 100,
        "gen_ai.completion.tokens": 50,
        "gen_ai.total.tokens": 150,
        // ... our existing attributes
    }
    ```

### Axiom TypeScript SDK

```typescript
// @axiomhq/js - Core SDK
import { Axiom } from "@axiomhq/js";

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN });

// Ingest events
await axiom.ingest("dataset", [{ ... }]);

// Query with APL
const result = await axiom.query(`
    ['dataset']
    | where timestamp > ago(1h)
    | summarize count() by bin(timestamp, 5m)
`);

// @axiomhq/ai - AI-specific SDK (experimental)
import { trace } from "@axiomhq/ai";

const traced = trace(myLLMFunction, {
    capability: "customer-support",
    model: "gpt-4o"
});
```

### APL Query Language

Axiom uses APL (Axiom Processing Language), similar to KQL (Kusto Query Language):

```sql
-- Get all agent runs for a user in last 24h
['flowmaestro-traces']
| where timestamp > ago(24h)
| where span_type == "agent_run"
| where attributes.userId == "user-123"
| project timestamp, name, duration_ms, attributes.totalTokens
| order by timestamp desc

-- Token usage by model (last 7 days)
['flowmaestro-traces']
| where timestamp > ago(7d)
| where span_type == "model_generation"
| summarize
    total_tokens = sum(tolong(attributes["gen_ai.total.tokens"])),
    calls = count()
  by model = tostring(attributes["gen_ai.model"])
| extend cost = total_tokens * 0.00003  // $0.03 per 1K tokens
| order by cost desc

-- P95 latency by capability
['flowmaestro-traces']
| where span_type == "agent_run"
| summarize
    p95_duration = percentile(duration_ms, 95),
    count = count()
  by capability = tostring(attributes["gen_ai.capability.name"])
| order by p95_duration desc
```

### APL Queries for Frontend (NEW)

Frontend-specific queries for analyzing user behavior, performance, and errors:

```sql
-- Web Vitals performance trends
['flowmaestro-frontend']
| where metric_name in ("LCP", "FID", "CLS", "FCP", "TTFB")
| summarize avg_value = avg(toreal(value)) by bin(timestamp, 1h), metric_name
| render timechart

-- User journey funnel (workflow creation)
['flowmaestro-frontend']
| where event in ("workflow_opened", "node_added", "workflow_saved", "workflow_executed")
| where userId == "user-123"
| order by timestamp asc
| project timestamp, event, metadata

-- Top error-prone components
['flowmaestro-frontend']
| where level == "error"
| summarize error_count = count() by component_name
| order by error_count desc
| take 10

-- API request latency from frontend
['flowmaestro-frontend']
| where event_type == "api_request"
| summarize
    p50 = percentile(toreal(duration), 50),
    p95 = percentile(toreal(duration), 95),
    p99 = percentile(toreal(duration), 99),
    count = count()
  by endpoint
| order by p95 desc

-- User actions heat map (most common actions)
['flowmaestro-frontend']
| where event_type == "user_action"
| summarize action_count = count() by action_name, bin(timestamp, 1h)
| render heatmap

-- Frontend errors with stack traces
['flowmaestro-frontend']
| where level == "error"
| where timestamp > ago(24h)
| project timestamp, message, error_stack, component, userId, userAgent
| order by timestamp desc

-- Cross-stack trace (frontend → backend → AI)
['flowmaestro-frontend', 'flowmaestro-backend']
| where traceId == "abc-123-def"
| order by timestamp asc
| project
    timestamp,
    dataset,
    span_name,
    duration_ms,
    attributes.userId,
    attributes.endpoint,
    attributes.model

-- Slow page loads (LCP > 2.5s)
['flowmaestro-frontend']
| where metric_name == "LCP"
| where toreal(value) > 2500
| summarize slow_loads = count() by page_url
| order by slow_loads desc

-- Active users by route
['flowmaestro-frontend']
| where event_type == "page_view"
| where timestamp > ago(24h)
| summarize unique_users = dcount(userId) by route
| order by unique_users desc

-- API error rate by endpoint
['flowmaestro-frontend']
| where event_type == "api_request"
| summarize
    total_requests = count(),
    errors = countif(status >= 400)
  by endpoint
| extend error_rate = (errors * 100.0) / total_requests
| where error_rate > 1
| order by error_rate desc
```

---

## Customer Case Studies

### Temporal.io + Axiom (Relevant!)

**Source**: Blog post "Using pino & axiom for logging in TypeScript Worker for Temporal.io"

**Key Takeaways:**

- Temporal workflows generate significant log volume
- Axiom handles Temporal logs effectively
- Integration via Pino transport
- Cost-effective for high-volume workflows

**Our Relevance:**

- We use Temporal for workflows and agents
- We use Pino for logging
- Exact same use case!

### Cal.com (High-Volume SaaS)

**Quote**: "Axiom allows me to affordably see all my logs for a year"

**Key Takeaway:**

- Year-long retention is economically viable
- Previously cost-prohibitive with other tools

**Our Relevance:**

- Need long-term trace data for debugging
- Want to analyze historical patterns
- Cost is a concern at scale

### Vercel, Netlify (Edge Computing)

**Key Takeaway:**

- Axiom handles massive edge event volumes
- Serverless-friendly architecture
- Fast ingestion from distributed sources

**Our Relevance:**

- Distributed Temporal workers
- High event volume (agent iterations)
- Need real-time visibility

---

## Migration Considerations

### Data Retention Strategy

**Current (PostgreSQL):**

- Keep all spans indefinitely (until manual cleanup)
- Storage grows linearly
- Need to implement rotation

**With Axiom:**

- Free tier: 30-day retention
- Paid tier: Configurable (months to years)
- Automatic data lifecycle management

**Hybrid Strategy:**

- Short-term (7 days): PostgreSQL (fast queries)
- Long-term (30+ days): Axiom (analytics, compliance)
- Automatic archival after 7 days

### Query Migration

**Current (SQL):**

```sql
SELECT * FROM execution_spans
WHERE span_type = 'agent_run'
AND attributes->>'userId' = 'user-123'
ORDER BY started_at DESC;
```

**Axiom (APL):**

```sql
['flowmaestro-traces']
| where span_type == "agent_run"
| where attributes.userId == "user-123"
| order by timestamp desc
```

**Learning Curve**:

- APL is similar to SQL with piped operations
- Most queries translate directly
- Some PostgreSQL-specific functions need equivalents

### Cost Optimization

**Tips to Minimize Axiom Costs:**

1. **Filter at source**
    - Only export production spans
    - Skip debug/trace level spans
    - Sample high-frequency events

2. **Optimize attributes**
    - Use consistent attribute names
    - Avoid high-cardinality attributes
    - Keep attribute values concise

3. **Smart retention**
    - Short retention for verbose logs
    - Long retention for critical traces
    - Archive to S3 for compliance

4. **Query efficiently**
    - Use time filters (avoid full scans)
    - Leverage sampling for trends
    - Pre-aggregate when possible

5. **Monitor usage**
    - Set up cost alerts
    - Review usage dashboards weekly
    - Adjust ingestion as needed

---

## Risks & Mitigations

### Risk 1: Vendor Lock-In

**Risk**: Dependency on Axiom platform

**Mitigation**:

- Use OpenTelemetry standard (portable)
- Keep hybrid approach (can switch off Axiom)
- Export critical data to S3 for backup
- Maintain our SpanService as fallback

### Risk 2: Cost Overruns

**Risk**: Unexpected high costs at scale

**Mitigation**:

- Start with free tier (500GB/month)
- Set up spend alerts ($100, $500, $1000)
- Monitor usage dashboard daily
- Implement sampling if needed
- Can disable export anytime

### Risk 3: Network Dependency

**Risk**: Axiom unavailable → observability gap

**Mitigation**:

- Dual-write to PostgreSQL (fallback)
- Async export (doesn't block operations)
- Local buffering if network down
- Graceful degradation

### Risk 4: Data Privacy

**Risk**: Sensitive data exported to third party

**Mitigation**:

- Review data before enabling
- Scrub PII from span attributes
- Use field-level encryption if needed
- GDPR/CCPA compliance (Axiom is compliant)

### Risk 5: Learning Curve

**Risk**: Team unfamiliar with APL queries

**Mitigation**:

- APL is similar to SQL (easy transition)
- Extensive documentation available
- Pre-built dashboards (no queries needed)
- Can use both PostgreSQL and Axiom during transition

---

## Decision Framework

### Choose Axiom If:

✅ You want **AI-native observability** (token tracking, cost dashboards)
✅ You need **zero operational overhead** (no database maintenance)
✅ You're scaling **beyond 1TB/month** (compression saves money)
✅ You want **long-term retention** (year+) economically
✅ You value **pre-built dashboards** over custom building
✅ You're comfortable with **managed services** (less control)
✅ Your team prefers **fast iteration** over infrastructure work

### Keep Self-Hosted If:

✅ You have **strict data sovereignty** requirements
✅ You need **full control** over retention/queries
✅ You have **< 100GB/month** (self-hosted is cheaper)
✅ You have **strong DevOps team** (maintenance isn't a burden)
✅ You need **custom features** not available in Axiom
✅ You want **zero vendor dependencies**
✅ You prefer **infrastructure work** over monthly costs

### Use Hybrid If:

✅ You want **best of both worlds**
✅ You need **fast local queries** (development)
✅ You want **managed dashboards** (production)
✅ You're **evaluating** Axiom (no commitment)
✅ You want **gradual migration** (low risk)
✅ You need **fallback options** (high reliability)

---

## Conclusion

### Our Recommendation

**✅ YES - Integrate Axiom with Full-Stack Hybrid Approach**

**Why:**

1. **Keep our work** - SpanService, RequestContext, tool validation are valuable
2. **Add Axiom backend** - Get AI-native features for production
3. **Add Axiom frontend** - Get Web Vitals, user tracking, unified observability
4. **Low risk** - Additive changes, easy to disable
5. **Free to start** - 500GB/month covers development for both frontend + backend
6. **Production-proven** - Used by Vercel, Netlify, Asana, Cal.com
7. **Perfect timing** - Just completed Sprint 1, perfect to extend
8. **Cost-effective** - $50-75/month vs $4-9K/month for Datadog full-stack

**Full-Stack Benefits:**

- ✅ **Unified observability** across React frontend + Fastify backend
- ✅ **Cross-stack correlation** (user click → API → LLM trace)
- ✅ **Web Vitals tracking** (LCP, FID, CLS)
- ✅ **User journey tracking** (workflow creation funnel)
- ✅ **AI cost/token monitoring** (native AI dashboards)
- ✅ **Error tracking** across frontend and backend
- ✅ **95-98% cost savings** vs Datadog

**Implementation:**

- Phase 1 (1-2 hours): Add backend Axiom exporter
- Phase 2 (30 min): Configure backend dashboards
- **Phase 2.5 (2-3 hours): Add frontend logging** ⭐ NEW
- Phase 3 (1-2 weeks): Evaluate value (backend + frontend)
- Phase 4 (optional): Optimize or migrate

**Architecture:**

- Backend: Pino → PostgreSQL (local) + Axiom (flowmaestro-backend)
- Frontend: @axiomhq/react → Axiom (flowmaestro-frontend)
- Dashboards: Unified view in Axiom with cross-stack correlation

**Our Work Wasn't Wasted:**

- ✅ We understand observability deeply
- ✅ We have local querying for development (PostgreSQL)
- ✅ We can switch backends anytime (OpenTelemetry standard)
- ✅ We have RequestContext and tool validation (keep!)
- ✅ We have a solid foundation to build on
- ✅ SpanService remains for local dev (fast queries)

### Cost Summary

**For 1,000 Active Users:**

- Backend data: ~1 TB/month
- Frontend data: ~1-2 TB/month
- **Total Axiom cost: $50-75/month**
- **vs Datadog: $4,000-9,000/month**
- **Savings: 95-98%** 🎯

### Next Steps

1. **Complete Mastra-inspired changes** (Sprint 2-4)
    - ConversationManager
    - WorkingMemoryService
    - Multi-agent orchestration
    - Storage abstraction
    - Node-level suspend/resume

2. **Revisit Axiom integration** (After Sprint 4)
    - Implement Phase 1 (Backend Axiom exporter)
    - Implement Phase 2.5 (Frontend @axiomhq/react integration)
    - Configure separate datasets (flowmaestro-frontend, flowmaestro-backend)
    - Set up cross-stack correlation via trace IDs
    - Evaluate in production
    - Make go/no-go decision

3. **Document learnings**
    - Update this document with actual results
    - Share cost analysis (backend + frontend)
    - Provide integration guide
    - Document APL queries for common use cases
    - Share Web Vitals insights

---

## References

### Documentation

- Axiom Docs: https://axiom.co/docs
- OpenTelemetry Node.js: https://axiom.co/docs/guides/opentelemetry-nodejs
- AI SDK Integration: https://ai-sdk.dev/providers/observability/axiom
- Temporal + Axiom: https://pmbanugo.me/blog/how-to-collect-temporalio-logs-using-axiom-and-pino
- **React Integration: https://axiom.co/docs/send-data/react** ⭐ NEW
- **JavaScript Logging Libraries: https://axiom.co/blog/new-js-logging** ⭐ NEW

### Pricing

- Axiom Pricing: https://axiom.co/pricing
- Free Tier Details: 500GB/month, 30-day retention
- Cost Calculator: Available in Axiom dashboard
- **Frontend RUM Pricing: Included in data ingestion (no separate RUM fees)**

### SDKs

- @axiomhq/js: https://github.com/axiomhq/axiom-js
- @axiomhq/ai: https://github.com/axiomhq/ai (AI-specific SDK)
- **@axiomhq/react: React hooks and components** ⭐ NEW
- **@axiomhq/logging: Framework-agnostic core** ⭐ NEW
- **@axiomhq/nextjs: Next.js integration** ⭐ NEW
- OpenTelemetry: https://opentelemetry.io/docs/languages/js/

### Comparisons

- Axiom vs CloudWatch: 70% cost savings
- Axiom vs Datadog (backend): 90% cost savings
- **Axiom vs Datadog (full-stack): 95-98% cost savings** ⭐ NEW
- Axiom vs Self-Hosted: Operational overhead vs monthly cost
- **Axiom vs Sentry: Structured logging vs error tracking focus**
- **Axiom vs LogRocket: Logs/metrics vs session replay focus**

### Frontend Alternatives

- **Sentry: https://sentry.io** - Best for error tracking
- **LogRocket: https://logrocket.com** - Best for session replay
- **LogTape: https://logtape.org** - Lightweight universal logging
- **Datadog RUM: https://www.datadoghq.com/product/real-user-monitoring/** - Enterprise full-stack

---

**Document Status**: Complete with Frontend Analysis - Ready for implementation after Sprint 2-4
**Last Updated**: November 9, 2025 (Added frontend integration analysis)
**Author**: Development Team
**Next Review**: After Sprint 4 completion
