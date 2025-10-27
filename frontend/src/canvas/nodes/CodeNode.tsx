import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Code2 } from "lucide-react";

interface CodeNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        language?: string;
        code?: string;
    };
}

function CodeNode({ data, selected }: NodeProps<CodeNodeData>) {
    const language = data.config?.language || "javascript";
    const hasCode = data.config?.code && data.config.code.length > 0;

    return (
        <BaseNode
            icon={Code2}
            label={data.label || "Code"}
            status={data.status}
            category="logic"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Language:</span>
                    <span className="text-xs font-medium capitalize">{language}</span>
                </div>
                <div className="text-xs text-muted-foreground italic">
                    {hasCode ? "Custom code configured" : "No code added"}
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(CodeNode);
