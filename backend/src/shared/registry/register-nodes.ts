import { nodeRegistry } from "./NodeRegistry";

/**
 * Register all available node types with their metadata
 * Node execution is handled by Temporal activities
 */
export function registerAllNodes(): void {
    // AI & ML Nodes
    nodeRegistry.register("llm", {
        type: "llm",
        displayName: "LLM",
        description: "Call a Large Language Model (OpenAI, Anthropic, etc.)",
        icon: "🤖",
        category: "ai",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("vision", {
        type: "vision",
        displayName: "Vision",
        description: "Image analysis and generation",
        icon: "👁️",
        category: "ai",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("audio", {
        type: "audio",
        displayName: "Audio",
        description: "Speech-to-text and text-to-speech",
        icon: "🔊",
        category: "ai",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("embeddings", {
        type: "embeddings",
        displayName: "Embeddings",
        description: "Generate vector embeddings",
        icon: "🧬",
        category: "ai",
        inputs: {},
        outputs: {},
        configForm: []
    });

    // Logic & Control Flow Nodes
    nodeRegistry.register("conditional", {
        type: "conditional",
        displayName: "Conditional",
        description: "If/else branching logic",
        icon: "🔀",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("switch", {
        type: "switch",
        displayName: "Switch",
        description: "Multi-branch conditional logic",
        icon: "🎛️",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("loop", {
        type: "loop",
        displayName: "Loop",
        description: "Iterate over arrays or repeat actions",
        icon: "🔁",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("code", {
        type: "code",
        displayName: "Code",
        description: "Execute custom JavaScript/Python code",
        icon: "💻",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("wait", {
        type: "wait",
        displayName: "Wait",
        description: "Delay execution or schedule for later",
        icon: "⏰",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    // Data Operation Nodes
    nodeRegistry.register("input", {
        type: "input",
        displayName: "Input",
        description: "Workflow input parameter",
        icon: "📥",
        category: "data",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("transform", {
        type: "transform",
        displayName: "Transform",
        description: "Transform and map data (JSONata, JMESPath)",
        icon: "🔄",
        category: "data",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("variable", {
        type: "variable",
        displayName: "Variable",
        description: "Store and retrieve workflow variables",
        icon: "📦",
        category: "data",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("output", {
        type: "output",
        displayName: "Output",
        description: "Workflow output value",
        icon: "📤",
        category: "data",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("knowledgeBaseQuery", {
        type: "knowledgeBaseQuery",
        displayName: "Knowledge Base Query",
        description: "Search knowledge base using semantic similarity (RAG)",
        icon: "📚",
        category: "data",
        inputs: {
            queryText: {
                type: "string",
                description: "Text to search for (supports variables like {{input.query}})",
                required: true
            }
        },
        outputs: {
            results: {
                type: "array",
                description: "Array of matching chunks with similarity scores"
            },
            topResult: {
                type: "object",
                description: "The most relevant result"
            },
            combinedText: {
                type: "string",
                description: "All results formatted for LLM prompts"
            },
            count: {
                type: "number",
                description: "Number of results returned"
            }
        },
        configForm: [
            {
                key: "knowledgeBaseId",
                type: "select",
                label: "Knowledge Base",
                description: "Select which knowledge base to search",
                required: true
            }
        ]
    });

    // Connection Nodes
    nodeRegistry.register("http", {
        type: "http",
        displayName: "HTTP Request",
        description: "Make HTTP/REST API calls",
        icon: "🌐",
        category: "connect",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("database", {
        type: "database",
        displayName: "Database",
        description: "Query SQL/NoSQL databases",
        icon: "🗄️",
        category: "connect",
        inputs: {},
        outputs: {},
        configForm: []
    });

    nodeRegistry.register("integration", {
        type: "integration",
        displayName: "Integration",
        description: "Connect to external services (Slack, Email, etc.)",
        icon: "🔌",
        category: "connect",
        inputs: {},
        outputs: {},
        configForm: []
    });

    // File Operations
    nodeRegistry.register("fileOperations", {
        type: "fileOperations",
        displayName: "File Operations",
        description: "Parse PDF, CSV, and other file formats",
        icon: "📄",
        category: "data",
        inputs: {},
        outputs: {},
        configForm: []
    });

    // User Interaction
    nodeRegistry.register("user-input", {
        type: "user-input",
        displayName: "User Input",
        description: "Request input from user (human-in-the-loop)",
        icon: "👤",
        category: "logic",
        inputs: {},
        outputs: {},
        configForm: []
    });

    // Test/Debug
    nodeRegistry.register("echo", {
        type: "echo",
        displayName: "Echo",
        description: "Echo input (for testing)",
        icon: "📣",
        category: "test",
        inputs: {},
        outputs: {},
        configForm: []
    });

    console.log(`✅ Registered ${nodeRegistry.getAllTypes().length} node types`);
}
