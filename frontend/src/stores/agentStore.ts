import { create } from "zustand";
import * as api from "../lib/api";
import type {
    Agent,
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentExecution,
    ConversationMessage,
    AddToolRequest
} from "../lib/api";

interface AgentStore {
    // State
    agents: Agent[];
    currentAgent: Agent | null;
    currentExecution: AgentExecution | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchAgents: () => Promise<void>;
    fetchAgent: (agentId: string) => Promise<void>;
    createAgent: (data: CreateAgentRequest) => Promise<Agent>;
    updateAgent: (agentId: string, data: UpdateAgentRequest) => Promise<void>;
    deleteAgent: (agentId: string) => Promise<void>;
    setCurrentAgent: (agent: Agent | null) => void;
    clearError: () => void;

    // Tool management actions
    addTool: (agentId: string, data: AddToolRequest) => Promise<void>;
    removeTool: (agentId: string, toolId: string) => Promise<void>;

    // Execution actions
    executeAgent: (agentId: string, message: string) => Promise<string>;
    sendMessage: (message: string) => Promise<void>;
    fetchExecution: (agentId: string, executionId: string) => Promise<void>;
    clearExecution: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
    // Initial state
    agents: [],
    currentAgent: null,
    currentExecution: null,
    isLoading: false,
    error: null,

    // Fetch all agents
    fetchAgents: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAgents();

            // Backend returns { agents: Agent[], total: number }
            set({ agents: response.data.agents, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch agents",
                isLoading: false,
                agents: [] // Reset to empty array on error
            });
        }
    },

    // Fetch a specific agent
    fetchAgent: async (agentId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAgent(agentId);
            set({ currentAgent: response.data, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch agent",
                isLoading: false
            });
        }
    },

    // Create a new agent
    createAgent: async (data: CreateAgentRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.createAgent(data);
            const newAgent = response.data;
            set((state) => ({
                agents: [...state.agents, newAgent],
                currentAgent: newAgent,
                isLoading: false
            }));
            return newAgent;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Update an agent
    updateAgent: async (agentId: string, data: UpdateAgentRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.updateAgent(agentId, data);
            const updatedAgent = response.data;
            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Delete an agent
    deleteAgent: async (agentId: string) => {
        set({ isLoading: true, error: null });
        try {
            await api.deleteAgent(agentId);
            set((state) => ({
                agents: state.agents.filter((a) => a.id !== agentId),
                currentAgent: state.currentAgent?.id === agentId ? null : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Set current agent
    setCurrentAgent: (agent: Agent | null) => {
        set({ currentAgent: agent });
    },

    // Clear error
    clearError: () => {
        set({ error: null });
    },

    // Add a tool to an agent
    addTool: async (agentId: string, data: AddToolRequest) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.addAgentTool(agentId, data);
            const updatedAgent = response.data.agent;

            // Update both the agents list and currentAgent if it matches
            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to add tool",
                isLoading: false
            });
            throw error;
        }
    },

    // Remove a tool from an agent
    removeTool: async (agentId: string, toolId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.removeAgentTool(agentId, toolId);
            const updatedAgent = response.data.agent;

            // Update both the agents list and currentAgent if it matches
            set((state) => ({
                agents: state.agents.map((a) => (a.id === agentId ? updatedAgent : a)),
                currentAgent:
                    state.currentAgent?.id === agentId ? updatedAgent : state.currentAgent,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to remove tool",
                isLoading: false
            });
            throw error;
        }
    },

    // Execute an agent with initial message
    executeAgent: async (agentId: string, message: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.executeAgent(agentId, message);
            const executionId = response.data.executionId;

            // Create initial execution state
            set({
                currentExecution: {
                    id: executionId,
                    agent_id: agentId,
                    user_id: "",
                    status: "running",
                    conversation_history: [
                        {
                            id: `user-${Date.now()}`,
                            role: "user",
                            content: message,
                            timestamp: new Date().toISOString()
                        }
                    ],
                    iterations: 0,
                    error: null,
                    started_at: new Date().toISOString(),
                    completed_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                isLoading: false
            });

            return executionId;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to execute agent",
                isLoading: false
            });
            throw error;
        }
    },

    // Send a message to the running agent
    sendMessage: async (message: string) => {
        const { currentAgent, currentExecution } = get();
        if (!currentAgent || !currentExecution) {
            throw new Error("No active agent execution");
        }

        set({ isLoading: true, error: null });
        try {
            await api.sendAgentMessage(currentAgent.id, currentExecution.id, message);

            // Add user message to conversation
            set((state) => ({
                currentExecution: state.currentExecution
                    ? {
                          ...state.currentExecution,
                          conversation_history: [
                              ...state.currentExecution.conversation_history,
                              {
                                  id: `user-${Date.now()}`,
                                  role: "user",
                                  content: message,
                                  timestamp: new Date().toISOString()
                              } as ConversationMessage
                          ]
                      }
                    : null,
                isLoading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to send message",
                isLoading: false
            });
            throw error;
        }
    },

    // Fetch execution details
    fetchExecution: async (agentId: string, executionId: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getAgentExecution(agentId, executionId);
            set({ currentExecution: response.data, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch execution",
                isLoading: false
            });
        }
    },

    // Clear execution
    clearExecution: () => {
        set({ currentExecution: null });
    }
}));
