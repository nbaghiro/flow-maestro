import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { BaseNode } from "./BaseNode";
import { GitMerge } from "lucide-react";

interface SwitchNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    variable?: string;
    cases?: Array<{ value: string; label: string }>;
}

function SwitchNode({ data, selected }: NodeProps<SwitchNodeData>) {
    const variable = data.variable || "${value}";
    const caseCount = data.cases?.length || 3;

    return (
        <BaseNode
            icon={GitMerge}
            label={data.label || "Switch"}
            status={data.status}
            category="logic"
            selected={selected}
            hasOutputHandle={false}
            customHandles={
                <>
                    <Handle
                        type="target"
                        position={Position.Top}
                        className="!w-2.5 !h-2.5 !bg-white !border-2 !border-primary !shadow-sm"
                    />
                    {Array.from({ length: Math.min(caseCount, 4) }).map((_, i) => (
                        <Handle
                            key={i}
                            type="source"
                            position={Position.Bottom}
                            id={`case-${i}`}
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-purple-500 !shadow-sm"
                            style={{ left: `${25 + i * 17}%` }}
                        />
                    ))}
                </>
            }
        >
            <div className="space-y-2">
                <div className="text-xs font-mono bg-muted px-2.5 py-1.5 rounded border border-border truncate">
                    {variable}
                </div>
                <div className="text-xs text-muted-foreground">
                    {caseCount} case{caseCount !== 1 ? "s" : ""}
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(SwitchNode);
