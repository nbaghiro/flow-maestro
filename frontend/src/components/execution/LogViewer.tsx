/**
 * Log Viewer Component
 * Display execution logs with filtering and auto-scroll
 */

import { useRef, useEffect, useState } from "react";
import { useTestScenarioStore } from "../../stores/testScenarioStore";
import { Info, AlertCircle, AlertTriangle, Bug, Trash2, Download } from "lucide-react";
import { cn } from "../../lib/utils";

export function LogViewer() {
    const { execution, clearLogs } = useTestScenarioStore();
    const [autoScroll, setAutoScroll] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [execution.logs, autoScroll]);

    // Filter logs
    const filteredLogs = filter
        ? execution.logs.filter((log) => log.level === filter)
        : execution.logs;

    // Level counts
    const levelCounts = execution.logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "info":
                return Info;
            case "warn":
                return AlertTriangle;
            case "error":
                return AlertCircle;
            case "debug":
                return Bug;
            default:
                return Info;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case "info":
                return "text-blue-600";
            case "warn":
                return "text-yellow-600";
            case "error":
                return "text-red-600";
            case "debug":
                return "text-gray-600";
            default:
                return "text-gray-600";
        }
    };

    const handleExportLogs = () => {
        const logsText = execution.logs
            .map(
                (log) =>
                    `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${
                        log.message
                    }${log.nodeId ? ` (${log.nodeId})` : ""}`
            )
            .join("\n");

        const blob = new Blob([logsText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `execution-logs-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (execution.logs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full p-8 text-sm text-muted-foreground">
                No logs yet. Logs will appear here during execution.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
                {/* Filters */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setFilter(null)}
                        className={cn(
                            "px-2 py-1 text-xs rounded transition-colors",
                            filter === null
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                    >
                        All ({execution.logs.length})
                    </button>
                    {["info", "debug", "warn", "error"].map((level) => (
                        <button
                            key={level}
                            onClick={() => setFilter(filter === level ? null : level)}
                            className={cn(
                                "px-2 py-1 text-xs rounded transition-colors capitalize",
                                filter === level
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:bg-muted"
                            )}
                        >
                            {level} ({levelCounts[level] || 0})
                        </button>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={(e) => setAutoScroll(e.target.checked)}
                            className="w-3 h-3 rounded border-border"
                        />
                        <span className="text-muted-foreground">Auto-scroll</span>
                    </label>

                    <button
                        onClick={handleExportLogs}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Export logs"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={clearLogs}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        title="Clear logs"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div
                ref={logContainerRef}
                className="flex-1 overflow-y-auto p-2 space-y-1 bg-muted/20 font-mono text-xs"
            >
                {filteredLogs.map((log) => {
                    const Icon = getLevelIcon(log.level);
                    const colorClass = getLevelColor(log.level);

                    return (
                        <div
                            key={log.id}
                            className="flex items-start gap-2 p-2 bg-background rounded hover:bg-muted/50 transition-colors"
                        >
                            <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", colorClass)} />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-muted-foreground">
                                        {new Date(log.timestamp).toLocaleTimeString()}
                                    </span>
                                    {log.nodeId && (
                                        <span className="text-primary text-xs">
                                            [{log.nodeName || log.nodeId}]
                                        </span>
                                    )}
                                </div>
                                <div className="text-foreground break-words">{log.message}</div>
                                {log.metadata && (
                                    <pre className="mt-1 text-xs text-muted-foreground">
                                        {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
