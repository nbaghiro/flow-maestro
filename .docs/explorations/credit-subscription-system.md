# Credit & Subscription System

## Executive Summary

This document outlines a comprehensive credit-based billing system for FlowMaestro's freemium model. The system tracks and charges credits for workflow executions, AI/LLM operations, integration calls, and resource-intensive operations.

### Key Decisions

| Decision          | Choice                                                    |
| ----------------- | --------------------------------------------------------- |
| Payment Provider  | Stripe (Phase 2)                                          |
| Overage Handling  | Block execution if insufficient credits                   |
| Credit Rollover   | Full rollover (unused credits carry forward indefinitely) |
| Failed Operations | Auto-refund credits                                       |
| Free Credits      | 100 credits for new users                                 |

---

## Research Findings Summary

### Billable Operations Discovered

| Category              | Count | Examples                                                    |
| --------------------- | ----- | ----------------------------------------------------------- |
| Workflow Node Types   | 22    | LLM, Vision, Audio, Embeddings, HTTP, Database, Integration |
| Integration Providers | 22    | Gmail, Slack, Teams, HubSpot, GitHub, Sheets, etc.          |
| AI/LLM Providers      | 4     | OpenAI, Anthropic, Google, Cohere                           |
| Trigger Types         | 4     | Manual, Scheduled, Webhook, API                             |

### Existing Tracking Infrastructure

The codebase already has span-based tracing that captures:

- `promptTokens`, `completionTokens`, `totalTokens` for LLM calls
- `duration_ms` for all operations
- `model`, `provider` identifiers
- `userId`, `workflowName`, `agentName` context
- Pre-aggregated `daily_analytics` and `hourly_analytics` tables

---

## Credit Tiers

### Tier 1: Free Operations (0 credits)

- **Logic nodes**: Conditional, Switch, Variable, Input/Output, Echo, Wait
- **CRUD API calls**: List, Get, Create, Update, Delete for workflows/agents/triggers
- **Authentication**: Login, register, OAuth flows
- **Analytics**: Viewing usage statistics

### Tier 2: Low Cost (1-5 credits)

| Operation                        | Credits | Rationale                    |
| -------------------------------- | ------- | ---------------------------- |
| Transform node execution         | 1       | Local data transformation    |
| Loop node (base)                 | 1       | Per iteration adds to cost   |
| Code node execution              | 2       | Sandboxed execution overhead |
| File parse (small <1MB)          | 2       | Local processing             |
| Integration list/read operations | 2-3     | Simple API calls             |

### Tier 3: Medium Cost (5-25 credits)

| Operation                 | Credits | Rationale                            |
| ------------------------- | ------- | ------------------------------------ |
| HTTP request              | 5       | External API call                    |
| Database query            | 5-10    | External DB connection               |
| Integration create/update | 10      | Write operations                     |
| Integration batch read    | 10-15   | Multiple items                       |
| File parse (1-10MB)       | 10      | Larger file processing               |
| Knowledge base query      | 15      | Embedding generation + vector search |
| Workflow execution (base) | 10      | Orchestration overhead               |
| Voice node (hangup)       | 5       | Simple telephony                     |

### Tier 4: High Cost (25-100 credits)

| Operation                | Credits | Rationale                       |
| ------------------------ | ------- | ------------------------------- |
| Integration batch write  | 25-50   | Multiple write operations       |
| File upload + processing | 30-50   | Storage + chunking + embeddings |
| Workflow generation (AI) | 50      | LLM call for generation         |
| Agent execution (base)   | 25      | Per agent run                   |
| Voice greet/listen/menu  | 25-50   | TTS/STT processing              |

### Tier 5: Token-Based (Variable)

| Operation           | Credits per Unit | Unit          |
| ------------------- | ---------------- | ------------- |
| LLM input tokens    | 0.001-0.01       | per token     |
| LLM output tokens   | 0.002-0.02       | per token     |
| Vision analysis     | 0.01             | per token     |
| Vision generation   | 50-100           | per image     |
| Audio transcription | 0.1              | per second    |
| Audio TTS           | 0.01             | per character |
| Embeddings          | 0.0001           | per token     |

---

## Provider-Specific Credit Multipliers

### LLM Providers

| Provider  | Model             | Multiplier | Rationale         |
| --------- | ----------------- | ---------- | ----------------- |
| OpenAI    | GPT-4o            | 1.0x       | Baseline          |
| OpenAI    | GPT-4             | 3.0x       | More expensive    |
| OpenAI    | GPT-3.5-turbo     | 0.1x       | Much cheaper      |
| Anthropic | Claude 3.5 Sonnet | 1.0x       | Similar to GPT-4o |
| Anthropic | Claude 3 Opus     | 5.0x       | Most expensive    |
| Anthropic | Claude 3 Haiku    | 0.1x       | Cheapest          |
| Google    | Gemini Pro        | 0.8x       | Slightly cheaper  |
| Google    | Gemini Flash      | 0.1x       | Very cheap        |
| Cohere    | Command           | 0.5x       | Mid-range         |

### Integration Providers

| Provider                | Multiplier | Rationale                 |
| ----------------------- | ---------- | ------------------------- |
| Gmail, Sheets, Calendar | 1.0x       | Standard Google APIs      |
| Slack, Teams            | 1.0x       | Standard messaging        |
| HubSpot                 | 1.5x       | Enterprise CRM complexity |
| WhatsApp, Instagram     | 2.0x       | Meta API fees             |
| GitHub                  | 1.0x       | Standard                  |

---

## Database Schema Design

### New Tables

```sql
-- Credit balance and usage tracking
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    balance INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0, -- Soft-locked during operations
    lifetime_credits INTEGER NOT NULL DEFAULT 0,
    lifetime_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_balance CHECK (balance >= 0),
    CONSTRAINT unique_user_credits UNIQUE (user_id)
);

-- Credit transactions ledger (append-only)
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL, -- positive for additions, negative for deductions
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus', 'subscription'

    -- Operation details
    operation_type VARCHAR(100), -- 'llm_call', 'workflow_execution', 'integration_call', etc.
    operation_id UUID, -- reference to execution/span

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit pricing configuration
CREATE TABLE credit_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(100) NOT NULL,
    operation_subtype VARCHAR(100), -- e.g., 'read', 'write', 'batch'
    base_credits INTEGER NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'per_call', -- 'per_call', 'per_token', 'per_second', etc.
    multiplier_config JSONB DEFAULT '{}', -- provider/model specific multipliers
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pricing UNIQUE (operation_type, operation_subtype)
);

-- Subscription plans
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'starter', 'pro', 'enterprise'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    monthly_credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL, -- 0 for free tier
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    features JSONB DEFAULT '{}',
    stripe_price_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'expired'
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Payment history (for Stripe integration)
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- 'succeeded', 'failed', 'pending', 'refunded'
    payment_type VARCHAR(50) NOT NULL, -- 'subscription', 'credit_pack', 'one_time'
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_operation_type ON credit_transactions(operation_type);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_stripe_payment_intent ON payment_history(stripe_payment_intent_id);

-- Add Stripe fields to users table
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE;
```

### Seed Data

```sql
-- Seed subscription plans
INSERT INTO subscription_plans (slug, name, description, monthly_credits, price_cents, features) VALUES
('free', 'Free', 'Get started with FlowMaestro', 100, 0,
 '{"max_workflows": 5, "max_agents": 2, "max_knowledge_bases": 1, "max_kb_chunks": 100}'),
('starter', 'Starter', 'For individuals and small teams', 1000, 1900,
 '{"max_workflows": 25, "max_agents": 10, "max_knowledge_bases": 5, "max_kb_chunks": 1000}'),
('pro', 'Pro', 'For growing businesses', 5000, 4900,
 '{"max_workflows": -1, "max_agents": -1, "max_knowledge_bases": 20, "max_kb_chunks": 10000}');

-- Seed credit pricing
INSERT INTO credit_pricing (operation_type, operation_subtype, base_credits, unit, multiplier_config) VALUES
-- Node types
('node_conditional', NULL, 0, 'per_call', '{}'),
('node_switch', NULL, 0, 'per_call', '{}'),
('node_variable', NULL, 0, 'per_call', '{}'),
('node_transform', NULL, 1, 'per_call', '{}'),
('node_loop', NULL, 1, 'per_call', '{}'),
('node_code', NULL, 2, 'per_call', '{}'),
('node_http', NULL, 5, 'per_call', '{}'),
('node_database', NULL, 5, 'per_call', '{}'),

-- LLM operations
('llm_input_tokens', NULL, 1, 'per_token',
 '{"openai": {"gpt-4": 3.0, "gpt-4o": 1.0, "gpt-3.5-turbo": 0.1}, "anthropic": {"claude-3-opus": 5.0, "claude-3-sonnet": 1.0, "claude-3-haiku": 0.1}, "google": {"gemini-pro": 0.8, "gemini-flash": 0.1}}'),
('llm_output_tokens', NULL, 2, 'per_token',
 '{"openai": {"gpt-4": 3.0, "gpt-4o": 1.0, "gpt-3.5-turbo": 0.1}, "anthropic": {"claude-3-opus": 5.0, "claude-3-sonnet": 1.0, "claude-3-haiku": 0.1}, "google": {"gemini-pro": 0.8, "gemini-flash": 0.1}}'),

-- Vision operations
('vision_analyze', NULL, 1, 'per_token', '{}'),
('vision_generate', NULL, 75, 'per_image', '{}'),

-- Audio operations
('audio_transcribe', NULL, 10, 'per_second', '{}'),
('audio_tts', NULL, 1, 'per_character', '{}'),

-- Embeddings
('embeddings', NULL, 1, 'per_token', '{}'),

-- Knowledge base
('kb_query', NULL, 15, 'per_call', '{}'),
('kb_document_upload', NULL, 30, 'per_call', '{}'),

-- Integration operations
('integration_read', NULL, 2, 'per_call', '{"hubspot": 1.5, "whatsapp": 1.5, "instagram": 1.5}'),
('integration_write', NULL, 5, 'per_call', '{"hubspot": 1.5, "whatsapp": 2.0, "instagram": 2.0, "gmail": 2.0}'),
('integration_batch', NULL, 15, 'per_call', '{"hubspot": 1.5}'),

-- Workflow/Agent operations
('workflow_execution', NULL, 10, 'per_call', '{}'),
('workflow_generation', NULL, 50, 'per_call', '{}'),
('agent_execution', NULL, 25, 'per_call', '{}'),

-- Voice operations
('voice_greet', NULL, 25, 'per_call', '{}'),
('voice_listen', NULL, 30, 'per_call', '{}'),
('voice_menu', NULL, 35, 'per_call', '{}');
```

---

## Credit Check Flow

```
User initiates operation
    ↓
Estimate credit cost
    ↓
Check user balance >= estimated cost
    ↓
┌─ Insufficient credits ─────────────────┐
│  Return 402 Payment Required           │
│  Include: required, available, shortfall│
└────────────────────────────────────────┘
    ↓
Reserve credits (soft lock)
    ↓
Execute operation
    ↓
┌─ Success ──────────────────────────────┐
│  Deduct actual cost from balance       │
│  Release any excess reservation        │
└────────────────────────────────────────┘
    ↓
┌─ Failure ──────────────────────────────┐
│  Auto-refund reserved credits          │
│  Log refund transaction                │
└────────────────────────────────────────┘
```

---

## Backend Implementation

### Credit Service Interface

**File:** `backend/src/services/CreditService.ts`

```typescript
interface CreditService {
    // Balance management
    getBalance(userId: string): Promise<GetBalanceResponse>;
    hasCredits(userId: string, amount: number): Promise<boolean>;

    // Reservations (for long-running operations)
    reserveCredits(params: ReserveCreditsParams): Promise<ReserveCreditsResult>;
    finalizeReservation(
        userId: string,
        reservedAmount: number,
        actualAmount: number,
        params: DeductCreditsParams
    ): Promise<CreditTransaction>;
    releaseReservation(userId: string, reservedAmount: number): Promise<void>;

    // Transactions
    deductCredits(params: DeductCreditsParams): Promise<CreditTransaction>;
    addCredits(params: AddCreditsParams): Promise<CreditTransaction>;
    refundCredits(params: RefundCreditsParams): Promise<CreditTransaction>;

    // History
    getTransactionHistory(
        userId: string,
        options: PaginationOptions
    ): Promise<{ transactions: CreditTransaction[]; total: number }>;
}
```

### Credit Middleware

**File:** `backend/src/api/middleware/credits.ts`

```typescript
export const requireCredits = (options: {
    operationType: OperationType;
    operationSubtype?: string;
    getCostParams?: (request: FastifyRequest) => {
        provider?: string;
        model?: string;
        estimatedUnits?: number;
    };
    fixedCost?: number;
}) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.code(401).send({ error: "Unauthorized" });
        }

        const estimatedCost =
            options.fixedCost ??
            (await creditPricingService.calculateCost({
                operationType: options.operationType,
                ...options.getCostParams?.(request)
            }));

        const hasCredits = await creditService.hasCredits(userId, estimatedCost);

        if (!hasCredits) {
            const balance = await creditService.getBalance(userId);
            return reply.code(402).send({
                error: "Insufficient credits",
                code: "INSUFFICIENT_CREDITS",
                required: estimatedCost,
                available: balance.available,
                shortfall: estimatedCost - balance.available
            });
        }

        (request as any).estimatedCreditCost = estimatedCost;
    };
};
```

### Credit Deduction Points

| Location           | File                                                                     | Operation                |
| ------------------ | ------------------------------------------------------------------------ | ------------------------ |
| Workflow execution | `backend/src/temporal/workflows/orchestrator-workflow.ts`                | Per-node deduction       |
| Agent execution    | `backend/src/temporal/workflows/agent-orchestrator-workflow.ts`          | Per-iteration deduction  |
| LLM calls          | `backend/src/temporal/activities/node-executors/llm-executor.ts`         | Token-based deduction    |
| Integration calls  | `backend/src/temporal/activities/node-executors/integration-executor.ts` | Per-call deduction       |
| Vision             | `backend/src/temporal/activities/node-executors/vision-executor.ts`      | Image processing billing |
| Audio              | `backend/src/temporal/activities/node-executors/audio-executor.ts`       | Audio processing billing |
| Embeddings         | `backend/src/temporal/activities/node-executors/embeddings-executor.ts`  | Embedding billing        |
| KB document upload | `backend/src/api/routes/knowledge-bases/upload.ts`                       | Processing deduction     |
| KB query           | `backend/src/api/routes/knowledge-bases/query.ts`                        | Query deduction          |

---

## API Endpoints

### Credit Routes (`/api/credits`)

| Method | Path                        | Description                 |
| ------ | --------------------------- | --------------------------- |
| GET    | `/api/credits/balance`      | Get current credit balance  |
| GET    | `/api/credits/transactions` | Get transaction history     |
| POST   | `/api/credits/estimate`     | Estimate cost for operation |
| GET    | `/api/credits/pricing`      | Get pricing configuration   |

### Subscription Routes (`/api/subscriptions`)

| Method | Path                            | Description                       |
| ------ | ------------------------------- | --------------------------------- |
| GET    | `/api/subscriptions/plans`      | List available plans              |
| GET    | `/api/subscriptions/current`    | Get user's current subscription   |
| POST   | `/api/subscriptions/checkout`   | Create Stripe checkout session    |
| POST   | `/api/subscriptions/portal`     | Create billing portal session     |
| POST   | `/api/subscriptions/cancel`     | Cancel subscription               |
| POST   | `/api/subscriptions/reactivate` | Reactivate cancelled subscription |
| POST   | `/api/subscriptions/webhook`    | Stripe webhook handler            |

---

## Freemium Plan Structure

### Free Tier

- **Monthly credits**: 100
- **Features**:
    - 5 workflows max
    - 2 agents max
    - 1 knowledge base (100 chunks)
    - Basic integrations only
    - Community support

### Starter ($19/month)

- **Monthly credits**: 1,000
- **Features**:
    - 25 workflows
    - 10 agents
    - 5 knowledge bases
    - All integrations
    - Email support

### Pro ($49/month)

- **Monthly credits**: 5,000
- **Features**:
    - Unlimited workflows
    - Unlimited agents
    - 20 knowledge bases
    - Priority execution
    - Priority support

### Enterprise (Custom)

- **Monthly credits**: Custom
- **Features**:
    - Everything in Pro
    - Custom integrations
    - SSO/SAML
    - Dedicated support
    - SLA

### Credit Packs (One-time)

- 500 credits - $9
- 1,000 credits - $15
- 5,000 credits - $59
- 10,000 credits - $99

---

## Frontend Implementation

### Zustand Store

```typescript
// frontend/src/stores/creditsStore.ts
interface CreditsState {
    balance: GetBalanceResponse | null;
    transactions: CreditTransaction[];
    transactionsTotal: number;
    isLoading: boolean;
    error: string | null;

    fetchBalance: () => Promise<void>;
    fetchTransactions: (page?: number, limit?: number) => Promise<void>;
    estimateCost: (request: EstimateCostRequest) => Promise<EstimateCostResponse>;
    refreshAll: () => Promise<void>;
}
```

### Components

- `CreditBalance.tsx` - Balance display for header
- `TransactionHistory.tsx` - Transaction table with pagination
- `UsageChart.tsx` - Credit usage over time visualization
- `PricingReference.tsx` - Operation cost reference
- `InsufficientCreditsDialog.tsx` - Block dialog when insufficient credits
- `PurchaseCredits.tsx` - Credit pack purchase UI
- `SubscriptionPlans.tsx` - Subscription plan selection
- `SubscriptionManager.tsx` - Manage current subscription

---

## Stripe Integration

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER_MONTHLY=price_xxx
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_CREDITS_500=price_xxx
STRIPE_PRICE_CREDITS_1000=price_xxx
STRIPE_PRICE_CREDITS_5000=price_xxx
STRIPE_PRICE_CREDITS_10000=price_xxx
```

### Stripe Products Setup

**Subscription Products:**

```javascript
// Starter Plan - $19/month
{ name: "FlowMaestro Starter", metadata: { plan_slug: "starter", monthly_credits: "1000" } }

// Pro Plan - $49/month
{ name: "FlowMaestro Pro", metadata: { plan_slug: "pro", monthly_credits: "5000" } }
```

**Credit Pack Products:**

```javascript
{ name: "500 Credits", metadata: { credits: "500", type: "credit_pack" }, prices: [{ unit_amount: 900 }] }
{ name: "1,000 Credits", metadata: { credits: "1000", type: "credit_pack" }, prices: [{ unit_amount: 1500 }] }
{ name: "5,000 Credits", metadata: { credits: "5000", type: "credit_pack" }, prices: [{ unit_amount: 5900 }] }
{ name: "10,000 Credits", metadata: { credits: "10000", type: "credit_pack" }, prices: [{ unit_amount: 9900 }] }
```

### Webhook Events to Handle

- `checkout.session.completed` - Credit pack purchase
- `customer.subscription.created` - New subscription (grant credits)
- `customer.subscription.updated` - Plan change
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.paid` - Monthly credit top-up
- `invoice.payment_failed` - Payment failed (update status)

### Stripe Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# Test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Requires auth: 4000 0025 0000 3155
```

---

## Implementation Phases

### Phase 1: Credit Tracking + UI (Current Scope)

1. **Database Schema** - Create tables and seed data
2. **Backend Services** - CreditService, CreditPricingService, CreditRepository
3. **API Endpoints** - Balance, transactions, estimate, pricing
4. **Integration Points** - Add credit deduction to executors
5. **Frontend** - Balance display, credits page, insufficient credits dialog
6. **New User Setup** - Grant 100 credits on registration

### Phase 2: Stripe Payments (Future)

1. **Stripe Service** - Customer management, checkout sessions, webhooks
2. **Subscription Routes** - Plans, checkout, portal, cancel, reactivate
3. **Frontend** - Purchase credits, subscription plans UI
4. **Webhook Handlers** - Process Stripe events

---

## Files to Create/Modify

### New Files - Backend

```
backend/src/
├── services/
│   ├── CreditService.ts
│   ├── CreditPricingService.ts
│   └── StripeService.ts (Phase 2)
├── storage/
│   ├── repositories/
│   │   └── CreditRepository.ts
│   └── migrations/
│       └── XXXX_create_credits_tables.sql
├── api/
│   ├── middleware/
│   │   └── credits.ts
│   └── routes/
│       ├── credits/
│       │   ├── index.ts
│       │   ├── balance.ts
│       │   ├── transactions.ts
│       │   ├── estimate.ts
│       │   └── pricing.ts
│       └── subscriptions/ (Phase 2)
│           ├── index.ts
│           ├── plans.ts
│           ├── current.ts
│           ├── checkout.ts
│           ├── portal.ts
│           ├── cancel.ts
│           ├── reactivate.ts
│           └── webhook.ts
```

### New Files - Frontend

```
frontend/src/
├── pages/
│   └── Credits.tsx
├── stores/
│   └── creditsStore.ts
├── components/
│   └── credits/
│       ├── CreditBalance.tsx
│       ├── TransactionHistory.tsx
│       ├── UsageChart.tsx
│       ├── PricingReference.tsx
│       ├── InsufficientCreditsDialog.tsx
│       ├── PurchaseCredits.tsx (Phase 2)
│       ├── SubscriptionPlans.tsx (Phase 2)
│       └── SubscriptionManager.tsx (Phase 2)
```

### New Files - Shared

```
shared/src/types/
├── credits.ts
└── stripe.ts (Phase 2)
```

### Modified Files - Backend

| File                                                                     | Change                              |
| ------------------------------------------------------------------------ | ----------------------------------- |
| `backend/src/api/server.ts`                                              | Register credit/subscription routes |
| `backend/src/api/routes/auth/register.ts`                                | Grant 100 credits on signup         |
| `backend/src/temporal/workflows/orchestrator-workflow.ts`                | Add credit deduction per node       |
| `backend/src/temporal/workflows/agent-orchestrator-workflow.ts`          | Add credit deduction per iteration  |
| `backend/src/temporal/activities/node-executors/llm-executor.ts`         | Token-based billing                 |
| `backend/src/temporal/activities/node-executors/integration-executor.ts` | Per-call billing                    |
| `backend/src/temporal/activities/node-executors/vision-executor.ts`      | Image processing billing            |
| `backend/src/temporal/activities/node-executors/audio-executor.ts`       | Audio processing billing            |
| `backend/src/temporal/activities/node-executors/embeddings-executor.ts`  | Embedding billing                   |
| `backend/src/api/routes/knowledge-bases/upload.ts`                       | Document processing billing         |
| `backend/src/api/routes/knowledge-bases/query.ts`                        | Query billing                       |

### Modified Files - Frontend

| File                                                       | Change                                           |
| ---------------------------------------------------------- | ------------------------------------------------ |
| `frontend/src/App.tsx`                                     | Add `/credits` route                             |
| `frontend/src/components/common/Header.tsx`                | Add credit balance display                       |
| `frontend/src/components/canvas/ExecuteWorkflowDialog.tsx` | Add cost estimate + insufficient credits warning |

---

## Security Considerations

1. **Webhook Signature Verification** - Always verify Stripe webhook signatures
2. **Idempotency** - Handle duplicate webhook events gracefully
3. **Raw Body** - Webhook needs raw body for signature verification
4. **HTTPS Only** - Stripe requires HTTPS in production
5. **Price ID Validation** - Validate price IDs server-side, don't trust client
6. **Customer Portal** - Use Stripe's portal for sensitive operations (card updates)
7. **Transaction Integrity** - Use database transactions for credit operations

---

## Migration Strategy for Existing Users

```sql
-- Grant existing users the signup bonus
INSERT INTO user_credits (user_id, balance, lifetime_credits)
SELECT id, 100, 100 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Record the migration bonus
INSERT INTO credit_transactions (user_id, amount, balance_before, balance_after, transaction_type, description)
SELECT id, 100, 0, 100, 'adjustment', 'Migration bonus - existing user'
FROM users
WHERE id NOT IN (SELECT user_id FROM credit_transactions WHERE transaction_type = 'adjustment' AND description LIKE 'Migration%');
```
