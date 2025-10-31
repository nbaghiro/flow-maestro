import { useCallback, useState } from "react";
import {
    Bot,
    Eye,
    Mic,
    Sparkles,
    GitBranch,
    GitMerge,
    Repeat,
    Code2,
    Clock,
    Hand,
    Shuffle,
    Variable,
    Send,
    BookOpen,
    Globe,
    Database,
    Plug,
    ChevronDown,
    ChevronRight,
    Search,
    PanelLeftClose,
    PanelLeft,
    MessageSquare,
    Ear,
    ListOrdered,
    PhoneOff,
} from "lucide-react";

interface NodeDefinition {
    type: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    category: string;
    description: string;
}

const nodeLibrary: NodeDefinition[] = [
    // AI & ML (4 nodes)
    {
        type: "llm",
        label: "LLM",
        icon: Bot,
        category: "ai",
        description: "Text generation with OpenAI, Anthropic, Google, etc.",
    },
    {
        type: "vision",
        label: "Vision",
        icon: Eye,
        category: "ai",
        description: "Image generation and analysis with AI models",
    },
    {
        type: "audio",
        label: "Audio",
        icon: Mic,
        category: "ai",
        description: "Speech-to-text and text-to-speech processing",
    },
    {
        type: "embeddings",
        label: "Embeddings",
        icon: Sparkles,
        category: "ai",
        description: "Generate vector embeddings for semantic search",
    },

    // Logic & Code (5 nodes)
    {
        type: "conditional",
        label: "Conditional",
        icon: GitBranch,
        category: "logic",
        description: "Branch workflow based on if/else conditions",
    },
    {
        type: "switch",
        label: "Switch",
        icon: GitMerge,
        category: "logic",
        description: "Multiple branch conditions like switch/case",
    },
    {
        type: "loop",
        label: "Loop",
        icon: Repeat,
        category: "logic",
        description: "Iterate over arrays or lists of items",
    },
    {
        type: "code",
        label: "Code",
        icon: Code2,
        category: "logic",
        description: "Run custom JavaScript or Python code",
    },
    {
        type: "wait",
        label: "Wait/Delay",
        icon: Clock,
        category: "logic",
        description: "Pause workflow execution for a duration",
    },

    // Data Operations (5 nodes)
    {
        type: "input",
        label: "Input",
        icon: Hand,
        category: "data",
        description: "Collect user input, file upload, or choices",
    },
    {
        type: "transform",
        label: "Transform",
        icon: Shuffle,
        category: "data",
        description: "Transform data with JSONPath, templates, filters",
    },
    {
        type: "variable",
        label: "Variable",
        icon: Variable,
        category: "data",
        description: "Set or get workflow variables",
    },
    {
        type: "knowledgeBaseQuery",
        label: "KB Query",
        icon: BookOpen,
        category: "data",
        description: "Search knowledge base using semantic similarity (RAG)",
    },
    {
        type: "output",
        label: "Output",
        icon: Send,
        category: "data",
        description: "Display final workflow results",
    },

    // Connect (3 nodes)
    {
        type: "http",
        label: "HTTP",
        icon: Globe,
        category: "connect",
        description: "Make HTTP requests to external APIs",
    },
    {
        type: "database",
        label: "Database",
        icon: Database,
        category: "connect",
        description: "Query SQL or NoSQL databases",
    },
    {
        type: "integration",
        label: "Integration",
        icon: Plug,
        category: "connect",
        description: "Connect to Slack, Email, Google Sheets, etc.",
    },

    // Voice (4 nodes)
    {
        type: "voice_greet",
        label: "Say Message",
        icon: MessageSquare,
        category: "voice",
        description: "Play text-to-speech message to caller",
    },
    {
        type: "voice_listen",
        label: "Listen",
        icon: Ear,
        category: "voice",
        description: "Capture caller's speech with speech-to-text",
    },
    {
        type: "voice_menu",
        label: "Menu",
        icon: ListOrdered,
        category: "voice",
        description: "Present IVR menu with multiple options",
    },
    {
        type: "voice_hangup",
        label: "Hang Up",
        icon: PhoneOff,
        category: "voice",
        description: "End the phone call",
    },
];

const categories = [
    { id: "ai", label: "AI & ML", color: "text-blue-600", bgColor: "bg-blue-50" },
    { id: "logic", label: "Logic & Code", color: "text-purple-600", bgColor: "bg-purple-50" },
    { id: "data", label: "Data Operations", color: "text-green-600", bgColor: "bg-green-50" },
    { id: "connect", label: "Connect", color: "text-orange-600", bgColor: "bg-orange-50" },
    { id: "voice", label: "Voice & Calls", color: "text-emerald-600", bgColor: "bg-emerald-50" },
];

interface NodeLibraryProps {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export function NodeLibrary({ isCollapsed = false, onToggleCollapse }: NodeLibraryProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(["ai", "logic", "data", "connect"])
    );
    const [searchQuery, setSearchQuery] = useState("");

    const toggleCategory = (categoryId: string) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";
    }, []);

    const filteredLibrary = nodeLibrary.filter((node) =>
        node.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isCollapsed) {
        return (
            <div className="w-12 bg-white border-r border-border flex flex-col items-center py-4">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Expand sidebar"
                >
                    <PanelLeft className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>
        );
    }

    return (
        <div className="w-64 bg-white border-r border-border flex flex-col h-full shadow-panel">
            {/* Header */}
            <div className="px-3 py-3 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold">Nodes</h2>
                    <button
                        onClick={onToggleCollapse}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        title="Collapse sidebar"
                    >
                        <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto py-2">
                {categories.map((category) => {
                    const nodes = filteredLibrary.filter((node) => node.category === category.id);
                    if (nodes.length === 0 && searchQuery) return null;

                    const isExpanded = expandedCategories.has(category.id);

                    return (
                        <div key={category.id} className="mb-1">
                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/50 transition-colors group"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {category.label}
                                </h3>
                            </button>

                            {isExpanded && (
                                <div className="py-0.5">
                                    {nodes.map((node) => {
                                        const IconComponent = node.icon;
                                        return (
                                            <div
                                                key={node.type}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, node.type)}
                                                className="group px-3 py-1.5 cursor-move hover:bg-muted/70 transition-colors active:bg-muted flex items-center gap-2"
                                                title={node.description}
                                            >
                                                <div className={`p-1 rounded ${category.bgColor} flex-shrink-0`}>
                                                    <IconComponent className={`w-3.5 h-3.5 ${category.color}`} />
                                                </div>
                                                <span className="text-xs font-medium text-foreground">
                                                    {node.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
