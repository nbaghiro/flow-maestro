import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";
// AI & ML
import { LLMNodeConfig } from "./configs/LLMNodeConfig";
import { VisionNodeConfig } from "./configs/VisionNodeConfig";
import { AudioNodeConfig } from "./configs/AudioNodeConfig";
import { EmbeddingsNodeConfig } from "./configs/EmbeddingsNodeConfig";
// Logic & Code
import { ConditionalNodeConfig } from "./configs/ConditionalNodeConfig";
import { SwitchNodeConfig } from "./configs/SwitchNodeConfig";
import { LoopNodeConfig } from "./configs/LoopNodeConfig";
import { CodeNodeConfig } from "./configs/CodeNodeConfig";
import { WaitNodeConfig } from "./configs/WaitNodeConfig";
// Data Operations
import { InputNodeConfig } from "./configs/InputNodeConfig";
import { TransformNodeConfig } from "./configs/TransformNodeConfig";
import { VariableNodeConfig } from "./configs/VariableNodeConfig";
import { OutputNodeConfig } from "./configs/OutputNodeConfig";
// Connect
import { HTTPNodeConfig } from "./configs/HTTPNodeConfig";
import { DatabaseNodeConfig } from "./configs/DatabaseNodeConfig";
import { IntegrationNodeConfig } from "./configs/IntegrationNodeConfig";
import { KnowledgeBaseQueryNodeConfig } from "./configs/KnowledgeBaseQueryNodeConfig";
// Voice & Calls
import { VoiceGreetNodeConfig } from "./configs/VoiceGreetNodeConfig";
import { VoiceListenNodeConfig } from "./configs/VoiceListenNodeConfig";
import { VoiceMenuNodeConfig } from "./configs/VoiceMenuNodeConfig";
import { VoiceHangupNodeConfig } from "./configs/VoiceHangupNodeConfig";

export function NodeInspector() {
    const { nodes, selectedNode, selectNode, updateNode } = useWorkflowStore();

    const node = nodes.find((n) => n.id === selectedNode);
    const [nodeName, setNodeName] = useState(node?.data.label || "");

    // Sync node name when node changes
    useEffect(() => {
        if (node) {
            setNodeName(node.data.label || "");
        }
    }, [node?.id, node?.data.label]);

    if (!node) {
        return null;
    }

    const handleClose = () => {
        selectNode(null);
    };

    const handleUpdate = (config: any) => {
        updateNode(node.id, { config });
    };

    const handleNameChange = (newName: string) => {
        setNodeName(newName);
        updateNode(node.id, { label: newName });
    };

    const renderConfig = () => {
        switch (node.type) {
            // AI & ML
            case "llm":
                return <LLMNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "vision":
                return <VisionNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "audio":
                return <AudioNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "embeddings":
                return <EmbeddingsNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Logic & Code
            case "conditional":
                return <ConditionalNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "switch":
                return <SwitchNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "loop":
                return <LoopNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "code":
                return <CodeNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "wait":
                return <WaitNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Data Operations
            case "input":
                return <InputNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "transform":
                return <TransformNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "variable":
                return <VariableNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "output":
                return <OutputNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Connect
            case "http":
                return <HTTPNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "database":
                return <DatabaseNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "integration":
                return <IntegrationNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "knowledgeBaseQuery":
                return <KnowledgeBaseQueryNodeConfig data={node.data} onUpdate={handleUpdate} />;

            // Voice & Calls
            case "voice_greet":
                return <VoiceGreetNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "voice_listen":
                return <VoiceListenNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "voice_menu":
                return <VoiceMenuNodeConfig data={node.data} onUpdate={handleUpdate} />;
            case "voice_hangup":
                return <VoiceHangupNodeConfig data={node.data} onUpdate={handleUpdate} />;

            default:
                return (
                    <div className="p-4 text-sm text-muted-foreground">
                        Configuration for {node.type} node coming soon...
                    </div>
                );
        }
    };

    return (
        <div className="w-96 bg-white border-l border-border flex flex-col h-full shadow-panel">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Node Configuration</h2>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-muted rounded transition-colors"
                    title="Close"
                >
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Node Name Field */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Node Name
                </label>
                <input
                    type="text"
                    value={nodeName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={`Enter custom name (e.g., "User Query")`}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                    Customize this node's display name in the workflow
                </p>
            </div>

            {/* Content */}
            <div key={node.id} className="flex-1 overflow-y-auto">
                {renderConfig()}
            </div>
        </div>
    );
}
