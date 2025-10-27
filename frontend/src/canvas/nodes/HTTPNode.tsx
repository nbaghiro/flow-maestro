import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Globe } from "lucide-react";

interface HTTPNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        method?: string;
        url?: string;
    };
}

function HTTPNode({ data, selected }: NodeProps<HTTPNodeData>) {
    const method = data.config?.method || "GET";
    const url = data.config?.url || "https://api.example.com";

    return (
        <BaseNode
            icon={Globe}
            label={data.label || "HTTP"}
            status={data.status}
            category="connect"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Method:</span>
                    <span className="text-xs font-medium font-mono">{method}</span>
                </div>
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border truncate">
                    {url}
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(HTTPNode);
