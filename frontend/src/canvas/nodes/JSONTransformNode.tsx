import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Shuffle } from "lucide-react";

interface JSONTransformNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        jsonPath?: string;
        transformType?: string;
        outputVariable?: string;
    };
}

function JSONTransformNode({ data, selected }: NodeProps<JSONTransformNodeData>) {
    const jsonPath = data.config?.jsonPath || "$.data";
    const transformType = data.config?.transformType || "extract";
    const outputVariable = data.config?.outputVariable || "transformed";

    return (
        <BaseNode
            icon={Shuffle}
            label={data.label || "Transform"}
            status={data.status}
            category="data"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium capitalize">{transformType}</span>
                </div>
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border truncate">
                    {jsonPath}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs text-muted-foreground">Output:</span>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">${outputVariable}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(JSONTransformNode);
