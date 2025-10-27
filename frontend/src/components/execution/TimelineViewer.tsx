/**
 * Timeline Viewer Component
 * Visual timeline of workflow execution with node details
 */

import { useTestScenarioStore } from "../../stores/testScenarioStore";
import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import { cn } from "../../lib/utils";

export function TimelineViewer() {
    const { execution } = useTestScenarioStore();

    if (execution.timeline.length === 0) {
        return (
            <div className="text-center py-8 text-sm text-muted-foreground">
                No timeline events yet
            </div>
        );
    }

    return (
        <div className="space-y-0 relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {execution.timeline.map((event) => {
                const Icon =
                    event.status === "success"
                        ? CheckCircle2
                        : event.status === "error"
                        ? XCircle
                        : event.status === "running"
                        ? Clock
                        : Circle;

                const iconColor =
                    event.status === "success"
                        ? "text-green-600 bg-green-100"
                        : event.status === "error"
                        ? "text-red-600 bg-red-100"
                        : event.status === "running"
                        ? "text-blue-600 bg-blue-100"
                        : "text-gray-400 bg-gray-100";

                return (
                    <div key={event.id} className="relative flex items-start gap-4 pb-4">
                        {/* Icon */}
                        <div
                            className={cn(
                                "relative z-10 w-8 h-8 rounded-full flex items-center justify-center",
                                iconColor
                            )}
                        >
                            <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm">{event.nodeName}</span>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(event.timestamp).toLocaleTimeString()}
                                </span>
                            </div>

                            {event.duration !== undefined && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    Duration: {(event.duration / 1000).toFixed(2)}s
                                </div>
                            )}

                            {event.error && (
                                <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                                    {event.error}
                                </div>
                            )}

                            {event.output && (
                                <details className="mt-2">
                                    <summary className="text-xs text-primary cursor-pointer hover:underline">
                                        View output
                                    </summary>
                                    <pre className="mt-2 px-3 py-2 bg-muted rounded-lg text-xs overflow-x-auto">
                                        {JSON.stringify(event.output, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
