import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { Database } from "lucide-react";

interface DatabaseNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    operation?: string;
    dbType?: string;
}

function DatabaseNode({ data, selected }: NodeProps<DatabaseNodeData>) {
    const operation = data.operation || "query";
    const dbType = data.dbType || "postgresql";

    return (
        <BaseNode
            icon={Database}
            label={data.label || "Database"}
            status={data.status}
            category="connect"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Type:</span>
                    <span className="text-xs font-medium capitalize">{dbType}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Operation:</span>
                    <span className="text-xs font-medium capitalize">{operation}</span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(DatabaseNode);
