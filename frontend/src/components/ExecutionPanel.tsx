/**
 * Execution Panel Component
 * Resizable right side panel for workflow triggers and execution management
 */

import { useRef, useEffect, useState } from "react";
import { useTriggerStore } from "../stores/triggerStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { ChevronLeft, ChevronRight, X, Zap, Play, History as HistoryIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { ExecutionPanelContent } from "./execution/ExecutionPanelContent";

interface ExecutionPanelProps {
    workflowId: string;
    renderButtonOnly?: boolean;
    renderPanelOnly?: boolean;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

type TabType = "triggers" | "execution" | "history";

export function ExecutionPanel({ workflowId, renderButtonOnly, renderPanelOnly }: ExecutionPanelProps) {
    const {
        isDrawerOpen,
        drawerWidth,
        setDrawerOpen,
        setDrawerWidth,
        triggers,
    } = useTriggerStore();

    const { selectNode, currentExecution } = useWorkflowStore();

    const [isResizing, setIsResizing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>("triggers");
    const drawerRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

    // Auto-switch to execution tab when an execution starts
    useEffect(() => {
        if (currentExecution && !isDrawerOpen) {
            setDrawerOpen(true);
            setActiveTab("execution");
        } else if (currentExecution && isDrawerOpen && activeTab === "triggers") {
            setActiveTab("execution");
        }
    }, [currentExecution?.id]);

    // Handle resize start
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = drawerWidth;
    };

    // Handle resize
    useEffect(() => {
        const handleResize = (e: MouseEvent) => {
            if (!isResizing) return;

            const deltaX = resizeStartX.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, resizeStartWidth.current + deltaX)
            );

            setDrawerWidth(newWidth);
        };

        const handleResizeEnd = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener("mousemove", handleResize);
            document.addEventListener("mouseup", handleResizeEnd);

            return () => {
                document.removeEventListener("mousemove", handleResize);
                document.removeEventListener("mouseup", handleResizeEnd);
            };
        }

        return undefined;
    }, [isResizing, setDrawerWidth, drawerWidth]);

    // Toggle drawer and deselect node when opening
    const toggleDrawer = () => {
        const newOpenState = !isDrawerOpen;
        setDrawerOpen(newOpenState);

        // Deselect node when opening execution panel
        if (newOpenState) {
            selectNode(null);
        }
    };

    // Get enabled trigger count
    const enabledCount = triggers.filter(t => t.enabled).length;

    // Render tabs
    const renderTabs = () => (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/20">
            <button
                onClick={() => setActiveTab("triggers")}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "triggers"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
            >
                <Zap className="w-4 h-4" />
                Triggers
                {enabledCount > 0 && activeTab === "triggers" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                        {enabledCount}
                    </span>
                )}
            </button>

            <button
                onClick={() => setActiveTab("execution")}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "execution"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
            >
                <Play className="w-4 h-4" />
                Execution
            </button>

            <button
                onClick={() => setActiveTab("history")}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    activeTab === "history"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
            >
                <HistoryIcon className="w-4 h-4" />
                History
            </button>
        </div>
    );

    // Render only button
    if (renderButtonOnly) {
        return (
            <button
                onClick={toggleDrawer}
                className={cn(
                    "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                    isDrawerOpen
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-background border-border hover:bg-muted"
                )}
            >
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-medium">Execution</span>
                    {enabledCount > 0 && (
                        <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            isDrawerOpen
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-primary/10 text-primary"
                        )}>
                            {enabledCount}
                        </span>
                    )}
                    {isDrawerOpen ? (
                        <ChevronRight className="w-4 h-4 opacity-70" />
                    ) : (
                        <ChevronLeft className="w-4 h-4 opacity-50" />
                    )}
                </div>
            </button>
        );
    }

    // Render only panel
    if (renderPanelOnly) {
        return isDrawerOpen ? (
            <div className="fixed top-0 right-0 bottom-0 z-50">
                <div
                    ref={drawerRef}
                    className="h-full bg-background border-l border-border shadow-2xl flex flex-col"
                    style={{ width: drawerWidth }}
                >
                    {/* Resize Handle */}
                    <div
                        className={cn(
                            "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
                            isResizing && "bg-primary/30"
                        )}
                        onMouseDown={handleResizeStart}
                    >
                        <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-semibold">Execution & Triggers</h3>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleDrawer}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Collapse"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        <ExecutionPanelContent workflowId={workflowId} activeTab={activeTab} />
                    </div>
                </div>
            </div>
        ) : null;
    }

    // Render both button and panel (default behavior)
    return (
        <>
            {/* Bottom Button - Always Visible */}
            <div>
                <button
                    onClick={toggleDrawer}
                    className={cn(
                        "px-4 py-2 border rounded-lg shadow-lg transition-colors",
                        isDrawerOpen
                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                            : "bg-background border-border hover:bg-muted"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">Execution</span>
                        {enabledCount > 0 && (
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                isDrawerOpen
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-primary/10 text-primary"
                            )}>
                                {enabledCount}
                            </span>
                        )}
                        {isDrawerOpen ? (
                            <ChevronRight className="w-4 h-4 opacity-70" />
                        ) : (
                            <ChevronLeft className="w-4 h-4 opacity-50" />
                        )}
                    </div>
                </button>
            </div>

            {/* Drawer Panel */}
            {isDrawerOpen && (
                <div className="fixed top-0 right-0 bottom-0 z-50">
                    <div
                        ref={drawerRef}
                        className="h-full bg-background border-l border-border shadow-2xl flex flex-col"
                        style={{ width: drawerWidth }}
                    >
                        {/* Resize Handle */}
                        <div
                            className={cn(
                                "absolute top-0 left-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
                                isResizing && "bg-primary/30"
                            )}
                            onMouseDown={handleResizeStart}
                        >
                            <div className="absolute top-0 left-0 bottom-0 w-3 -translate-x-1/2" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-semibold">Execution & Triggers</h3>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleDrawer}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Collapse"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                    title="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        {renderTabs()}

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            <ExecutionPanelContent workflowId={workflowId} activeTab={activeTab} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
