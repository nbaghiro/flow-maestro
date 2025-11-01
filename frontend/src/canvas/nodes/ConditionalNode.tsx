import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { BaseNode } from "./BaseNode";
import { GitBranch, CheckCircle2, XCircle } from "lucide-react";

interface ConditionalNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    conditionType?: "simple" | "expression";
    leftValue?: string;
    operator?: string;
    rightValue?: string;
    expression?: string;
}

function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
    const conditionType = data.conditionType || "simple";
    const leftValue = data.leftValue || "";
    const operator = data.operator || "==";
    const rightValue = data.rightValue || "";
    const expression = data.expression || "";

    const renderCondition = () => {
        if (conditionType === "expression" && expression) {
            return (
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border line-clamp-2">
                    {expression}
                </div>
            );
        }

        // Simple comparison
        const displayLeft = leftValue || "value1";
        const displayRight = rightValue || "value2";

        return (
            <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border">
                <span className="truncate inline-block max-w-[80px] align-bottom">{displayLeft}</span>
                {" "}<span className="text-primary font-semibold">{operator}</span>{" "}
                <span className="truncate inline-block max-w-[80px] align-bottom">{displayRight}</span>
            </div>
        );
    };

    return (
        <BaseNode
            icon={GitBranch}
            label={data.label || "Conditional"}
            status={data.status}
            category="logic"
            selected={selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    {/* Input Handle */}
                    <Handle
                        type="target"
                        position={Position.Top}
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-primary !shadow-sm"
                    />

                    {/* True Output Handle */}
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="true"
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-green-500 !shadow-sm"
                        style={{ left: "35%" }}
                    />

                    {/* False Output Handle */}
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        id="false"
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-red-500 !shadow-sm"
                        style={{ left: "65%" }}
                    />
                </>
            }
        >
            <div className="space-y-2">
                {renderCondition()}
                <div className="flex justify-between text-xs pt-1">
                    <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span className="font-medium">True</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-3 h-3" />
                        <span className="font-medium">False</span>
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(ConditionalNode);
