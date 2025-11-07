# Paragon Integration Implementation Guide

## Overview

This document provides complete implementation instructions for integrating Paragon into FlowMaestro, replacing the existing custom OAuth system (Slack, Google, Notion) and enhancing MCP server capabilities with access to 130+ integrations.

**What is Paragon?**

- Embedded iPaaS (Integration Platform as a Service)
- Provides 130+ pre-built integrations (CRM, communication, file storage, project management, etc.)
- 1000+ pre-built actions via ActionKit API
- Handles OAuth flows, token refresh, and credential management automatically
- MCP server support for AI agents

**What We're Replacing:**

- Custom OAuth implementation (`backend/src/services/oauth/`)
- Manual token refresh logic
- Individual OAuth provider configurations
- Limited to 3 OAuth integrations → Expanding to 130+

**What We're Keeping:**

- API key connections (OpenAI, Anthropic, etc.)
- Existing MCP server connections (can coexist with Paragon)
- Connections table structure (extended with Paragon fields)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FlowMaestro Frontend                       │
│  ┌─────────────────┐         ┌──────────────────────┐       │
│  │ Connections Page │ ◄─────► │ Paragon Connect SDK  │       │
│  │ Workflow Canvas  │         │ (OAuth Flows)        │       │
│  └─────────────────┘         └──────────────────────┘       │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ JWT Token (RS256)
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                    FlowMaestro Backend                         │
│  ┌──────────────┐   ┌─────────────────┐   ┌───────────────┐ │
│  │ Token Manager│   │ ActionKit Client│   │ Webhook Handler│ │
│  └──────────────┘   └─────────────────┘   └───────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │         Temporal Workflow Activities                      │ │
│  │  - Paragon Action Executor                                │ │
│  │  - Execute 1000+ actions from 130+ integrations           │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ REST API Calls
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                      Paragon Platform                          │
│  ┌───────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ ActionKit API │  │   Proxy API     │  │   Webhooks     │  │
│  │ (1000+ actions)│  │ (Direct calls)  │  │   (Events)     │  │
│  └───────────────┘  └─────────────────┘  └────────────────┘  │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         │ OAuth + API Calls
                         │
┌────────────────────────▼──────────────────────────────────────┐
│              Third-Party APIs (130+ Integrations)              │
│  Salesforce, HubSpot, Slack, Google Drive, Jira, Asana, ...   │
└────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### 1. Paragon Account Setup

1. **Create Account:** Sign up at https://useparagon.com
2. **Create Project:** Dashboard → New Project → "FlowMaestro"
3. **Generate Signing Key:**
    - Navigate to: Settings → SDK Setup
    - Click "Generate New Key"
    - Download RSA private key (PEM format)
    - **IMPORTANT:** Store securely, never commit to version control

4. **Get Project ID:**
    - Found in dashboard URL: `https://dashboard.useparagon.com/projects/{PROJECT_ID}`
    - Or: Settings → Project Settings → Project ID

5. **Enable Integrations:**
    - Dashboard → Integrations
    - Enable all integrations you want to support
    - Configure OAuth credentials (Paragon provides test credentials for development)

### 2. Environment Variables

Add to `backend/.env`:

```env
# Paragon Configuration
PARAGON_PROJECT_ID=your-project-uuid-here
PARAGON_SIGNING_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"
PARAGON_WEBHOOK_SECRET=your-webhook-secret-here

# Optional: Use file path instead of inline key
# PARAGON_SIGNING_KEY_PATH=/secure/path/to/signing-key.pem
```

Add to `frontend/.env`:

```env
VITE_PARAGON_PROJECT_ID=your-project-uuid-here
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install @useparagon/connect

# Backend
cd backend
npm install jsonwebtoken @types/jsonwebtoken
```

---

## Implementation Phases

## Phase 1: Database Schema & Core Services

### 1.1 Database Migration

**File:** `backend/migrations/YYYYMMDDHHMMSS_add-paragon-support.sql`

```sql
-- Add Paragon fields to connections table
ALTER TABLE flowmaestro.connections ADD COLUMN IF NOT EXISTS
    paragon_user_id VARCHAR(255),
    paragon_integration_id VARCHAR(255),
    paragon_credential_id VARCHAR(255),
    paragon_metadata JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_paragon_user
    ON flowmaestro.connections(paragon_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_paragon_integration
    ON flowmaestro.connections(paragon_integration_id);
CREATE INDEX IF NOT EXISTS idx_connections_paragon_credential
    ON flowmaestro.connections(paragon_credential_id);

-- Add constraint to ensure Paragon connections have credential_id
ALTER TABLE flowmaestro.connections ADD CONSTRAINT chk_paragon_credential
    CHECK (
        (connection_method = 'paragon' AND paragon_credential_id IS NOT NULL) OR
        (connection_method != 'paragon')
    );
```

Run migration:

```bash
npm run db:migrate
```

### 1.2 TypeScript Types

**File:** `backend/src/services/paragon/types.ts`

```typescript
export interface ParagonConfig {
    projectId: string;
    signingKey: string;
    webhookSecret: string;
}

export interface ParagonUserToken {
    token: string;
    userId: string;
    expiresAt: number;
}

export interface ParagonIntegration {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    credentialId?: string;
    credentialStatus?: "valid" | "invalid" | "expired";
    metadata?: Record<string, any>;
}

export interface ParagonAction {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, any>;
            required: string[];
        };
    };
}

export interface ActionKitExecuteRequest {
    action: string;
    parameters: Record<string, any>;
}

export interface ActionKitExecuteResponse {
    success?: boolean;
    data?: any;
    error?: {
        message: string;
        type: string;
        code?: number;
    };
}

export interface ParagonWebhookPayload {
    event: string;
    integration: string;
    credentialId: string;
    userId: string;
    timestamp: number;
    data: Record<string, any>;
}
```

### 1.3 Paragon Token Manager

**File:** `backend/src/services/paragon/ParagonTokenManager.ts`

```typescript
import jwt from "jsonwebtoken";
import { ParagonConfig, ParagonUserToken } from "./types";

export class ParagonTokenManager {
    private config: ParagonConfig;

    constructor(config: ParagonConfig) {
        this.config = config;
    }

    /**
     * Generate JWT token for Paragon authentication
     * Token format: RS256 signed JWT with specific claims
     */
    generateUserToken(userId: string): ParagonUserToken {
        const currentTime = Math.floor(Date.now() / 1000);
        const expiresIn = 3600; // 1 hour

        const token = jwt.sign(
            {
                sub: userId, // Subject: User ID
                aud: `useparagon.com/${this.config.projectId}`, // Audience
                iat: currentTime, // Issued at
                exp: currentTime + expiresIn // Expires in 1 hour
            },
            this.config.signingKey,
            { algorithm: "RS256" }
        );

        return {
            token,
            userId,
            expiresAt: (currentTime + expiresIn) * 1000 // Convert to milliseconds
        };
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        const crypto = require("crypto");
        const hmac = crypto.createHmac("sha256", this.config.webhookSecret);
        hmac.update(payload);
        const expectedSignature = `sha256=${hmac.digest("hex")}`;

        try {
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
        } catch {
            return false;
        }
    }
}
```

### 1.4 ActionKit API Client

**File:** `backend/src/services/paragon/ParagonActionKitClient.ts`

```typescript
import axios, { AxiosInstance } from "axios";
import { ParagonAction, ActionKitExecuteRequest, ActionKitExecuteResponse } from "./types";

export class ParagonActionKitClient {
    private client: AxiosInstance;
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
        this.client = axios.create({
            baseURL: "https://actionkit.useparagon.com",
            timeout: 30000
        });
    }

    /**
     * Fetch available actions for a user
     * @param userToken - Paragon user JWT token
     * @param options - Optional filters
     */
    async getActions(
        userToken: string,
        options?: {
            format?: "json_schema" | "anthropic" | "vercel";
            categories?: string[];
            reloadFields?: boolean;
        }
    ): Promise<ParagonAction[]> {
        const params = new URLSearchParams();
        if (options?.format) params.append("format", options.format);
        if (options?.categories) params.append("categories", options.categories.join(","));
        if (options?.reloadFields) params.append("reload_fields", "true");

        const response = await this.client.get(
            `/projects/${this.projectId}/actions?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.actions || [];
    }

    /**
     * Execute an action
     * @param userToken - Paragon user JWT token
     * @param request - Action name and parameters
     */
    async executeAction(
        userToken: string,
        request: ActionKitExecuteRequest
    ): Promise<ActionKitExecuteResponse> {
        try {
            const response = await this.client.post(
                `/projects/${this.projectId}/actions`,
                request,
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error: any) {
            if (error.response?.data?.error) {
                return {
                    success: false,
                    error: error.response.data.error
                };
            }

            return {
                success: false,
                error: {
                    message: error.message || "Unknown error",
                    type: "INTERNAL_ERROR"
                }
            };
        }
    }

    /**
     * Make direct API call to integration provider via Proxy API
     * @param userToken - Paragon user JWT token
     * @param integration - Integration name (e.g., "slack", "salesforce")
     * @param method - HTTP method
     * @param path - API path
     * @param body - Request body (optional)
     */
    async proxyRequest(
        userToken: string,
        integration: string,
        method: string,
        path: string,
        body?: any
    ): Promise<any> {
        const proxyClient = axios.create({
            baseURL: "https://proxy.useparagon.com",
            timeout: 30000
        });

        const response = await proxyClient.request({
            method,
            url: `/projects/${this.projectId}/sdk/proxy/${integration}/${path}`,
            headers: {
                Authorization: `Bearer ${userToken}`,
                "Content-Type": "application/json"
            },
            data: body
        });

        return response.data;
    }
}
```

### 1.5 Main Paragon Service

**File:** `backend/src/services/paragon/ParagonService.ts`

```typescript
import { ParagonTokenManager } from "./ParagonTokenManager";
import { ParagonActionKitClient } from "./ParagonActionKitClient";
import { ParagonConfig } from "./types";

export class ParagonService {
    private tokenManager: ParagonTokenManager;
    private actionKitClient: ParagonActionKitClient;
    private config: ParagonConfig;

    constructor() {
        this.config = {
            projectId: process.env.PARAGON_PROJECT_ID || "",
            signingKey: process.env.PARAGON_SIGNING_KEY || "",
            webhookSecret: process.env.PARAGON_WEBHOOK_SECRET || ""
        };

        this.tokenManager = new ParagonTokenManager(this.config);
        this.actionKitClient = new ParagonActionKitClient(this.config.projectId);
    }

    /**
     * Generate Paragon user token for frontend authentication
     */
    generateUserToken(userId: string) {
        return this.tokenManager.generateUserToken(userId);
    }

    /**
     * Get available actions for user
     */
    async getAvailableActions(userId: string, categories?: string[]) {
        const { token } = this.tokenManager.generateUserToken(userId);
        return await this.actionKitClient.getActions(token, { categories });
    }

    /**
     * Execute an action
     */
    async executeAction(userId: string, action: string, parameters: Record<string, any>) {
        const { token } = this.tokenManager.generateUserToken(userId);
        return await this.actionKitClient.executeAction(token, { action, parameters });
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        return this.tokenManager.verifyWebhookSignature(payload, signature);
    }

    /**
     * Get Paragon configuration
     */
    getConfig() {
        return {
            projectId: this.config.projectId
        };
    }
}
```

---

## Phase 2: Backend API Routes

### 2.1 Token Generation Endpoint

**File:** `backend/src/api/routes/paragon/token.ts`

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { ParagonService } from "../../../services/paragon/ParagonService";

export async function getParagonTokenHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user.id;

    const paragonService = new ParagonService();
    const tokenData = paragonService.generateUserToken(userId);

    reply.send({
        success: true,
        data: {
            token: tokenData.token,
            expiresAt: tokenData.expiresAt
        }
    });
}
```

### 2.2 Actions Endpoints

**File:** `backend/src/api/routes/paragon/actions.ts`

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { ParagonService } from "../../../services/paragon/ParagonService";

// List available actions
export async function listActionsHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user.id;
    const { categories } = request.query as { categories?: string };

    const paragonService = new ParagonService();
    const actions = await paragonService.getAvailableActions(
        userId,
        categories ? categories.split(",") : undefined
    );

    reply.send({
        success: true,
        data: actions
    });
}

// Execute action
const executeActionSchema = z.object({
    action: z.string(),
    parameters: z.record(z.any())
});

export async function executeActionHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const userId = request.user.id;
    const body = executeActionSchema.parse(request.body);

    const paragonService = new ParagonService();
    const result = await paragonService.executeAction(userId, body.action, body.parameters);

    if (result.success) {
        reply.send({
            success: true,
            data: result.data
        });
    } else {
        reply.code(400).send({
            success: false,
            error: result.error
        });
    }
}
```

### 2.3 Webhook Endpoint

**File:** `backend/src/api/routes/paragon/webhook.ts`

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import { ParagonService } from "../../../services/paragon/ParagonService";
import { ParagonWebhookPayload } from "../../../services/paragon/types";
import { ConnectionRepository } from "../../../storage/repositories/ConnectionRepository";

export async function paragonWebhookHandler(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const signature = request.headers["x-paragon-signature"] as string;
    const rawBody = JSON.stringify(request.body);

    // Verify signature
    const paragonService = new ParagonService();
    if (!signature || !paragonService.verifyWebhookSignature(rawBody, signature)) {
        return reply.code(401).send({ error: "Invalid signature" });
    }

    // Process webhook asynchronously
    const payload = request.body as ParagonWebhookPayload;
    processWebhookAsync(payload).catch(console.error);

    // Respond immediately
    reply.code(200).send({ success: true });
}

async function processWebhookAsync(payload: ParagonWebhookPayload): Promise<void> {
    const connectionRepo = new ConnectionRepository();

    switch (payload.event) {
        case "integration.installed":
            // Save connection to database
            await connectionRepo.create({
                userId: payload.userId,
                name: `${payload.integration} (Paragon)`,
                connectionMethod: "paragon",
                provider: payload.integration,
                paragonUserId: payload.userId,
                paragonIntegrationId: payload.integration,
                paragonCredentialId: payload.credentialId,
                paragonMetadata: payload.data,
                status: "active"
            });
            break;

        case "integration.uninstalled":
            // Mark connection as disconnected
            await connectionRepo.updateByParagonCredential(payload.credentialId, {
                status: "disconnected"
            });
            break;

        case "integration.updated":
            // Update connection metadata
            await connectionRepo.updateByParagonCredential(payload.credentialId, {
                paragonMetadata: payload.data
            });
            break;
    }
}
```

### 2.4 Register Routes

**File:** `backend/src/api/server.ts` (add to existing route registration)

```typescript
import { authenticate } from "./middleware/auth";
import { getParagonTokenHandler } from "./routes/paragon/token";
import { listActionsHandler, executeActionHandler } from "./routes/paragon/actions";
import { paragonWebhookHandler } from "./routes/paragon/webhook";

// Paragon routes
fastify.get("/api/paragon/token", { preHandler: [authenticate] }, getParagonTokenHandler);
fastify.get("/api/paragon/actions", { preHandler: [authenticate] }, listActionsHandler);
fastify.post("/api/paragon/actions", { preHandler: [authenticate] }, executeActionHandler);
fastify.post("/api/paragon/webhook", paragonWebhookHandler);
```

---

## Phase 3: Frontend Integration

### 3.1 Paragon Context & Hook

**File:** `frontend/src/contexts/ParagonContext.tsx`

```typescript
import React, { createContext, useContext, useEffect, useState } from "react";
import { paragon } from "@useparagon/connect";
import { api } from "../lib/api";

interface ParagonContextType {
    authenticated: boolean;
    loading: boolean;
    error: string | null;
    connect: (integrationType: string) => Promise<void>;
    disconnect: (integrationType: string) => Promise<void>;
    getIntegrations: () => any;
}

const ParagonContext = createContext<ParagonContextType | undefined>(undefined);

export const ParagonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        initializeParagon();
    }, []);

    const initializeParagon = async (): Promise<void> => {
        try {
            setLoading(true);

            // Get Paragon token from backend
            const response = await api.getParagonToken();
            const { token } = response.data;

            // Authenticate with Paragon
            const projectId = import.meta.env.VITE_PARAGON_PROJECT_ID;
            await paragon.authenticate(projectId, token);

            setAuthenticated(true);
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to initialize Paragon");
            setAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const connect = async (integrationType: string): Promise<void> => {
        await paragon.connect(integrationType, {
            onSuccess: async (event, user) => {
                console.log("Integration connected:", event);
                // Refresh connections list
                window.dispatchEvent(new CustomEvent("paragon-connection-changed"));
            },
            onError: (error) => {
                console.error("Connection failed:", error);
                throw error;
            },
        });
    };

    const disconnect = async (integrationType: string): Promise<void> => {
        await paragon.uninstallIntegration(integrationType);
        window.dispatchEvent(new CustomEvent("paragon-connection-changed"));
    };

    const getIntegrations = () => {
        const user = paragon.getUser();
        return user?.integrations || {};
    };

    return (
        <ParagonContext.Provider
            value={{
                authenticated,
                loading,
                error,
                connect,
                disconnect,
                getIntegrations,
            }}
        >
            {children}
        </ParagonContext.Provider>
    );
};

export const useParagon = (): ParagonContextType => {
    const context = useContext(ParagonContext);
    if (!context) {
        throw new Error("useParagon must be used within ParagonProvider");
    }
    return context;
};
```

### 3.2 Add ParagonProvider to App

**File:** `frontend/src/App.tsx` (update)

```typescript
import { ParagonProvider } from "./contexts/ParagonContext";

function App() {
    return (
        <ParagonProvider>
            {/* existing app content */}
        </ParagonProvider>
    );
}
```

### 3.3 Update Connections Page

**File:** `frontend/src/pages/Connections.tsx` (update existing file)

```typescript
import React, { useEffect, useState } from "react";
import { useParagon } from "../contexts/ParagonContext";
import { ParagonConnectButton } from "../components/connections/ParagonConnectButton";
import { ParagonIntegrationCard } from "../components/connections/ParagonIntegrationCard";

export const Connections: React.FC = () => {
    const { authenticated, loading, getIntegrations } = useParagon();
    const [paragonIntegrations, setParagonIntegrations] = useState<any>({});

    useEffect(() => {
        if (authenticated) {
            loadParagonIntegrations();
        }

        // Listen for connection changes
        const handleConnectionChange = (): void => {
            loadParagonIntegrations();
        };

        window.addEventListener("paragon-connection-changed", handleConnectionChange);
        return () => {
            window.removeEventListener("paragon-connection-changed", handleConnectionChange);
        };
    }, [authenticated]);

    const loadParagonIntegrations = (): void => {
        const integrations = getIntegrations();
        setParagonIntegrations(integrations);
    };

    if (loading) {
        return <div>Loading Paragon...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Integrations</h1>

            {/* Paragon Integrations Section */}
            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
                <div className="grid grid-cols-3 gap-4">
                    <ParagonConnectButton integration="salesforce" name="Salesforce" />
                    <ParagonConnectButton integration="slack" name="Slack" />
                    <ParagonConnectButton integration="hubspot" name="HubSpot" />
                    <ParagonConnectButton integration="googledrive" name="Google Drive" />
                    <ParagonConnectButton integration="jira" name="Jira" />
                    <ParagonConnectButton integration="asana" name="Asana" />
                    {/* Add more as needed */}
                </div>
            </section>

            {/* Connected Integrations */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Connected</h2>
                <div className="space-y-2">
                    {Object.entries(paragonIntegrations).map(([type, integration]: [string, any]) => {
                        if (integration.enabled) {
                            return (
                                <ParagonIntegrationCard
                                    key={type}
                                    type={type}
                                    integration={integration}
                                />
                            );
                        }
                        return null;
                    })}
                </div>
            </section>

            {/* Keep existing API Key and MCP connections sections */}
        </div>
    );
};
```

### 3.4 Paragon Connect Button Component

**File:** `frontend/src/components/connections/ParagonConnectButton.tsx`

```typescript
import React from "react";
import { useParagon } from "../../contexts/ParagonContext";

interface ParagonConnectButtonProps {
    integration: string;
    name: string;
}

export const ParagonConnectButton: React.FC<ParagonConnectButtonProps> = ({
    integration,
    name,
}) => {
    const { connect, getIntegrations } = useParagon();
    const integrations = getIntegrations();
    const isConnected = integrations[integration]?.enabled;

    const handleConnect = async (): Promise<void> => {
        try {
            await connect(integration);
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    };

    return (
        <button
            onClick={handleConnect}
            className={`p-4 border rounded hover:bg-gray-50 ${
                isConnected ? "border-green-500 bg-green-50" : ""
            }`}
            disabled={isConnected}
        >
            <h3 className="font-semibold">{name}</h3>
            <p className="text-sm text-gray-600">
                {isConnected ? "Connected" : "Connect"}
            </p>
        </button>
    );
};
```

### 3.5 Paragon Integration Card Component

**File:** `frontend/src/components/connections/ParagonIntegrationCard.tsx`

```typescript
import React from "react";
import { useParagon } from "../../contexts/ParagonContext";

interface ParagonIntegrationCardProps {
    type: string;
    integration: any;
}

export const ParagonIntegrationCard: React.FC<ParagonIntegrationCardProps> = ({
    type,
    integration,
}) => {
    const { disconnect } = useParagon();

    const handleDisconnect = async (): Promise<void> => {
        if (window.confirm(`Disconnect ${type}?`)) {
            try {
                await disconnect(type);
            } catch (error) {
                console.error("Failed to disconnect:", error);
            }
        }
    };

    return (
        <div className="flex items-center justify-between p-4 border rounded">
            <div>
                <h3 className="font-medium capitalize">{type}</h3>
                <p className="text-sm text-gray-600">
                    Status: {integration.credentialStatus || "active"}
                </p>
            </div>
            <button
                onClick={handleDisconnect}
                className="text-red-600 hover:text-red-700"
            >
                Disconnect
            </button>
        </div>
    );
};
```

---

## Phase 4: Workflow Integration (Temporal Activities)

### 4.1 Paragon Action Executor

**File:** `backend/src/temporal/activities/node-executors/paragon-action-executor.ts`

```typescript
import { ActivityContext } from "../../types";
import { ParagonService } from "../../../services/paragon/ParagonService";

export interface ParagonActionConfig {
    action: string; // Action name (e.g., "SLACK_SEND_MESSAGE")
    parameters: Record<string, any>; // Action parameters
    outputVariable: string; // Variable name to store result
}

export async function executeParagonAction(
    context: ActivityContext,
    config: ParagonActionConfig
): Promise<ActivityContext> {
    const paragonService = new ParagonService();

    // Execute action
    const result = await paragonService.executeAction(
        context.userId,
        config.action,
        config.parameters
    );

    if (!result.success) {
        throw new Error(`Paragon action failed: ${result.error?.message || "Unknown error"}`);
    }

    // Store result in workflow context
    return {
        ...context,
        variables: {
            ...context.variables,
            [config.outputVariable]: result.data
        }
    };
}
```

### 4.2 Register Executor in Node Registry

**File:** `backend/src/shared/registry/nodeTypes.ts` (update)

```typescript
import { executeParagonAction } from "../../temporal/activities/node-executors/paragon-action-executor";

export const nodeTypes = {
    // ... existing nodes

    "paragon-action": {
        executor: executeParagonAction,
        category: "integrations",
        name: "Paragon Action",
        description: "Execute any Paragon integration action",
        configSchema: {
            action: {
                type: "string",
                required: true,
                description: "Action name (e.g., SLACK_SEND_MESSAGE)"
            },
            parameters: {
                type: "object",
                required: true,
                description: "Action parameters"
            },
            outputVariable: {
                type: "string",
                required: true,
                description: "Variable to store result"
            }
        }
    }
};
```

### 4.3 Frontend Workflow Node

**File:** `frontend/src/components/canvas/nodes/ParagonActionNode.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { Handle, Position } from "react-flow-renderer";
import { api } from "../../../lib/api";

interface ParagonActionNodeProps {
    data: {
        config: {
            action?: string;
            parameters?: Record<string, any>;
            outputVariable?: string;
        };
        onConfigChange: (config: any) => void;
    };
}

export const ParagonActionNode: React.FC<ParagonActionNodeProps> = ({ data }) => {
    const [availableActions, setAvailableActions] = useState<any[]>([]);
    const [selectedActionSchema, setSelectedActionSchema] = useState<any>(null);

    useEffect(() => {
        loadActions();
    }, []);

    useEffect(() => {
        if (data.config.action) {
            const action = availableActions.find((a) => a.function.name === data.config.action);
            setSelectedActionSchema(action?.function);
        }
    }, [data.config.action, availableActions]);

    const loadActions = async (): Promise<void> => {
        try {
            const response = await api.getParagonActions();
            setAvailableActions(response.data);
        } catch (error) {
            console.error("Failed to load actions:", error);
        }
    };

    const handleActionChange = (actionName: string): void => {
        data.onConfigChange({
            ...data.config,
            action: actionName,
            parameters: {},
        });
    };

    const handleParameterChange = (paramName: string, value: any): void => {
        data.onConfigChange({
            ...data.config,
            parameters: {
                ...data.config.parameters,
                [paramName]: value,
            },
        });
    };

    return (
        <div className="bg-white border-2 border-purple-500 rounded p-4 min-w-[300px]">
            <Handle type="target" position={Position.Top} />

            <div className="font-semibold mb-3">Paragon Action</div>

            <div className="space-y-3">
                {/* Action Selector */}
                <div>
                    <label className="text-xs text-gray-600">Action</label>
                    <select
                        value={data.config.action || ""}
                        onChange={(e) => handleActionChange(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                    >
                        <option value="">Select action</option>
                        {availableActions.map((action) => (
                            <option key={action.function.name} value={action.function.name}>
                                {action.function.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Dynamic Parameters */}
                {selectedActionSchema && (
                    <div>
                        <label className="text-xs text-gray-600">Parameters</label>
                        {Object.entries(selectedActionSchema.parameters.properties).map(
                            ([paramName, paramSchema]: [string, any]) => (
                                <div key={paramName} className="mt-2">
                                    <label className="text-xs">
                                        {paramName}
                                        {selectedActionSchema.parameters.required?.includes(
                                            paramName
                                        ) && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.config.parameters?.[paramName] || ""}
                                        onChange={(e) =>
                                            handleParameterChange(paramName, e.target.value)
                                        }
                                        placeholder={paramSchema.description}
                                        className="w-full border rounded px-2 py-1 text-sm"
                                    />
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Output Variable */}
                <div>
                    <label className="text-xs text-gray-600">Output Variable</label>
                    <input
                        type="text"
                        value={data.config.outputVariable || ""}
                        onChange={(e) =>
                            data.onConfigChange({
                                ...data.config,
                                outputVariable: e.target.value,
                            })
                        }
                        placeholder="result"
                        className="w-full border rounded px-2 py-1 text-sm"
                    />
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};
```

### 4.4 Register Frontend Node Type

**File:** `frontend/src/lib/nodeTypes.ts` (update)

```typescript
import { ParagonActionNode } from "../components/canvas/nodes/ParagonActionNode";

export const nodeTypes = {
    // ... existing nodes
    "paragon-action": ParagonActionNode
};
```

---

## Phase 5: MCP Server Integration

### 5.1 Option A: Use Official Paragon MCP Server

**Setup:**

```bash
# Clone Paragon MCP server
git clone https://github.com/useparagon/paragon-mcp.git
cd paragon-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

**Configuration (.env):**

```env
PROJECT_ID=your-paragon-project-id
SIGNING_KEY_PATH=/path/to/signing-key.pem
PORT=3100

# Optional: Limit to specific integrations
LIMIT_TO_INTEGRATIONS=slack,salesforce,googledrive,jira

# Optional: Enable proxy API (use with caution)
ENABLE_PROXY_API_TOOL=false
```

**Start Server:**

```bash
npm run build
npm start
```

**Expose Endpoint:**

Add to `backend/src/api/server.ts`:

```typescript
// Proxy Paragon MCP server
fastify.all("/api/mcp/paragon/*", async (request, reply) => {
    const targetUrl = `http://localhost:3100${request.url.replace("/api/mcp/paragon", "")}`;

    // Forward request to Paragon MCP server
    const response = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers as any,
        body: request.method !== "GET" ? JSON.stringify(request.body) : undefined
    });

    const data = await response.json();
    reply.send(data);
});
```

### 5.2 Update Agent Builder

**File:** `frontend/src/pages/AgentBuilder.tsx` (update)

Add Paragon as MCP provider option:

```typescript
const MCP_PROVIDERS = [
    // ... existing providers
    {
        id: "paragon",
        name: "Paragon ActionKit",
        description: "1000+ actions across 130+ integrations",
        mcpServerUrl: "/api/mcp/paragon/sse?user={userId}",
        category: "integrations"
    }
];
```

---

## Phase 6: Migration from Legacy OAuth

### 6.1 Dual-System Operation

**File:** `backend/src/temporal/activities/node-executors/integration-executor.ts` (update)

```typescript
import { executeParagonAction } from "./paragon-action-executor";
import { getAccessToken } from "../../../services/oauth/TokenRefreshService";

export async function executeIntegration(
    context: ActivityContext,
    config: any
): Promise<ActivityContext> {
    const connectionRepo = new ConnectionRepository();
    const connection = await connectionRepo.findById(config.connectionId, context.userId);

    if (!connection) {
        throw new Error("Connection not found");
    }

    // Route to appropriate executor based on connection method
    if (connection.connectionMethod === "paragon") {
        // Use Paragon executor
        return await executeParagonAction(context, {
            action: config.action,
            parameters: config.parameters,
            outputVariable: config.outputVariable
        });
    } else if (connection.connectionMethod === "oauth2") {
        // Use legacy OAuth executor
        const token = await getAccessToken(config.connectionId);
        return await executeLegacyOAuth(context, config, token);
    } else if (connection.connectionMethod === "api_key") {
        // Use API key executor
        return await executeApiKey(context, config);
    }

    throw new Error(`Unsupported connection method: ${connection.connectionMethod}`);
}
```

### 6.2 Migration Plan

1. **Week 1: Deploy Paragon Integration**
    - Deploy all Paragon code
    - Keep legacy OAuth system running
    - Both systems operational

2. **Week 2-3: Beta Testing (10% of users)**
    - Enable Paragon for internal team
    - Test all critical workflows
    - Fix any issues

3. **Week 4-5: Gradual Rollout (50%)**
    - Show banner: "New integrations available!"
    - Allow users to reconnect via Paragon
    - Monitor error rates

4. **Week 6: Full Rollout (100%)**
    - All users see Paragon integrations
    - Legacy OAuth connections still work
    - Encourage reconnection

5. **Week 10+: Cleanup**
    - After 30-day safety period
    - Remove legacy OAuth code
    - Delete old encrypted_data column

### 6.3 User Communication

**In-App Banner Component:**

**File:** `frontend/src/components/notifications/ParagonMigrationBanner.tsx`

```typescript
import React, { useState } from "react";

export const ParagonMigrationBanner: React.FC = () => {
    const [dismissed, setDismissed] = useState(
        localStorage.getItem("paragon-banner-dismissed") === "true"
    );

    if (dismissed) return null;

    const handleDismiss = (): void => {
        setDismissed(true);
        localStorage.setItem("paragon-banner-dismissed", "true");
    };

    return (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <span className="text-2xl">🎉</span>
                    <div>
                        <h3 className="font-semibold text-blue-900">
                            New Integrations Available!
                        </h3>
                        <p className="text-sm text-blue-700">
                            We've upgraded our integration system. Reconnect your integrations to access 130+ apps.
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <a
                        href="/connections"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Reconnect Now
                    </a>
                    <button
                        onClick={handleDismiss}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
};
```

---

## Complete Integration Catalog

### Available Integrations by Category

#### CRM (11+)

1. **Salesforce** - `salesforce`
    - Actions: Create/Update/Delete Records, SOQL Query, Get Metadata, Bulk Operations
2. **HubSpot** - `hubspot`
    - Actions: Contacts, Deals, Companies, Tickets, Lists, Workflows
3. **Pipedrive** - `pipedrive`
4. **Microsoft Dynamics 365 Sales** - `dynamics365sales`
5. **Zoho CRM** - `zohocrm`
6. **Close** - `close`
7. **Zendesk Sell** - `zendesksell`
8. **Insightly** - `insightly`
9. **Copper** - `copper`
10. **Keap** - `keap`
11. **Freshsales** - `freshsales`

#### Communication (4+)

12. **Slack** - `slack`
    - Actions: Send Message, List Channels, Upload File, Get Users
13. **Microsoft Teams** - `microsoftteams`
14. **Discord** - `discord`
15. **Zoom** - `zoom`

#### File Storage (5+)

16. **Google Drive** - `googledrive`
    - Actions: Upload File, Download File, Create Folder, Search, Share
17. **Dropbox** - `dropbox`
18. **Microsoft SharePoint** - `sharepoint`
19. **Box** - `box`
20. **OneDrive** - `onedrive`

#### Project Management (13+)

21. **Jira** - `jira`
    - Actions: Create Issue, Update Issue, Get Issue, Create Comment, Transitions
22. **Asana** - `asana`
    - Actions: Create Task, Update Task, Create Project, Add Comment
23. **Monday.com** - `monday`
24. **Trello** - `trello`
25. **Azure DevOps** - `azuredevops`
26. **ClickUp** - `clickup`
27. **Linear** - `linear`
28. **GitHub** - `github`
29. **Productboard** - `productboard`
30. **Airtable** - `airtable`
31. **Hive** - `hive`
32. **Shortcut** - `shortcut`
33. **Todoist** - `todoist`

#### Email & Calendar (5+)

34. **Gmail** - `gmail`
    - Actions: Send Email, Get Messages, Search, Labels
35. **Outlook** - `outlook`
36. **Google Calendar** - `googlecalendar`
    - Actions: Create Event, Update Event, Get Availability, List Events
37. **Outlook Calendar** - `outlookcalendar`
38. **SendGrid** - `sendgrid`

#### Support/Ticketing (6+)

39. **Zendesk** - `zendesk`
40. **Freshdesk** - `freshdesk`
41. **Intercom** - `intercom`
42. **Help Scout** - `helpscout`
43. **Front** - `front`
44. **ServiceNow** - `servicenow`

#### Accounting & ERP (4+)

45. **QuickBooks** - `quickbooks`
46. **Xero** - `xero`
47. **NetSuite** - `netsuite`
48. **Sage Intacct** - `sageintacct`

#### E-commerce (5+)

49. **Shopify** - `shopify`
50. **WooCommerce** - `woocommerce`
51. **BigCommerce** - `bigcommerce`
52. **Magento** - `magento`
53. **Square** - `square`

#### Marketing (5+)

54. **Mailchimp** - `mailchimp`
55. **ActiveCampaign** - `activecampaign`
56. **Klaviyo** - `klaviyo`
57. **Brevo** - `brevo`
58. **Constant Contact** - `constantcontact`

#### Document Management (5+)

59. **Notion** - `notion`
    - Actions: Create Page, Update Page, Delete Block, Query Database
60. **Google Docs** - `googledocs`
61. **Google Sheets** - `googlesheets`
62. **Microsoft Word** - `microsoftword`
63. **Microsoft Excel** - `microsoftexcel`

#### Additional Categories (60+)

- Analytics: Google Analytics, Mixpanel, Segment, Amplitude
- Payments: Stripe, PayPal, Braintree
- Social Media: Twitter, Facebook, LinkedIn, Instagram
- HRIS: BambooHR, Workday, ADP, Namely
- ATS: Lever, Greenhouse, Workable, JazzHR
- And 40+ more...

### Total: 130+ Integrations

---

## API Reference

### Backend Endpoints

#### 1. GET /api/paragon/token

Get Paragon user token for frontend authentication.

**Headers:**

```
Authorization: Bearer {your-app-token}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
        "expiresAt": 1234567890000
    }
}
```

#### 2. GET /api/paragon/actions

List available actions for authenticated user.

**Query Parameters:**

- `categories` (optional): Comma-separated list (e.g., "crm,project_management")

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "type": "function",
            "function": {
                "name": "SLACK_SEND_MESSAGE",
                "description": "Send a message to a Slack channel",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "channel": { "type": "string" },
                        "text": { "type": "string" }
                    },
                    "required": ["channel", "text"]
                }
            }
        }
    ]
}
```

#### 3. POST /api/paragon/actions

Execute an action.

**Request Body:**

```json
{
    "action": "SLACK_SEND_MESSAGE",
    "parameters": {
        "channel": "#general",
        "text": "Hello from FlowMaestro!"
    }
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "ok": true,
        "channel": "C1234567890",
        "ts": "1234567890.123456"
    }
}
```

#### 4. POST /api/paragon/webhook

Receive webhooks from Paragon.

**Headers:**

```
X-Paragon-Signature: sha256=abc123def456...
```

**Body:**

```json
{
    "event": "integration.installed",
    "integration": "slack",
    "credentialId": "cred_abc123",
    "userId": "user-123",
    "timestamp": 1234567890,
    "data": {}
}
```

---

## Testing

### Unit Tests

**File:** `backend/src/services/paragon/__tests__/ParagonTokenManager.test.ts`

```typescript
import { ParagonTokenManager } from "../ParagonTokenManager";
import jwt from "jsonwebtoken";

describe("ParagonTokenManager", () => {
    const config = {
        projectId: "test-project-id",
        signingKey: "test-signing-key",
        webhookSecret: "test-webhook-secret"
    };

    const tokenManager = new ParagonTokenManager(config);

    it("should generate valid JWT token", () => {
        const userId = "user-123";
        const result = tokenManager.generateUserToken(userId);

        expect(result.token).toBeDefined();
        expect(result.userId).toBe(userId);
        expect(result.expiresAt).toBeGreaterThan(Date.now());

        // Decode token (don't verify in test)
        const decoded = jwt.decode(result.token) as any;
        expect(decoded.sub).toBe(userId);
        expect(decoded.aud).toBe(`useparagon.com/${config.projectId}`);
    });

    it("should verify webhook signature", () => {
        const payload = JSON.stringify({ test: "data" });
        const crypto = require("crypto");
        const hmac = crypto.createHmac("sha256", config.webhookSecret);
        hmac.update(payload);
        const signature = `sha256=${hmac.digest("hex")}`;

        const result = tokenManager.verifyWebhookSignature(payload, signature);
        expect(result).toBe(true);
    });
});
```

### Integration Tests

Test complete flow from frontend to Paragon:

1. Frontend requests token
2. Backend generates JWT
3. Frontend authenticates with Paragon SDK
4. Frontend triggers Connect Portal
5. User completes OAuth
6. Webhook received and processed
7. Connection saved to database

### E2E Tests

Test complete workflow execution:

1. Create workflow with Paragon action node
2. Configure action (e.g., SLACK_SEND_MESSAGE)
3. Execute workflow
4. Verify action executed successfully
5. Verify result stored in workflow context

---

## Troubleshooting

### Common Issues

**1. "Invalid signature" on webhook:**

- Verify `PARAGON_WEBHOOK_SECRET` matches Paragon dashboard
- Ensure raw body is used for signature verification
- Check HMAC algorithm is SHA-256

**2. "User not authenticated" error:**

- Check JWT is properly signed with RS256
- Verify `PARAGON_PROJECT_ID` is correct
- Ensure token hasn't expired (1 hour TTL)

**3. "Integration not connected" error:**

- User needs to connect integration via Connect Portal first
- Check connection exists in database
- Verify `paragon_credential_id` is set

**4. ActionKit returns empty actions list:**

- User has no integrations connected
- Check Paragon dashboard: integrations are enabled
- Verify user token is valid

### Debug Mode

Add debug logging:

```typescript
// backend/src/services/paragon/ParagonService.ts
if (process.env.DEBUG_PARAGON === "true") {
    console.log("Paragon request:", { action, parameters });
    console.log("Paragon response:", result);
}
```

---

## Next Steps

1. **Complete Phase 1:** Set up database, backend services, and environment variables
2. **Complete Phase 2:** Implement API routes
3. **Complete Phase 3:** Integrate frontend (Connect Portal)
4. **Complete Phase 4:** Add workflow node executors
5. **Complete Phase 5:** Set up MCP server integration
6. **Complete Phase 6:** Plan and execute migration
7. **Test thoroughly:** Unit tests, integration tests, E2E tests
8. **Deploy to production:** Gradual rollout with monitoring
9. **Monitor & Iterate:** Track usage, errors, and user feedback
10. **Cleanup:** Remove legacy OAuth code after successful migration

---

## Support & Resources

- **Paragon Documentation:** https://docs.useparagon.com
- **Paragon Dashboard:** https://dashboard.useparagon.com
- **Paragon MCP Server:** https://github.com/useparagon/paragon-mcp
- **FlowMaestro Team:** For questions about this implementation
