import { ReactNode } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "../../lib/utils";
import { LucideIcon } from "lucide-react";

export type NodeStatus = "idle" | "pending" | "running" | "success" | "error";

interface BaseNodeProps {
    icon: LucideIcon;
    label: string;
    status?: NodeStatus;
    category?: "ai" | "logic" | "interaction" | "data" | "connect";
    children?: ReactNode;
    selected?: boolean;
    hasInputHandle?: boolean;
    hasOutputHandle?: boolean;
    customHandles?: ReactNode;
}

const statusConfig: Record<NodeStatus, { color: string; label: string }> = {
    idle: { color: "bg-gray-300", label: "Idle" },
    pending: { color: "bg-yellow-400", label: "Pending" },
    running: { color: "bg-blue-500 animate-pulse", label: "Running" },
    success: { color: "bg-green-500", label: "Success" },
    error: { color: "bg-red-500", label: "Error" },
};

const categoryConfig: Record<string, { borderColor: string; iconBg: string; iconColor: string; ringColor: string }> = {
    ai: {
        borderColor: "border-l-blue-500",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        ringColor: "ring-blue-500",
    },
    logic: {
        borderColor: "border-l-purple-500",
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
        ringColor: "ring-purple-500",
    },
    interaction: {
        borderColor: "border-l-green-500",
        iconBg: "bg-green-50",
        iconColor: "text-green-600",
        ringColor: "ring-green-500",
    },
    data: {
        borderColor: "border-l-teal-500",
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        ringColor: "ring-teal-500",
    },
    connect: {
        borderColor: "border-l-orange-500",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        ringColor: "ring-orange-500",
    },
};

export function BaseNode({
    icon: Icon,
    label,
    status = "idle",
    category = "data",
    children,
    selected = false,
    hasInputHandle = true,
    hasOutputHandle = true,
    customHandles,
}: BaseNodeProps) {
    const categoryStyle = categoryConfig[category];

    return (
        <div
            className={cn(
                "bg-white rounded-lg transition-all duration-200 min-w-[240px] max-w-[280px] overflow-hidden",
                "border-2 border-border",
                categoryStyle.borderColor,
                `node-${category}-category`,
                selected ? "shadow-node-hover" : "shadow-node hover:shadow-node-hover"
            )}
            style={{ borderLeftWidth: '4px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-md", categoryStyle.iconBg)}>
                        <Icon className={cn("w-3.5 h-3.5", categoryStyle.iconColor)} />
                    </div>
                    <span className="font-medium text-sm text-foreground">{label}</span>
                </div>
                <div
                    className={cn("w-1.5 h-1.5 rounded-full", statusConfig[status].color)}
                    title={statusConfig[status].label}
                />
            </div>

            {/* Content */}
            {children && (
                <div className="px-3 py-2.5 text-sm bg-white">
                    {children}
                </div>
            )}

            {/* Handles */}
            {customHandles || (
                <>
                    {hasInputHandle && (
                        <Handle
                            type="target"
                            position={Position.Top}
                            id="input"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                    {hasOutputHandle && (
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="output"
                            className="!w-2.5 !h-2.5 !bg-white !border-2 !border-border !shadow-sm"
                        />
                    )}
                </>
            )}
        </div>
    );
}
