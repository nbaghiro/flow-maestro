/**
 * Test Scenario Store
 * Manages test scenarios, execution state, and monitoring
 */

import { create } from "zustand";
import {
    TriggerType,
    TriggerConfiguration,
    getDefaultTriggerConfig,
} from "../lib/triggerTypes";

/**
 * Execution status
 */
export type ExecutionStatus = "idle" | "running" | "completed" | "error";

/**
 * Node status during execution
 */
export type NodeExecutionStatus = "idle" | "pending" | "running" | "success" | "error";

/**
 * Execution log entry
 */
export interface ExecutionLog {
    id: string;
    timestamp: number;
    level: "info" | "debug" | "warn" | "error";
    message: string;
    nodeId?: string;
    nodeName?: string;
    metadata?: Record<string, any>;
}

/**
 * Timeline event for execution visualization
 */
export interface TimelineEvent {
    id: string;
    nodeId: string;
    nodeName: string;
    timestamp: number;
    status: NodeExecutionStatus;
    duration?: number;
    output?: any;
    error?: string;
}

/**
 * Network request made during execution
 */
export interface NetworkRequest {
    id: string;
    timestamp: number;
    method: string;
    url: string;
    status?: number;
    duration?: number;
    requestHeaders?: Record<string, string>;
    requestBody?: any;
    responseHeaders?: Record<string, string>;
    responseBody?: any;
}

/**
 * Test scenario definition
 */
export interface TestScenario {
    id: string;
    name: string;
    description?: string;
    triggerType: TriggerType;
    configuration: TriggerConfiguration;
    createdAt: number;
    updatedAt: number;
}

/**
 * Current execution state
 */
export interface ExecutionState {
    id: string | null;
    status: ExecutionStatus;
    startTime: number | null;
    endTime: number | null;
    duration: number | null;
    logs: ExecutionLog[];
    variables: Record<string, any>;
    timeline: TimelineEvent[];
    networkRequests: NetworkRequest[];
    outputs: Record<string, any>;
    error?: string;
    nodeStatuses: Record<string, NodeExecutionStatus>;
}

/**
 * Test scenario store state
 */
interface TestScenarioState {
    // Scenarios
    scenarios: TestScenario[];
    activeScenario: TestScenario | null;

    // UI state
    isDrawerOpen: boolean;
    drawerWidth: number;
    activeTab: "setup" | "execution" | "results";

    // Execution state
    execution: ExecutionState;

    // Actions - Scenario management
    createScenario: (name: string, triggerType: TriggerType, description?: string) => void;
    updateScenario: (id: string, updates: Partial<TestScenario>) => void;
    deleteScenario: (id: string) => void;
    setActiveScenario: (scenario: TestScenario | null) => void;
    duplicateScenario: (id: string) => void;

    // Actions - UI
    setDrawerOpen: (isOpen: boolean) => void;
    setDrawerWidth: (width: number) => void;
    setActiveTab: (tab: "setup" | "execution" | "results") => void;

    // Actions - Execution
    startExecution: (executionId: string) => void;
    completeExecution: (outputs: Record<string, any>) => void;
    errorExecution: (error: string) => void;
    resetExecution: () => void;
    addLog: (log: Omit<ExecutionLog, "id" | "timestamp">) => void;
    updateVariables: (variables: Record<string, any>) => void;
    addTimelineEvent: (event: Omit<TimelineEvent, "id" | "timestamp">) => void;
    updateNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
    addNetworkRequest: (request: Omit<NetworkRequest, "id" | "timestamp">) => void;
    clearLogs: () => void;
}

/**
 * Default execution state
 */
const defaultExecutionState: ExecutionState = {
    id: null,
    status: "idle",
    startTime: null,
    endTime: null,
    duration: null,
    logs: [],
    variables: {},
    timeline: [],
    networkRequests: [],
    outputs: {},
    nodeStatuses: {},
};

/**
 * Generate unique ID
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create the test scenario store
 */
export const useTestScenarioStore = create<TestScenarioState>((set, get) => ({
    // Initial state
    scenarios: [],
    activeScenario: null,
    isDrawerOpen: false,
    drawerWidth: 500,
    activeTab: "setup",
    execution: defaultExecutionState,

    // Scenario management
    createScenario: (name, triggerType, description) => {
        const scenario: TestScenario = {
            id: generateId(),
            name,
            description,
            triggerType,
            configuration: getDefaultTriggerConfig(triggerType),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => ({
            scenarios: [...state.scenarios, scenario],
            activeScenario: scenario,
            activeTab: "setup",
            isDrawerOpen: true,
        }));
    },

    updateScenario: (id, updates) => {
        set((state) => ({
            scenarios: state.scenarios.map((s) =>
                s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
            ),
            activeScenario:
                state.activeScenario?.id === id
                    ? { ...state.activeScenario, ...updates, updatedAt: Date.now() }
                    : state.activeScenario,
        }));
    },

    deleteScenario: (id) => {
        set((state) => ({
            scenarios: state.scenarios.filter((s) => s.id !== id),
            activeScenario: state.activeScenario?.id === id ? null : state.activeScenario,
        }));
    },

    setActiveScenario: (scenario) => {
        set({
            activeScenario: scenario,
            activeTab: "setup",
        });
    },

    duplicateScenario: (id) => {
        const scenario = get().scenarios.find((s) => s.id === id);
        if (!scenario) return;

        const duplicated: TestScenario = {
            ...scenario,
            id: generateId(),
            name: `${scenario.name} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        set((state) => ({
            scenarios: [...state.scenarios, duplicated],
            activeScenario: duplicated,
        }));
    },

    // UI actions
    setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

    setDrawerWidth: (width) => set({ drawerWidth: width }),

    setActiveTab: (tab) => set({ activeTab: tab }),

    // Execution actions
    startExecution: (executionId) => {
        set({
            execution: {
                ...defaultExecutionState,
                id: executionId,
                status: "running",
                startTime: Date.now(),
            },
            activeTab: "execution",
        });
    },

    completeExecution: (outputs) => {
        const state = get();
        const startTime = state.execution.startTime || Date.now();
        const endTime = Date.now();

        set({
            execution: {
                ...state.execution,
                status: "completed",
                endTime,
                duration: endTime - startTime,
                outputs,
            },
            activeTab: "results",
        });
    },

    errorExecution: (error) => {
        const state = get();
        const startTime = state.execution.startTime || Date.now();
        const endTime = Date.now();

        set({
            execution: {
                ...state.execution,
                status: "error",
                endTime,
                duration: endTime - startTime,
                error,
            },
            activeTab: "results",
        });
    },

    resetExecution: () => {
        set({
            execution: defaultExecutionState,
            activeTab: "setup",
        });
    },

    addLog: (logData) => {
        const log: ExecutionLog = {
            ...logData,
            id: generateId(),
            timestamp: Date.now(),
        };

        set((state) => ({
            execution: {
                ...state.execution,
                logs: [...state.execution.logs, log],
            },
        }));
    },

    updateVariables: (variables) => {
        set((state) => ({
            execution: {
                ...state.execution,
                variables: {
                    ...state.execution.variables,
                    ...variables,
                },
            },
        }));
    },

    addTimelineEvent: (eventData) => {
        const event: TimelineEvent = {
            ...eventData,
            id: generateId(),
            timestamp: Date.now(),
        };

        set((state) => ({
            execution: {
                ...state.execution,
                timeline: [...state.execution.timeline, event],
            },
        }));
    },

    updateNodeStatus: (nodeId, status) => {
        set((state) => ({
            execution: {
                ...state.execution,
                nodeStatuses: {
                    ...state.execution.nodeStatuses,
                    [nodeId]: status,
                },
            },
        }));
    },

    addNetworkRequest: (requestData) => {
        const request: NetworkRequest = {
            ...requestData,
            id: generateId(),
            timestamp: Date.now(),
        };

        set((state) => ({
            execution: {
                ...state.execution,
                networkRequests: [...state.execution.networkRequests, request],
            },
        }));
    },

    clearLogs: () => {
        set((state) => ({
            execution: {
                ...state.execution,
                logs: [],
            },
        }));
    },
}));
