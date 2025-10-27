import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Send, FileText } from "lucide-react";

interface OutputNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        template?: string;
        format?: string;
    };
}

function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
    const template = data.config?.template || "No output template";
    const format = data.config?.format || "text";
    const templatePreview = template.substring(0, 60) + (template.length > 60 ? "..." : "");

    return (
        <BaseNode
            icon={Send}
            label={data.label || "Output"}
            status={data.status}
            category="data"
            selected={selected}
            hasOutputHandle={true}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium uppercase">{format}</span>
                    </div>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-border">
                    <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {templatePreview}
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(OutputNode);
