import { useEffect } from "react";
import { wsClient } from "../lib/websocket";
import { useWorkflowStore } from "../stores/workflowStore";

/**
 * Sets up global WebSocket event handlers for workflow execution events
 * This hook should be called once at the app level to connect events to the store
 */
export function useExecutionEventHandlers() {
    const { updateNodeState, updateExecutionStatus, addExecutionLog, updateVariable } =
        useWorkflowStore();

    useEffect(() => {
        // Execution lifecycle events
        const handleExecutionStarted = (event: any) => {
            console.log("[WS] Execution started:", event);
            addExecutionLog({
                level: "info",
                message: `Workflow started: ${event.workflowName} (${event.totalNodes} nodes)`,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleExecutionProgress = (event: any) => {
            console.log("[WS] Execution progress:", event);
            addExecutionLog({
                level: "info",
                message: `Progress: ${event.completed}/${event.total} nodes (${event.percentage}%)`,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleExecutionCompleted = (event: any) => {
            console.log("[WS] Execution completed:", event);
            updateExecutionStatus("completed");
            addExecutionLog({
                level: "success",
                message: `Workflow completed successfully in ${event.duration}ms`,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleExecutionFailed = (event: any) => {
            console.log("[WS] Execution failed:", event);
            updateExecutionStatus("failed");
            addExecutionLog({
                level: "error",
                message: `Workflow failed: ${event.error}`,
                timestamp: new Date(event.timestamp)
            });
        };

        // Node lifecycle events
        const handleNodeStarted = (event: any) => {
            console.log("[WS] Node started:", event);
            updateNodeState(event.nodeId, {
                status: "running",
                startedAt: new Date(event.timestamp)
            });
            addExecutionLog({
                level: "info",
                message: `Node started: ${event.nodeName} (${event.nodeType})`,
                nodeId: event.nodeId,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleNodeCompleted = (event: any) => {
            console.log("[WS] Node completed:", event);
            updateNodeState(event.nodeId, {
                status: "success",
                completedAt: new Date(event.timestamp),
                output: event.output,
                duration: event.duration
            });
            addExecutionLog({
                level: "success",
                message: `Node completed in ${event.duration}ms`,
                nodeId: event.nodeId,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleNodeFailed = (event: any) => {
            console.log("[WS] Node failed:", event);
            updateNodeState(event.nodeId, {
                status: "error",
                completedAt: new Date(event.timestamp),
                error: event.error
            });
            addExecutionLog({
                level: "error",
                message: `Node failed: ${event.error}`,
                nodeId: event.nodeId,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleNodeRetry = (event: any) => {
            console.log("[WS] Node retry:", event);
            addExecutionLog({
                level: "warning",
                message: `Retrying node (attempt ${event.attempt}): ${event.error}`,
                nodeId: event.nodeId,
                timestamp: new Date(event.timestamp)
            });
        };

        const handleNodeStream = (event: any) => {
            console.log("[WS] Node stream:", event);
            // Handle streaming data (e.g., LLM token generation)
            // You can implement custom handling for streaming nodes here
        };

        // Register all event handlers
        wsClient.on("execution:started", handleExecutionStarted);
        wsClient.on("execution:progress", handleExecutionProgress);
        wsClient.on("execution:completed", handleExecutionCompleted);
        wsClient.on("execution:failed", handleExecutionFailed);
        wsClient.on("node:started", handleNodeStarted);
        wsClient.on("node:completed", handleNodeCompleted);
        wsClient.on("node:failed", handleNodeFailed);
        wsClient.on("node:retry", handleNodeRetry);
        wsClient.on("node:stream", handleNodeStream);

        // Cleanup: Remove all event handlers when component unmounts
        return () => {
            wsClient.off("execution:started", handleExecutionStarted);
            wsClient.off("execution:progress", handleExecutionProgress);
            wsClient.off("execution:completed", handleExecutionCompleted);
            wsClient.off("execution:failed", handleExecutionFailed);
            wsClient.off("node:started", handleNodeStarted);
            wsClient.off("node:completed", handleNodeCompleted);
            wsClient.off("node:failed", handleNodeFailed);
            wsClient.off("node:retry", handleNodeRetry);
            wsClient.off("node:stream", handleNodeStream);
        };
    }, [updateNodeState, updateExecutionStatus, addExecutionLog, updateVariable]);
}
