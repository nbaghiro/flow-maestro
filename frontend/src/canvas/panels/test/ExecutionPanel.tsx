/**
 * Execution Panel - Monitor running workflow execution
 */

import { useState } from "react";
import { useTestScenarioStore } from "../../../stores/testScenarioStore";
import { AlertCircle, Activity, Database, Network } from "lucide-react";
import { cn } from "../../../lib/utils";
import { LogViewer } from "../../../components/execution/LogViewer";
import { VariableInspector } from "../../../components/execution/VariableInspector";

type ExecutionTab = "logs" | "variables" | "network";

export function ExecutionPanel() {
    const { execution } = useTestScenarioStore();
    const [activeTab, setActiveTab] = useState<ExecutionTab>("logs");

    const tabs = [
        {
            id: "logs" as const,
            label: "Logs",
            icon: Activity,
            count: execution.logs.length,
        },
        {
            id: "variables" as const,
            label: "Variables",
            icon: Database,
            count: Object.keys(execution.variables).length,
        },
        {
            id: "network" as const,
            label: "Network",
            icon: Network,
            count: execution.networkRequests.length,
        },
    ];

    if (execution.status === "idle") {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Active Execution</h3>
                    <p className="text-sm text-muted-foreground">
                        Run a test scenario to see real-time execution monitoring here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Execution Status Bar */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                                execution.status === "running" &&
                                    "bg-blue-100 text-blue-700",
                                execution.status === "completed" &&
                                    "bg-green-100 text-green-700",
                                execution.status === "error" && "bg-red-100 text-red-700"
                            )}
                        >
                            {execution.status === "running" && (
                                <>
                                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                    Running
                                </>
                            )}
                            {execution.status === "completed" && "Completed"}
                            {execution.status === "error" && (
                                <>
                                    <AlertCircle className="w-3 h-3" />
                                    Error
                                </>
                            )}
                        </div>

                        {execution.duration !== null && (
                            <span className="text-xs text-muted-foreground">
                                Duration: {(execution.duration / 1000).toFixed(2)}s
                            </span>
                        )}
                    </div>

                    {execution.status === "running" && (
                        <div className="text-xs text-muted-foreground">
                            {execution.timeline.length} nodes executed
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-2 border-b border-border bg-background">
                <div className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                                    activeTab === tab.id
                                        ? "bg-muted text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span className="px-1.5 py-0.5 text-xs bg-muted-foreground/20 rounded">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === "logs" && <LogViewer />}
                {activeTab === "variables" && <VariableInspector />}
                {activeTab === "network" && (
                    <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">
                        Network monitoring coming soon...
                    </div>
                )}
            </div>
        </div>
    );
}
