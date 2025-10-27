import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Sparkles } from "lucide-react";

interface EmbeddingsNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        model?: string;
        dimensions?: number;
    };
}

function EmbeddingsNode({ data, selected }: NodeProps<EmbeddingsNodeData>) {
    const model = data.config?.model || "text-embedding-3-small";
    const dimensions = data.config?.dimensions || 1536;

    return (
        <BaseNode
            icon={Sparkles}
            label={data.label || "Embeddings"}
            status={data.status}
            category="ai"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Model:</span>
                    <span className="text-xs font-medium">{model}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Dimensions:</span>
                    <span className="text-xs font-medium">{dimensions}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(EmbeddingsNode);
