import { globalEventEmitter } from "../../shared/events/EventEmitter";

/**
 * Activities for emitting orchestration events to WebSocket clients
 * These are side-effect activities called from the orchestrator workflow
 */

export interface EmitExecutionStartedInput {
    executionId: string;
    workflowName: string;
    totalNodes: number;
}

export interface EmitExecutionProgressInput {
    executionId: string;
    completed: number;
    total: number;
    percentage: number;
}

export interface EmitExecutionCompletedInput {
    executionId: string;
    outputs: Record<string, any>;
    duration: number;
}

export interface EmitExecutionFailedInput {
    executionId: string;
    error: string;
    failedNodeId?: string;
}

export interface EmitNodeStartedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
}

export interface EmitNodeCompletedInput {
    executionId: string;
    nodeId: string;
    output: any;
    duration: number;
    metadata?: any;
}

export interface EmitNodeFailedInput {
    executionId: string;
    nodeId: string;
    error: string;
}

/**
 * Emit execution started event
 */
export async function emitExecutionStarted(input: EmitExecutionStartedInput): Promise<void> {
    const { executionId, workflowName, totalNodes } = input;
    globalEventEmitter.emitExecutionStarted(executionId, workflowName, totalNodes);
}

/**
 * Emit execution progress event
 */
export async function emitExecutionProgress(input: EmitExecutionProgressInput): Promise<void> {
    const { executionId, completed, total, percentage } = input;
    globalEventEmitter.emitExecutionProgress(executionId, completed, total, percentage);
}

/**
 * Emit execution completed event
 */
export async function emitExecutionCompleted(input: EmitExecutionCompletedInput): Promise<void> {
    const { executionId, outputs, duration } = input;
    globalEventEmitter.emitExecutionCompleted(executionId, outputs, duration);
}

/**
 * Emit execution failed event
 */
export async function emitExecutionFailed(input: EmitExecutionFailedInput): Promise<void> {
    const { executionId, error, failedNodeId } = input;
    globalEventEmitter.emitExecutionFailed(executionId, error, failedNodeId);
}

/**
 * Emit node started event
 */
export async function emitNodeStarted(input: EmitNodeStartedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType } = input;
    globalEventEmitter.emitNodeStarted(executionId, nodeId, nodeName, nodeType);
}

/**
 * Emit node completed event
 */
export async function emitNodeCompleted(input: EmitNodeCompletedInput): Promise<void> {
    const { executionId, nodeId, output, duration, metadata } = input;
    globalEventEmitter.emitNodeCompleted(executionId, nodeId, output, duration, metadata);
}

/**
 * Emit node failed event
 */
export async function emitNodeFailed(input: EmitNodeFailedInput): Promise<void> {
    const { executionId, nodeId, error } = input;
    globalEventEmitter.emitNodeFailed(executionId, nodeId, error);
}
