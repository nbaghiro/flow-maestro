import { EventEmitter as NodeEventEmitter } from "events";
import { WebSocketEvent, WebSocketEventType } from "@flowmaestro/shared";

type EventHandler = (event: WebSocketEvent) => void;

export class WorkflowEventEmitter {
    private emitter: NodeEventEmitter;

    constructor() {
        this.emitter = new NodeEventEmitter();
        this.emitter.setMaxListeners(100); // Support many concurrent executions
    }

    emit(type: WebSocketEventType, data: Record<string, any>): void {
        const event: WebSocketEvent = {
            type,
            timestamp: Date.now(),
            ...data
        };

        // Emit to specific execution listeners
        if (data.executionId) {
            this.emitter.emit(`execution:${data.executionId}`, event);
        }

        // Emit to general listeners
        this.emitter.emit(type, event);
    }

    on(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.on(event, handler);
    }

    once(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.once(event, handler);
    }

    off(event: WebSocketEventType | string, handler: EventHandler): void {
        this.emitter.off(event, handler);
    }

    removeAllListeners(event?: WebSocketEventType | string): void {
        if (event) {
            this.emitter.removeAllListeners(event);
        } else {
            this.emitter.removeAllListeners();
        }
    }

    // Convenience methods for common events
    emitExecutionStarted(executionId: string, workflowName: string, totalNodes: number): void {
        this.emit("execution:started", {
            executionId,
            workflowName,
            totalNodes
        });
    }

    emitExecutionProgress(executionId: string, completed: number, total: number, percentage: number): void {
        this.emit("execution:progress", {
            executionId,
            completed,
            total,
            percentage
        });
    }

    emitExecutionCompleted(executionId: string, outputs: any, duration: number): void {
        this.emit("execution:completed", {
            executionId,
            status: "completed",
            outputs,
            duration
        });
    }

    emitExecutionFailed(executionId: string, error: string, failedNodeId?: string): void {
        this.emit("execution:failed", {
            executionId,
            status: "failed",
            error,
            failedNodeId
        });
    }

    emitNodeStarted(executionId: string, nodeId: string, nodeName: string, nodeType: string): void {
        this.emit("node:started", {
            executionId,
            nodeId,
            nodeName,
            nodeType
        });
    }

    emitNodeCompleted(executionId: string, nodeId: string, output: any, duration: number, metadata?: any): void {
        this.emit("node:completed", {
            executionId,
            nodeId,
            output,
            duration,
            metadata
        });
    }

    emitNodeFailed(executionId: string, nodeId: string, error: string): void {
        this.emit("node:failed", {
            executionId,
            nodeId,
            error
        });
    }

    emitNodeRetry(executionId: string, nodeId: string, attempt: number, nextRetryIn: number, error: string): void {
        this.emit("node:retry", {
            executionId,
            nodeId,
            attempt,
            nextRetryIn,
            error
        });
    }

    emitNodeStream(executionId: string, nodeId: string, chunk: string): void {
        this.emit("node:stream", {
            executionId,
            nodeId,
            chunk
        });
    }

    emitUserInputRequired(executionId: string, nodeId: string, prompt: string, inputType: string, validation?: any): void {
        this.emit("user:input:required", {
            executionId,
            nodeId,
            prompt,
            inputType,
            validation
        });
    }
}

// Global singleton instance
export const globalEventEmitter = new WorkflowEventEmitter();
