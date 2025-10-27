/**
 * Results Panel - View workflow execution results and analysis
 */

import { useTestScenarioStore } from "../../../stores/testScenarioStore";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Activity,
    RotateCcw,
    Download,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { TimelineViewer } from "../../../components/execution/TimelineViewer";
import { OutputsViewer } from "../../../components/execution/OutputsViewer";

export function ResultsPanel() {
    const { execution, resetExecution, activeScenario } = useTestScenarioStore();

    if (execution.status === "idle") {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Activity className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Results Yet</h3>
                    <p className="text-sm text-muted-foreground">
                        Run a test scenario to see execution results here
                    </p>
                </div>
            </div>
        );
    }

    const isSuccess = execution.status === "completed";
    const isError = execution.status === "error";
    const duration = execution.duration ? (execution.duration / 1000).toFixed(2) : "0.00";

    const handleExportResults = () => {
        const results = {
            scenario: activeScenario?.name,
            status: execution.status,
            duration: execution.duration,
            startTime: execution.startTime,
            endTime: execution.endTime,
            outputs: execution.outputs,
            timeline: execution.timeline,
            logs: execution.logs,
            variables: execution.variables,
        };

        const blob = new Blob([JSON.stringify(results, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `execution-results-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Summary Header */}
            <div className="px-4 py-4 border-b border-border bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                    {/* Status */}
                    <div className="flex items-start gap-3">
                        <div
                            className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                isSuccess && "bg-green-100",
                                isError && "bg-red-100",
                                execution.status === "running" && "bg-blue-100"
                            )}
                        >
                            {isSuccess && (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            )}
                            {isError && <XCircle className="w-6 h-6 text-red-600" />}
                            {execution.status === "running" && (
                                <Activity className="w-6 h-6 text-blue-600 animate-pulse" />
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold">
                                {isSuccess && "Execution Successful"}
                                {isError && "Execution Failed"}
                                {execution.status === "running" && "Execution Running"}
                            </h3>
                            {execution.error && (
                                <p className="text-sm text-red-600 mt-1">{execution.error}</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportResults}
                            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={resetExecution}
                            className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Run Again
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="px-3 py-2 bg-background rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Clock className="w-3.5 h-3.5" />
                            Duration
                        </div>
                        <div className="text-lg font-semibold">{duration}s</div>
                    </div>

                    <div className="px-3 py-2 bg-background rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Activity className="w-3.5 h-3.5" />
                            Nodes Executed
                        </div>
                        <div className="text-lg font-semibold">{execution.timeline.length}</div>
                    </div>

                    <div className="px-3 py-2 bg-background rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Status
                        </div>
                        <div
                            className={cn(
                                "text-lg font-semibold capitalize",
                                isSuccess && "text-green-600",
                                isError && "text-red-600"
                            )}
                        >
                            {execution.status}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Timeline */}
                <div>
                    <h4 className="text-sm font-semibold mb-3">Execution Timeline</h4>
                    <TimelineViewer />
                </div>

                {/* Outputs */}
                {Object.keys(execution.outputs).length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold mb-3">Workflow Outputs</h4>
                        <OutputsViewer />
                    </div>
                )}
            </div>
        </div>
    );
}
