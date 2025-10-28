/**
 * Test Drawer Component
 * Resizable right side panel for test scenario management and execution monitoring
 */

import { useRef, useEffect, useState } from "react";
import { useTestScenarioStore } from "../stores/testScenarioStore";
import { useWorkflowStore } from "../stores/workflowStore";
import { ChevronLeft, ChevronRight, X, Play, Settings, BarChart3 } from "lucide-react";
import { cn } from "../lib/utils";

interface TestDrawerProps {
    children?: React.ReactNode;
    renderButtonOnly?: boolean;
    renderPanelOnly?: boolean;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

export function TestDrawer({ children, renderButtonOnly, renderPanelOnly }: TestDrawerProps) {
    const {
        isDrawerOpen,
        drawerWidth,
        activeTab,
        setDrawerOpen,
        setDrawerWidth,
        setActiveTab,
        execution,
    } = useTestScenarioStore();

    const { selectNode } = useWorkflowStore();

    const [isResizing, setIsResizing] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(DEFAULT_WIDTH);

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

        // Deselect node when opening test panel
        if (newOpenState) {
            selectNode(null);
        }
    };

    // Tab configuration
    const tabs = [
        {
            id: "setup" as const,
            label: "Setup",
            icon: Settings,
        },
        {
            id: "execution" as const,
            label: "Execution",
            icon: Play,
            badge: execution.status === "running" ? "running" : undefined,
        },
        {
            id: "results" as const,
            label: "Results",
            icon: BarChart3,
            badge: execution.status === "completed" ? "completed" : undefined,
        },
    ];

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
                    <Play className="w-4 h-4" />
                    <span className="text-sm font-medium">Open Test Panel</span>
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
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">Test Scenario</h3>
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
                    <div className="px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
                        <div className="flex items-center gap-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors relative",
                                            activeTab === tab.id
                                                ? "bg-background text-foreground font-medium shadow-sm"
                                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                        )}
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                        {tab.badge && (
                                            <span
                                                className={cn(
                                                    "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                                                    tab.badge === "running"
                                                        ? "bg-blue-500 animate-pulse"
                                                        : "bg-green-500"
                                                )}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        {children}
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
                        <Play className="w-4 h-4" />
                        <span className="text-sm font-medium">Open Test Panel</span>
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
                        <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold">Test Scenario</h3>
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
                        <div className="px-4 py-2 border-b border-border bg-muted/30 flex-shrink-0">
                            <div className="flex items-center gap-1">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors relative",
                                                activeTab === tab.id
                                                    ? "bg-background text-foreground font-medium shadow-sm"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span>{tab.label}</span>
                                            {tab.badge && (
                                                <span
                                                    className={cn(
                                                        "absolute -top-1 -right-1 w-2 h-2 rounded-full",
                                                        tab.badge === "running"
                                                            ? "bg-blue-500 animate-pulse"
                                                            : "bg-green-500"
                                                    )}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            {children}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
