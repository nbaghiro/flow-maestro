import { Plug } from "lucide-react";
import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";

interface IntegrationNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    service?: string;
    action?: string;
}

function IntegrationNode({ data, selected }: NodeProps<IntegrationNodeData>) {
    const service = data.service || "slack";
    const action = data.action || "send_message";

    // Format action for display: handle both snake_case and camelCase
    const formatAction = (actionStr: string): string => {
        // Replace underscores with spaces
        let formatted = actionStr.replace(/_/g, " ");
        // Add spaces before capital letters (camelCase to space case)
        formatted = formatted.replace(/([A-Z])/g, " $1");
        // Capitalize first letter and trim
        return formatted.charAt(0).toUpperCase() + formatted.slice(1).trim();
    };

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
                    <span className="text-xs font-medium">{formatAction(action)}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(IntegrationNode);
