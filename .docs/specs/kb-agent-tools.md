# Technical Specification: Knowledge Base Integration for Agents

## Executive Summary

This technical specification details the integration of knowledge bases as tools for agents in FlowMaestro, enabling agents to perform semantic search over document collections during conversations. The implementation follows the established MCP tool linking pattern and leverages existing RAG infrastructure.

**Key Finding:** The execution infrastructure (`executeKnowledgeBaseTool`) is already 100% implemented. Only the UI/API linking layer needs to be built.

**Implementation Scope:**

- Phase 1: Core functionality with Quick Add + Manual configuration + Edit capability
- Phase 2: Query embedding caching and context window management

---

## 1. Architecture Overview

### Current State

**Existing Infrastructure (✅ Complete):**

- Full RAG system with PostgreSQL + pgvector (HNSW indexed)
- `executeKnowledgeBaseTool` activity fully implemented in `backend/src/temporal/activities/agent/agent-activities.ts:961-1046`
- Vector similarity search with cosine distance
- Document processing pipeline (8+ file formats)
- OpenAI embeddings integration
- Frontend UI for KB management

**Missing Components (❌ To Build):**

- UI for linking KBs to agents
- API endpoints for KB tool management
- Query embedding cache (Redis)
- Context window management logic

### Design Pattern

Follow the **MCP tool linking pattern** for consistency:

- Store KB tools in `agents.available_tools` JSONB array
- No junction table needed (leverages existing schema-less JSONB)
- Similar UI flow: Browse → Configure → Add
- Reuse existing `remove-tool` endpoint

### Tool Structure

```typescript
{
    id: "tool_kb_abc123",
    name: "search_product_docs",
    description: "Search product documentation knowledge base",
    type: "knowledge_base",
    schema: {
        type: "object",
        properties: {
            query: { type: "string", description: "Search query" },
            topK: { type: "number", default: 5, minimum: 1, maximum: 20 },
            minScore: { type: "number", default: 0.7, minimum: 0.0, maximum: 1.0 }
        },
        required: ["query"]
    },
    config: {
        knowledgeBaseId: "kb_xyz789",
        knowledgeBaseName: "Product Documentation",
        defaultTopK: 5,
        defaultMinScore: 0.7
    }
}
```

---

## 2. Implementation Scope

### Phase 1: Core Functionality

**Included:**

- ✅ Browse available knowledge bases
- ✅ Quick Add (auto-configured defaults with one click)
- ✅ Manual Configuration (custom tool name, description, search parameters)
- ✅ Edit existing KB tool configurations (PATCH endpoint + UI)
- ✅ Remove KB tools from agents
- ✅ Display linked KBs in tools list with badges and metadata
- ✅ Soft check for deleted KBs (show warning, fail gracefully at execution)
- ✅ Agent execution with KB search via existing `executeKnowledgeBaseTool`

**Not Included (Future):**

- ❌ Auto-injection mode (automatic KB search before LLM processing)
- ❌ Multiple KB orchestration (parallel search across KBs)
- ❌ Cascade cleanup on KB deletion

### Phase 2: Advanced Features

**Included:**

- ✅ Query Embedding Cache (Redis-based, TTL expiration, cost reduction)
- ✅ Context Window Management (smart truncation, priority ranking)

**Not Included (Future):**

- ❌ Hybrid search (vector + keyword BM25)
- ❌ Usage analytics and adaptive tuning

---

## 3. Data Models

### ToolConfig Enhancement

**File:** `backend/src/storage/models/Agent.ts`

**Add to existing interface:**

```typescript
export interface ToolConfig {
    // ... existing fields (workflowId, functionName, etc.) ...

    // Knowledge Base fields
    knowledgeBaseId?: string;
    knowledgeBaseName?: string; // NEW: For UI display
    defaultTopK?: number; // NEW: Default result count (1-20)
    defaultMinScore?: number; // NEW: Default similarity threshold (0.0-1.0)
}
```

**Note:** No database migration required (JSONB is schema-less)

### Frontend Types

**File:** `frontend/src/lib/api.ts`

**Add new types:**

```typescript
export interface AddKBToolRequest {
    knowledgeBaseId: string;
    toolName: string;
    toolDescription: string;
    defaultTopK?: number;
    defaultMinScore?: number;
}

export interface UpdateKBToolRequest {
    toolName?: string;
    toolDescription?: string;
    defaultTopK?: number;
    defaultMinScore?: number;
}

export interface KnowledgeBaseWithStats extends KnowledgeBase {
    stats: KnowledgeBaseStats | null;
}
```

---

## 4. Backend API Endpoints

### 4.1 List Available Knowledge Bases

**Endpoint:** `GET /api/agents/:agentId/available-knowledge-bases`

**File:** `backend/src/api/routes/agents/list-available-knowledge-bases.ts` (CREATE)

**Purpose:** Fetch all KBs owned by user for linking dialog

**Implementation:**

```typescript
export async function listAvailableKnowledgeBasesHandler(
    request: FastifyRequest<{ Params: { agentId: string } }>,
    reply: FastifyReply
): Promise<void> {
    const userId = (request.user as { id: string }).id;
    const kbRepo = new KnowledgeBaseRepository();

    const result = await kbRepo.findByUserId(userId, { limit: 100, offset: 0 });

    const kbsWithStats = await Promise.all(
        result.knowledgeBases.map(async (kb) => ({
            ...kb,
            stats: await kbRepo.getStats(kb.id)
        }))
    );

    reply.code(200).send({ success: true, data: kbsWithStats });
}
```

### 4.2 Add Knowledge Base Tool

**Endpoint:** `POST /api/agents/:agentId/knowledge-base-tools`

**File:** `backend/src/api/routes/agents/add-knowledge-base-tool.ts` (CREATE)

**Validation:**

- Verify agent exists and user has access
- Verify KB exists and user has access
- Prevent duplicate KB linking (check if KB already linked)

**Implementation:**

```typescript
export async function addKnowledgeBaseToolHandler(
    request: FastifyRequest<{ Params: { agentId: string }; Body: AddKBToolRequest }>,
    reply: FastifyReply
): Promise<void> {
    const { agentId } = request.params;
    const userId = (request.user as { id: string }).id;
    const toolData = addKBToolSchema.parse(request.body);

    // Verify ownership
    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    const kb = await kbRepo.findById(toolData.knowledgeBaseId);

    if (!agent || !kb || kb.user_id !== userId) {
        return reply.code(404).send({ success: false, error: "Not found" });
    }

    // Check for duplicate
    const exists = agent.available_tools.find(
        (t) => t.type === "knowledge_base" && t.config.knowledgeBaseId === toolData.knowledgeBaseId
    );
    if (exists) {
        return reply.code(400).send({ success: false, error: "KB already linked" });
    }

    // Create tool
    const newTool: Tool = {
        id: `tool_kb_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: toolData.toolName,
        description: toolData.toolDescription,
        type: "knowledge_base",
        schema: KB_TOOL_SCHEMA,
        config: {
            knowledgeBaseId: toolData.knowledgeBaseId,
            knowledgeBaseName: kb.name,
            defaultTopK: toolData.defaultTopK ?? 5,
            defaultMinScore: toolData.defaultMinScore ?? 0.7
        }
    };

    await agentRepo.update(agentId, {
        available_tools: [...agent.available_tools, newTool]
    });

    reply.code(200).send({ success: true, data: { tool: newTool } });
}
```

### 4.3 Update Knowledge Base Tool

**Endpoint:** `PATCH /api/agents/:agentId/knowledge-base-tools/:toolId`

**File:** `backend/src/api/routes/agents/update-knowledge-base-tool.ts` (CREATE)

**Purpose:** Edit tool configuration without removing and re-adding

**Implementation:**

```typescript
export async function updateKnowledgeBaseToolHandler(
    request: FastifyRequest<{
        Params: { agentId: string; toolId: string };
        Body: UpdateKBToolRequest;
    }>,
    reply: FastifyReply
): Promise<void> {
    const { agentId, toolId } = request.params;
    const userId = (request.user as { id: string }).id;
    const updates = updateKBToolSchema.parse(request.body);

    const agent = await agentRepo.findByIdAndUserId(agentId, userId);
    if (!agent) {
        return reply.code(404).send({ success: false, error: "Agent not found" });
    }

    const toolIndex = agent.available_tools.findIndex((t) => t.id === toolId);
    if (toolIndex === -1) {
        return reply.code(404).send({ success: false, error: "Tool not found" });
    }

    const tool = agent.available_tools[toolIndex];
    if (tool.type !== "knowledge_base") {
        return reply.code(400).send({ success: false, error: "Not a KB tool" });
    }

    // Update tool
    const updatedTool: Tool = {
        ...tool,
        name: updates.toolName ?? tool.name,
        description: updates.toolDescription ?? tool.description,
        config: {
            ...tool.config,
            defaultTopK: updates.defaultTopK ?? tool.config.defaultTopK,
            defaultMinScore: updates.defaultMinScore ?? tool.config.defaultMinScore
        }
    };

    const updatedTools = [...agent.available_tools];
    updatedTools[toolIndex] = updatedTool;

    await agentRepo.update(agentId, { available_tools: updatedTools });

    reply.code(200).send({ success: true, data: { tool: updatedTool } });
}
```

### 4.4 Remove Tool (Existing)

**Endpoint:** `DELETE /api/agents/:agentId/tools/:toolId`

**File:** `backend/src/api/routes/agents/remove-tool.ts` (EXISTS - NO CHANGES)

**Status:** ✅ Already handles all tool types including `knowledge_base`

### 4.5 Route Registration

**File:** `backend/src/api/routes/agents/index.ts` (MODIFY)

**Add route registrations:**

```typescript
import { listAvailableKnowledgeBasesHandler } from "./list-available-knowledge-bases";
import { addKnowledgeBaseToolHandler } from "./add-knowledge-base-tool";
import { updateKnowledgeBaseToolHandler } from "./update-knowledge-base-tool";

// Register routes
fastify.get(
    "/:agentId/available-knowledge-bases",
    {
        preHandler: [authenticate]
    },
    listAvailableKnowledgeBasesHandler
);

fastify.post(
    "/:agentId/knowledge-base-tools",
    {
        preHandler: [authenticate]
    },
    addKnowledgeBaseToolHandler
);

fastify.patch(
    "/:agentId/knowledge-base-tools/:toolId",
    {
        preHandler: [authenticate]
    },
    updateKnowledgeBaseToolHandler
);
```

---

## 5. Frontend Implementation

### 5.1 AddKnowledgeBaseDialog Component

**File:** `frontend/src/components/agents/AddKnowledgeBaseDialog.tsx` (CREATE)

**Views:**

1. **KB List View:** Browse available knowledge bases with stats
2. **Configure Tool View:** Set tool name, description, search parameters

**Quick Add vs Manual:**

- **Quick Add button:** Auto-generates tool name (`search_{kb_name}`), uses defaults, adds immediately
- **Configure button:** Opens configure view for customization

**Component structure:**

```typescript
export function AddKnowledgeBaseDialog({
    isOpen,
    onClose,
    onAddKnowledgeBase
}: AddKnowledgeBaseDialogProps) {
    const [view, setView] = useState<"kb-list" | "configure">("kb-list");
    const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseWithStats[]>([]);

    // Form state
    const [toolName, setToolName] = useState("");
    const [toolDescription, setToolDescription] = useState("");
    const [topK, setTopK] = useState(5);
    const [minScore, setMinScore] = useState(0.7);

    const handleQuickAdd = async (kb: KnowledgeBase) => {
        await onAddKnowledgeBase({
            knowledgeBaseId: kb.id,
            toolName: `search_${kb.name.toLowerCase().replace(/\s+/g, "_")}`,
            toolDescription: `Search ${kb.name} knowledge base`,
            defaultTopK: 5,
            defaultMinScore: 0.7
        });
        onClose();
    };

    const handleConfigure = (kb: KnowledgeBase) => {
        setSelectedKB(kb);
        setToolName(`search_${kb.name.toLowerCase().replace(/\s+/g, "_")}`);
        setToolDescription(`Search ${kb.name} knowledge base`);
        setView("configure");
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            {view === "kb-list" && (
                <KBListView
                    knowledgeBases={knowledgeBases}
                    onQuickAdd={handleQuickAdd}
                    onConfigure={handleConfigure}
                />
            )}
            {view === "configure" && (
                <ConfigureToolView
                    knowledgeBase={selectedKB}
                    toolName={toolName}
                    toolDescription={toolDescription}
                    topK={topK}
                    minScore={minScore}
                    onSubmit={handleSubmit}
                    onBack={() => setView("kb-list")}
                    // ... onChange handlers
                />
            )}
        </Dialog>
    );
}
```

**KBListView Sub-component:**

```typescript
function KBListView({ knowledgeBases, onQuickAdd, onConfigure }: KBListViewProps) {
    return (
        <div className="space-y-2">
            {knowledgeBases.map((kb) => (
                <div key={kb.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-medium">{kb.name}</h4>
                            <p className="text-sm text-gray-600">{kb.description}</p>
                            {kb.stats && (
                                <div className="flex gap-3 mt-2 text-xs text-gray-500">
                                    <span>{kb.stats.documentCount} docs</span>
                                    <span>{kb.stats.chunkCount} chunks</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onQuickAdd(kb)}
                                className="btn-secondary text-sm"
                            >
                                Quick Add
                            </button>
                            <button
                                onClick={() => onConfigure(kb)}
                                className="btn-primary text-sm"
                            >
                                Configure
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
```

### 5.2 EditKBToolDialog Component

**File:** `frontend/src/components/agents/EditKBToolDialog.tsx` (CREATE)

**Purpose:** Edit existing KB tool configuration

**Props:**

```typescript
interface EditKBToolDialogProps {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool; // Existing KB tool
    onUpdate: (toolId: string, updates: UpdateKBToolRequest) => Promise<void>;
}
```

**Form fields:**

- Tool name
- Tool description
- Top K results
- Similarity threshold

### 5.3 AgentBuilder Integration

**File:** `frontend/src/pages/AgentBuilder.tsx` (MODIFY)

**Add state:**

```typescript
const [isKBDialogOpen, setIsKBDialogOpen] = useState(false);
const [editingKBTool, setEditingKBTool] = useState<Tool | null>(null);
```

**Add handlers:**

```typescript
const handleAddKnowledgeBase = async (toolData: AddKBToolRequest) => {
    if (!currentAgent) return;
    await addKnowledgeBaseTool(currentAgent.id, toolData);
    await fetchAgent(currentAgent.id);
};

const handleEditKBTool = async (toolId: string, updates: UpdateKBToolRequest) => {
    if (!currentAgent) return;
    await updateKnowledgeBaseTool(currentAgent.id, toolId, updates);
    await fetchAgent(currentAgent.id);
    setEditingKBTool(null);
};
```

**Add UI:**

```typescript
{/* Tools section */}
<button
    onClick={() => setIsKBDialogOpen(true)}
    className="btn-secondary"
    disabled={!currentAgent}
>
    <Database className="w-4 h-4 mr-2" />
    Add Knowledge Base
</button>

<AddKnowledgeBaseDialog
    isOpen={isKBDialogOpen}
    onClose={() => setIsKBDialogOpen(false)}
    onAddKnowledgeBase={handleAddKnowledgeBase}
/>

<EditKBToolDialog
    isOpen={!!editingKBTool}
    onClose={() => setEditingKBTool(null)}
    tool={editingKBTool}
    onUpdate={handleEditKBTool}
/>
```

### 5.4 ToolsList Component Enhancement

**File:** `frontend/src/components/agents/ToolsList.tsx` (MODIFY)

**Add KB tool display:**

```typescript
function getToolIcon(tool: Tool) {
    switch (tool.type) {
        case "knowledge_base":
            return <Database className="w-4 h-4 text-purple-600" />;
        // ... other types
    }
}

function getToolBadge(tool: Tool) {
    switch (tool.type) {
        case "knowledge_base":
            return (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                    Knowledge Base
                </span>
            );
        // ... other types
    }
}

function ToolCard({ tool, onRemove, onEdit }: ToolCardProps) {
    const isValid = tool.type === "knowledge_base" ? validateKBTool(tool) : true;

    return (
        <div className={cn("p-4 border rounded-lg", !isValid && "border-red-300 bg-red-50")}>
            {!isValid && (
                <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Knowledge base not found</span>
                </div>
            )}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    {getToolIcon(tool)}
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium">{tool.name}</h4>
                            {getToolBadge(tool)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{tool.description}</p>

                        {tool.type === "knowledge_base" && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <Database className="w-3 h-3" />
                                <span>{tool.config.knowledgeBaseName}</span>
                                <span>• Top {tool.config.defaultTopK} results</span>
                                <span>• Min score: {tool.config.defaultMinScore}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {tool.type === "knowledge_base" && (
                        <button onClick={() => onEdit(tool)} className="text-blue-600">
                            <Edit className="w-4 h-4" />
                        </button>
                    )}
                    <button onClick={() => onRemove(tool.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
```

### 5.5 API Client Functions

**File:** `frontend/src/lib/api.ts` (MODIFY)

**Add functions:**

```typescript
export async function getAvailableKnowledgeBases(
    agentId: string
): Promise<{ success: boolean; data: KnowledgeBaseWithStats[] }> {
    const token = getAuthToken();
    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/available-knowledge-bases`,
        {
            headers: { ...(token && { Authorization: `Bearer ${token}` }) }
        }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function addKnowledgeBaseTool(
    agentId: string,
    data: AddKBToolRequest
): Promise<{ success: boolean; data: { tool: Tool } }> {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/knowledge-base-tools`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

export async function updateKnowledgeBaseTool(
    agentId: string,
    toolId: string,
    data: UpdateKBToolRequest
): Promise<{ success: boolean; data: { tool: Tool } }> {
    const token = getAuthToken();
    const response = await fetch(
        `${API_BASE_URL}/api/agents/${agentId}/knowledge-base-tools/${toolId}`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` })
            },
            body: JSON.stringify(data)
        }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}
```

---

## 6. Advanced Features (Phase 2)

### 6.1 Query Embedding Cache

**Purpose:** Cache query embeddings in Redis to reduce OpenAI API calls and costs

**Implementation:**

**File:** `backend/src/services/EmbeddingCacheService.ts` (CREATE)

```typescript
import Redis from "ioredis";
import crypto from "crypto";

export class EmbeddingCacheService {
    private redis: Redis;
    private readonly TTL = 60 * 60 * 24 * 7; // 7 days

    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
    }

    private getCacheKey(text: string, model: string, provider: string): string {
        const hash = crypto.createHash("sha256").update(text).digest("hex");
        return `embedding:${provider}:${model}:${hash}`;
    }

    async getEmbedding(text: string, model: string, provider: string): Promise<number[] | null> {
        const key = this.getCacheKey(text, model, provider);
        const cached = await this.redis.get(key);

        if (cached) {
            return JSON.parse(cached);
        }

        return null;
    }

    async setEmbedding(
        text: string,
        model: string,
        provider: string,
        embedding: number[]
    ): Promise<void> {
        const key = this.getCacheKey(text, model, provider);
        await this.redis.setex(key, this.TTL, JSON.stringify(embedding));
    }
}
```

**File:** `backend/src/services/EmbeddingService.ts` (MODIFY)

**Add cache integration:**

```typescript
import { EmbeddingCacheService } from "./EmbeddingCacheService";

export class EmbeddingService {
    private cache: EmbeddingCacheService;

    constructor() {
        this.cache = new EmbeddingCacheService();
    }

    async generateQueryEmbedding(
        query: string,
        config: EmbeddingConfig,
        userId: string
    ): Promise<{ embedding: number[]; cached: boolean }> {
        // Check cache
        const cached = await this.cache.getEmbedding(
            query,
            config.embeddingModel,
            config.embeddingProvider
        );

        if (cached) {
            return { embedding: cached, cached: true };
        }

        // Generate new embedding
        const result = await this.generateEmbeddings([query], config, userId);

        // Cache for future use
        await this.cache.setEmbedding(
            query,
            config.embeddingModel,
            config.embeddingProvider,
            result.embeddings[0]
        );

        return { embedding: result.embeddings[0], cached: false };
    }
}
```

**Benefits:**

- Reduces OpenAI API calls by ~40-60% for repeated queries
- Cost savings ($0.00002/1K tokens for text-embedding-3-small)
- Faster response times (Redis lookup ~1ms vs API call ~100-500ms)

### 6.2 Context Window Management

**Purpose:** Smart truncation when KB results exceed token limits

**Implementation:**

**File:** `backend/src/temporal/activities/agent/context-window-manager.ts` (CREATE)

```typescript
import { ChunkSearchResult } from "../../../storage/repositories/KnowledgeChunkRepository";

interface ContextWindowConfig {
    maxTokens: number;
    prioritizeBy: "similarity" | "recency" | "balanced";
}

export class ContextWindowManager {
    /**
     * Estimate tokens in text (rough approximation: 1 token ≈ 4 chars)
     */
    private estimateTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Truncate search results to fit within token limit
     */
    truncateResults(
        results: ChunkSearchResult[],
        config: ContextWindowConfig
    ): {
        truncated: ChunkSearchResult[];
        omittedCount: number;
        totalTokens: number;
    } {
        let totalTokens = 0;
        const truncated: ChunkSearchResult[] = [];

        // Sort by priority
        const sorted = this.sortByPriority(results, config.prioritizeBy);

        for (const result of sorted) {
            const chunkTokens = this.estimateTokens(result.content);

            if (totalTokens + chunkTokens > config.maxTokens) {
                // Try to include a truncated version
                const remainingTokens = config.maxTokens - totalTokens;
                if (remainingTokens > 100) {
                    // Minimum useful size
                    const truncatedContent = this.truncateContent(result.content, remainingTokens);
                    truncated.push({
                        ...result,
                        content: truncatedContent,
                        metadata: {
                            ...result.metadata,
                            truncated: true
                        }
                    });
                    totalTokens += this.estimateTokens(truncatedContent);
                }
                break;
            }

            truncated.push(result);
            totalTokens += chunkTokens;
        }

        return {
            truncated,
            omittedCount: results.length - truncated.length,
            totalTokens
        };
    }

    private sortByPriority(
        results: ChunkSearchResult[],
        prioritizeBy: string
    ): ChunkSearchResult[] {
        switch (prioritizeBy) {
            case "similarity":
                return [...results].sort((a, b) => b.similarity - a.similarity);
            case "recency":
                // Assuming metadata.created_at exists
                return [...results].sort((a, b) => {
                    const dateA = new Date(a.metadata?.created_at || 0).getTime();
                    const dateB = new Date(b.metadata?.created_at || 0).getTime();
                    return dateB - dateA;
                });
            case "balanced":
                // Combine similarity and recency
                return [...results].sort((a, b) => {
                    const scoreA = a.similarity * 0.7 + this.recencyScore(a) * 0.3;
                    const scoreB = b.similarity * 0.7 + this.recencyScore(b) * 0.3;
                    return scoreB - scoreA;
                });
            default:
                return results;
        }
    }

    private recencyScore(result: ChunkSearchResult): number {
        const created = new Date(result.metadata?.created_at || 0).getTime();
        const now = Date.now();
        const ageInDays = (now - created) / (1000 * 60 * 60 * 24);
        // Score: 1.0 for new, decreases over time
        return Math.max(0, 1 - ageInDays / 365);
    }

    private truncateContent(content: string, maxTokens: number): string {
        const maxChars = maxTokens * 4;
        if (content.length <= maxChars) return content;

        // Truncate at sentence boundary if possible
        const truncated = content.substring(0, maxChars);
        const lastPeriod = truncated.lastIndexOf(".");
        const lastQuestion = truncated.lastIndexOf("?");
        const lastExclamation = truncated.lastIndexOf("!");

        const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

        if (lastSentence > maxChars * 0.8) {
            // Good sentence boundary found
            return truncated.substring(0, lastSentence + 1) + "...";
        }

        // No good boundary, truncate at word
        const lastSpace = truncated.lastIndexOf(" ");
        return truncated.substring(0, lastSpace) + "...";
    }
}
```

**File:** `backend/src/temporal/activities/agent/agent-activities.ts` (MODIFY)

**Update executeKnowledgeBaseTool:**

```typescript
import { ContextWindowManager } from "./context-window-manager";

export async function executeKnowledgeBaseTool(input: ExecuteKBToolInput): Promise<JsonObject> {
    // ... existing code to search KB ...

    const searchResults = await chunkRepo.searchSimilar({
        knowledge_base_id: tool.config.knowledgeBaseId,
        query_embedding: embeddingResult.embedding,
        top_k: topK,
        similarity_threshold: minScore
    });

    // NEW: Apply context window management
    const cwManager = new ContextWindowManager();
    const { truncated, omittedCount, totalTokens } = cwManager.truncateResults(searchResults, {
        maxTokens: 4000, // Reserve space for other context
        prioritizeBy: "similarity"
    });

    return {
        success: true,
        query: args.query,
        knowledgeBaseName: kb.name,
        resultCount: truncated.length,
        results: truncated.map((result, index) => ({
            rank: index + 1,
            content: result.content,
            source: result.document_name,
            chunkIndex: result.chunk_index,
            similarity: result.similarity,
            metadata: result.metadata
        })),
        summary: `Found ${truncated.length} relevant chunks (${omittedCount} omitted due to size)`,
        metadata: {
            totalTokensUsed: totalTokens,
            cached: embeddingResult.cached
        }
    };
}
```

**Benefits:**

- Prevents token overflow errors
- Prioritizes most relevant content
- Preserves sentence boundaries for readability
- Provides transparency (shows omitted count)

---

## 7. Critical Files

### Backend Files to CREATE:

1. `backend/src/api/routes/agents/list-available-knowledge-bases.ts`
2. `backend/src/api/routes/agents/add-knowledge-base-tool.ts`
3. `backend/src/api/routes/agents/update-knowledge-base-tool.ts`
4. `backend/src/services/EmbeddingCacheService.ts`
5. `backend/src/temporal/activities/agent/context-window-manager.ts`

### Backend Files to MODIFY:

6. `backend/src/api/routes/agents/index.ts` - Register new routes
7. `backend/src/storage/models/Agent.ts` - Enhance ToolConfig interface
8. `backend/src/services/EmbeddingService.ts` - Add cache integration
9. `backend/src/temporal/activities/agent/agent-activities.ts` - Add context window management

### Frontend Files to CREATE:

10. `frontend/src/components/agents/AddKnowledgeBaseDialog.tsx`
11. `frontend/src/components/agents/EditKBToolDialog.tsx`

### Frontend Files to MODIFY:

12. `frontend/src/lib/api.ts` - Add API functions and types
13. `frontend/src/pages/AgentBuilder.tsx` - Add dialogs and handlers
14. `frontend/src/components/agents/ToolsList.tsx` - Add KB tool display

### Files that DON'T need changes:

- `backend/src/temporal/activities/agent/agent-activities.ts` - `executeKnowledgeBaseTool` already works (only needs context window addition)
- `backend/src/api/routes/agents/remove-tool.ts` - Already handles all tool types
- `backend/src/storage/repositories/KnowledgeBaseRepository.ts` - All methods exist

---

## 8. Implementation Phases

### Phase 1A: Backend API

1. Create route handlers for list/add/update KB tools
2. Register routes in agents index
3. Update ToolConfig interface
4. Write integration tests

### Phase 1B: Frontend UI

1. Create AddKnowledgeBaseDialog with KB list and configure views
2. Implement Quick Add and Manual configuration flows
3. Create EditKBToolDialog
4. Update ToolsList to display KB tools with badges
5. Integrate dialogs into AgentBuilder
6. Add API client functions
7. Test end-to-end flow

### Phase 2A: Query Embedding Cache

1. Create EmbeddingCacheService with Redis integration
2. Update EmbeddingService to use cache
3. Add cache hit/miss logging
4. Test cache effectiveness

### Phase 2B: Context Window Management

1. Create ContextWindowManager with truncation logic
2. Integrate into executeKnowledgeBaseTool
3. Add tests for various result sizes
4. Verify token estimation accuracy

---

## 9. Testing Strategy

### Unit Tests

- Validate KB tool creation with various inputs
- Test duplicate KB prevention
- Test KB ownership validation
- Test context window truncation logic
- Test embedding cache hit/miss

### Integration Tests

```typescript
describe("KB Tool Integration", () => {
    it("should link KB to agent and execute search", async () => {
        const agent = await createTestAgent();
        const kb = await createTestKB();
        await uploadTestDocument(kb.id, "test.pdf");

        // Link KB
        const response = await addKnowledgeBaseTool(agent.id, {
            knowledgeBaseId: kb.id,
            toolName: "search_test",
            toolDescription: "Test KB"
        });

        expect(response.success).toBe(true);

        // Execute agent
        const execution = await runAgent(agent.id, "What's in the document?");
        expect(execution.toolCalls).toContainEqual(
            expect.objectContaining({ name: "search_test" })
        );
    });

    it("should prevent duplicate KB linking", async () => {
        const agent = await createTestAgent();
        const kb = await createTestKB();

        await addKnowledgeBaseTool(agent.id, { knowledgeBaseId: kb.id, ... });

        await expect(
            addKnowledgeBaseTool(agent.id, { knowledgeBaseId: kb.id, ... })
        ).rejects.toThrow("already linked");
    });

    it("should cache query embeddings", async () => {
        const query = "test query";
        const result1 = await embeddingService.generateQueryEmbedding(query, config);
        const result2 = await embeddingService.generateQueryEmbedding(query, config);

        expect(result1.cached).toBe(false);
        expect(result2.cached).toBe(true);
        expect(result1.embedding).toEqual(result2.embedding);
    });
});
```

### E2E Tests

- Complete flow from adding KB tool to agent chat
- Quick Add vs Manual configuration flows
- Edit KB tool configuration
- Verify deleted KB shows warning

---

## 10. Edge Cases & Solutions

### 10.1 Knowledge Base Deletion

**Approach:** Soft Check (as selected)

**Implementation:**

- Tool remains in agent's `available_tools`
- At execution time, if KB not found, return error to LLM
- UI shows warning badge for orphaned KB tools

**Code:**

```typescript
// In executeKnowledgeBaseTool
const kb = await kbRepo.findById(tool.config.knowledgeBaseId);
if (!kb) {
    return {
        success: false,
        error: true,
        message: "Knowledge base not found. It may have been deleted."
    };
}

// In ToolsList.tsx
function validateKBTool(tool: Tool): boolean {
    const kb = knowledgeBases.find((kb) => kb.id === tool.config.knowledgeBaseId);
    return kb !== null;
}
```

### 10.2 Large Result Sets

**Approach:** Context Window Management (Phase 2)

- Enforce `topK` limit (max 20)
- Enforce `minScore` threshold (default 0.7)
- Use ContextWindowManager to truncate if needed
- Prioritize by similarity score

### 10.3 Duplicate KB Linking

**Approach:** Validation

- Check if KB already linked before adding
- Return 400 error with clear message
- Show error in UI dialog

---

## 11. Success Criteria

### Phase 1

- ✅ User can browse KBs and see stats
- ✅ User can Quick Add KB with defaults
- ✅ User can manually configure KB tool
- ✅ User can edit existing KB tool
- ✅ User can remove KB tool
- ✅ KB tools display properly in tools list
- ✅ Agent successfully calls KB tool during chat
- ✅ Deleted KB shows warning in UI

### Phase 2

- ✅ Query embeddings cached in Redis
- ✅ Cache hit rate >40% for repeated queries
- ✅ Context window truncation prevents overflow
- ✅ Truncation preserves highest similarity chunks

---

## 12. Summary

This specification enables agents to search knowledge bases during conversations by:

1. **Following existing patterns:** MCP tool linking approach
2. **Leveraging existing infrastructure:** `executeKnowledgeBaseTool` already works
3. **Minimal backend changes:** Primarily API layer (3 new endpoints)
4. **Rich frontend UX:** Quick Add + Manual config + Edit capability
5. **Performance optimizations:** Caching and context management
6. **Robust error handling:** Deleted KB handling, validation, truncation

**Key Innovation:** Transforms knowledge bases into LLM-callable tools, enabling dynamic retrieval-augmented generation during agent conversations.
