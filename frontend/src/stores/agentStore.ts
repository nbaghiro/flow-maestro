import { create } from "zustand";
import * as api from "../lib/api";
import type {
    Agent,
    CreateAgentRequest,
    UpdateAgentRequest,
    AgentExecution,
    ConversationMessage,
    AddToolRequest,
    Thread
} from "../lib/api";

const LAST_THREAD_KEY_PREFIX = "agent_last_thread_";

function getLastThreadIdForAgent(agentId: string): string | null {
    try {
        return localStorage.getItem(`${LAST_THREAD_KEY_PREFIX}${agentId}`);
    } catch {
        return null;
    }
}

function setLastThreadIdForAgent(agentId: string, threadId: string | null): void {
    try {
        const key = `${LAST_THREAD_KEY_PREFIX}${agentId}`;
        if (threadId) {
            localStorage.setItem(key, threadId);
        } else {
            localStorage.removeItem(key);
        }
    } catch {
        // Ignore storage errors
    }
}

interface AgentStore {
    // State
    agents: Agent[];
    currentAgent: Agent | null;
    currentExecution: AgentExecution | null;
    currentThread: Thread | null; // Currently active thread
    threads: Thread[]; // List of threads for current agent
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

    // Thread actions
    fetchThreads: (agentId?: string) => Promise<void>;
    setCurrentThread: (thread: Thread | null) => void;
    createNewThread: () => void;
    updateThreadTitle: (threadId: string, title: string) => Promise<void>;
    archiveThread: (threadId: string) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;

    // Execution actions (now thread-aware)
    executeAgent: (
        agentId: string,
        message: string,
        threadId?: string
    ) => Promise<{ executionId: string; threadId: string }>;
    sendMessage: (message: string) => Promise<void>;
    fetchExecution: (agentId: string, executionId: string) => Promise<void>;
    clearExecution: () => void;
    updateExecutionStatus: (executionId: string, status: AgentExecution["status"]) => void;
    addMessageToExecution: (executionId: string, message: ConversationMessage) => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
    // Initial state
    agents: [],
    currentAgent: null,
    currentExecution: null,
    currentThread: null,
    threads: [],
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

    // Thread actions
    fetchThreads: async (agentId?: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.getThreads({
                agent_id: agentId,
                status: "active"
            });
            set({ threads: response.data.threads, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch threads",
                isLoading: false
            });
        }
    },

    setCurrentThread: (thread: Thread | null) => {
        set({ currentThread: thread });
    },

    createNewThread: () => {
        // Clear remembered last thread for this agent and reset state
        const { currentAgent } = get();
        if (currentAgent) {
            setLastThreadIdForAgent(currentAgent.id, null);
        }

        set({
            currentThread: null,
            currentExecution: null
        });
    },

    updateThreadTitle: async (threadId: string, title: string) => {
        try {
            const response = await api.updateThread(threadId, { title });
            const updatedThread = response.data;

            // Update threads list and currentThread if it matches
            set((state) => ({
                threads: state.threads.map((t) => (t.id === threadId ? updatedThread : t)),
                currentThread:
                    state.currentThread?.id === threadId ? updatedThread : state.currentThread
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update thread title"
            });
            throw error;
        }
    },

    archiveThread: async (threadId: string) => {
        try {
            await api.archiveThread(threadId);

            // Remove from threads list and clear if current
            set((state) => ({
                threads: state.threads.filter((t) => t.id !== threadId),
                currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
                currentExecution:
                    state.currentExecution?.thread_id === threadId ? null : state.currentExecution
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to archive thread"
            });
            throw error;
        }
    },

    deleteThread: async (threadId: string) => {
        try {
            await api.deleteThread(threadId);

            // Remove from threads list and clear if current
            set((state) => ({
                threads: state.threads.filter((t) => t.id !== threadId),
                currentThread: state.currentThread?.id === threadId ? null : state.currentThread,
                currentExecution:
                    state.currentExecution?.thread_id === threadId ? null : state.currentExecution
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete thread"
            });
            throw error;
        }
    },

    // Execute an agent with initial message (thread-aware, remembers last thread per agent)
    executeAgent: async (agentId: string, message: string, threadId?: string) => {
        set({ isLoading: true, error: null });
        try {
            // If no explicit threadId provided, reuse the last thread for this agent (if any)
            const persistedThreadId = threadId ?? getLastThreadIdForAgent(agentId) ?? undefined;

            const response = await api.executeAgent(agentId, message, persistedThreadId);
            const { executionId, threadId: returnedThreadId } = response.data;

            if (returnedThreadId) {
                // Remember this thread as the last-used thread for this agent
                setLastThreadIdForAgent(agentId, returnedThreadId);

                // If we don't already know about this thread, fetch and add it
                const existingThreads = get().threads;
                const exists = existingThreads.some((t) => t.id === returnedThreadId);

                if (!exists) {
                    const threadResponse = await api.getThread(returnedThreadId);
                    const newThread = threadResponse.data as Thread;

                    set((state) => ({
                        currentThread: newThread,
                        threads: [newThread, ...state.threads]
                    }));
                } else {
                    // Ensure currentThread points at this thread
                    set((state) => ({
                        currentThread:
                            state.currentThread?.id === returnedThreadId
                                ? state.currentThread
                                : state.threads.find((t) => t.id === returnedThreadId) ||
                                  state.currentThread
                    }));
                }
            }

            // Create initial execution state with just the new user message
            // The component will preserve previous messages when thread_id is the same
            const newUserMessage: ConversationMessage = {
                id: `user-${Date.now()}`,
                role: "user",
                content: message,
                timestamp: new Date().toISOString()
            };

            const conversationHistory: ConversationMessage[] = [newUserMessage];

            // Create initial execution state with just the new user message
            // The component will preserve previous messages when thread_id is the same
            set({
                currentExecution: {
                    id: executionId,
                    agent_id: agentId,
                    user_id: "",
                    thread_id: returnedThreadId,
                    status: "running",
                    conversation_history: conversationHistory,
                    iterations: 0,
                    error: null,
                    started_at: new Date().toISOString(),
                    completed_at: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                isLoading: false
            });

            return { executionId, threadId: returnedThreadId };
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
    },

    // Update execution status (e.g., from WebSocket events)
    updateExecutionStatus: (executionId: string, status: AgentExecution["status"]) => {
        set((state) => {
            if (!state.currentExecution || state.currentExecution.id !== executionId) {
                return state;
            }
            return {
                currentExecution: {
                    ...state.currentExecution,
                    status
                }
            };
        });
    },

    // Add message to conversation history (from WebSocket events)
    addMessageToExecution: (executionId: string, message: ConversationMessage) => {
        set((state) => {
            if (!state.currentExecution || state.currentExecution.id !== executionId) {
                return state;
            }
            const updated = {
                currentExecution: {
                    ...state.currentExecution,
                    conversation_history: [...state.currentExecution.conversation_history, message]
                }
            };
            return updated;
        });
    }
}));
