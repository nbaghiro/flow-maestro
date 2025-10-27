import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Plug } from "lucide-react";

interface IntegrationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        service?: string;
        action?: string;
    };
}

function IntegrationNode({ data, selected }: NodeProps<IntegrationNodeData>) {
    const service = data.config?.service || "slack";
    const action = data.config?.action || "send_message";

    return (
        <BaseNode
            icon={Plug}
            label={data.label || "Integration"}
            status={data.status}
            category="connect"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Service:</span>
                    <span className="text-xs font-medium capitalize">{service}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Action:</span>
                    <span className="text-xs font-medium">{action.replace(/_/g, " ")}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(IntegrationNode);
