import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Shuffle } from "lucide-react";

interface TransformNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: "map" | "filter" | "reduce" | "sort" | "merge" | "extract" | "custom";
    inputData?: string;
    expression?: string;
}

function TransformNode({ data, selected }: NodeProps<TransformNodeData>) {
    const operation = data.operation || "map";
    const inputData = data.inputData || "";
    const expression = data.expression || "";

    const getOperationLabel = () => {
        switch (operation) {
            case "map":
                return "Map";
            case "filter":
                return "Filter";
            case "reduce":
                return "Reduce";
            case "sort":
                return "Sort";
            case "merge":
                return "Merge";
            case "extract":
                return "Extract";
            case "custom":
                return "Custom JSONata";
            default:
                return operation;
        }
    };

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
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-semibold">{getOperationLabel()}</span>
                </div>
                {inputData && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Input:</span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded truncate max-w-[140px]">
                            {inputData}
                        </span>
                    </div>
                )}
                {expression && (
                    <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border line-clamp-2">
                        {expression}
                    </div>
                )}
                {!inputData && !expression && (
                    <div className="text-xs text-muted-foreground italic text-center py-1">
                        Not configured
                    </div>
                )}
            </div>
        </BaseNode>
    );
}

export default memo(TransformNode);
