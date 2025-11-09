import { create } from "zustand";
import {
    getConnections,
    createConnection,
    testConnection,
    updateConnection,
    deleteConnection,
    testConnectionBeforeSave,
    discoverMCPTools,
    refreshMCPTools,
    CreateConnectionInput,
    MCPDiscoveryRequest
} from "../lib/api";
import type { Connection, ConnectionMethod, ConnectionStatus } from "../lib/api";

interface ConnectionStore {
    connections: Connection[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchConnections: (params?: {
        provider?: string;
        connection_method?: ConnectionMethod;
        status?: ConnectionStatus;
    }) => Promise<void>;
    addConnection: (input: CreateConnectionInput) => Promise<Connection>;
    testConnectionById: (id: string) => Promise<boolean>;
    testConnectionBeforeSaving: (input: CreateConnectionInput) => Promise<boolean>;
    updateConnectionById: (id: string, input: Partial<CreateConnectionInput>) => Promise<void>;
    deleteConnectionById: (id: string) => Promise<void>;
    getByProvider: (provider: string) => Connection[];
    getByMethod: (method: ConnectionMethod) => Connection[];
    clearError: () => void;

    // MCP-specific actions
    discoverMCPTools: (
        request: MCPDiscoveryRequest
    ) => Promise<{ tools: unknown[]; server_info: unknown }>;
    refreshMCPToolsById: (id: string) => Promise<void>;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
    connections: [],
    loading: false,
    error: null,

    fetchConnections: async (params) => {
        set({ loading: true, error: null });
        try {
            const response = await getConnections(params);
            if (response.success && response.data) {
                set({ connections: response.data, loading: false });
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to fetch connections",
                loading: false
            });
        }
    },

    addConnection: async (input) => {
        set({ loading: true, error: null });
        try {
            const response = await createConnection(input);
            if (response.success && response.data) {
                set((state) => ({
                    connections: [...state.connections, response.data],
                    loading: false
                }));
                return response.data;
            }
            throw new Error("Failed to create connection");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to create connection",
                loading: false
            });
            throw error;
        }
    },

    testConnectionById: async (id) => {
        try {
            const response = await testConnection(id);

            // Update connection status based on test result
            if (response.success && response.data.test_result) {
                const testResult = response.data.test_result;
                // Type narrow: test result should be an object with success property
                const newStatus =
                    typeof testResult === "object" &&
                    testResult !== null &&
                    "success" in testResult &&
                    testResult.success
                        ? "active"
                        : "invalid";
                set((state) => ({
                    connections: state.connections.map((conn) =>
                        conn.id === id
                            ? {
                                  ...conn,
                                  status: newStatus,
                                  last_tested_at: new Date().toISOString()
                              }
                            : conn
                    )
                }));
                return (
                    typeof testResult === "object" &&
                    testResult !== null &&
                    "success" in testResult &&
                    typeof testResult.success === "boolean" &&
                    testResult.success
                );
            }
            return false;
        } catch (error) {
            console.error("Failed to test connection:", error);
            return false;
        }
    },

    testConnectionBeforeSaving: async (input) => {
        try {
            const response = await testConnectionBeforeSave(input);
            return response.success && response.data.connection_valid;
        } catch (error) {
            console.error("Failed to test connection before saving:", error);
            return false;
        }
    },

    updateConnectionById: async (id, input) => {
        set({ loading: true, error: null });
        try {
            const response = await updateConnection(id, input);
            if (response.success && response.data) {
                set((state) => ({
                    connections: state.connections.map((conn) =>
                        conn.id === id ? response.data : conn
                    ),
                    loading: false
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to update connection",
                loading: false
            });
            throw error;
        }
    },

    deleteConnectionById: async (id) => {
        set({ loading: true, error: null });
        try {
            await deleteConnection(id);
            set((state) => ({
                connections: state.connections.filter((conn) => conn.id !== id),
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to delete connection",
                loading: false
            });
            throw error;
        }
    },

    getByProvider: (provider) => {
        return get().connections.filter((conn) => conn.provider === provider);
    },

    getByMethod: (method) => {
        return get().connections.filter((conn) => conn.connection_method === method);
    },

    discoverMCPTools: async (request) => {
        try {
            const response = await discoverMCPTools(request);
            if (response.success && response.data) {
                return {
                    tools: response.data.tools,
                    server_info: response.data.server_info
                };
            }
            throw new Error("Failed to discover MCP tools");
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to discover MCP tools"
            });
            throw error;
        }
    },

    refreshMCPToolsById: async (id) => {
        set({ loading: true, error: null });
        try {
            const response = await refreshMCPTools(id);
            if (response.success && response.data) {
                // Update the connection with refreshed tools
                set((state) => ({
                    connections: state.connections.map((conn) =>
                        conn.id === id ? { ...conn, mcp_tools: response.data.tools } : conn
                    ),
                    loading: false
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : "Failed to refresh MCP tools",
                loading: false
            });
            throw error;
        }
    },

    clearError: () => set({ error: null })
}));
