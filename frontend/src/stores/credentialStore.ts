import { create } from 'zustand';
import type { Credential } from '../lib/api';
import {
    getCredentials,
    createCredential,
    testCredential,
    updateCredential,
    deleteCredential,
    CreateCredentialInput
} from '../lib/api';

interface CredentialStore {
    credentials: Credential[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchCredentials: (params?: { provider?: string }) => Promise<void>;
    addCredential: (input: CreateCredentialInput) => Promise<Credential>;
    testCredentialById: (id: string) => Promise<boolean>;
    updateCredentialById: (id: string, input: Partial<CreateCredentialInput>) => Promise<void>;
    deleteCredentialById: (id: string) => Promise<void>;
    getByProvider: (provider: string) => Credential[];
    clearError: () => void;
}

export const useCredentialStore = create<CredentialStore>((set, get) => ({
    credentials: [],
    loading: false,
    error: null,

    fetchCredentials: async (params) => {
        set({ loading: true, error: null });
        try {
            const response = await getCredentials(params);
            if (response.success && response.data) {
                set({ credentials: response.data.items, loading: false });
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch credentials',
                loading: false
            });
        }
    },

    addCredential: async (input) => {
        set({ loading: true, error: null });
        try {
            const response = await createCredential(input);
            if (response.success && response.data) {
                set(state => ({
                    credentials: [...state.credentials, response.data],
                    loading: false
                }));
                return response.data;
            }
            throw new Error('Failed to create credential');
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create credential',
                loading: false
            });
            throw error;
        }
    },

    testCredentialById: async (id) => {
        try {
            const response = await testCredential(id);

            // Update credential status based on test result
            if (response.success) {
                const newStatus = response.data.valid ? 'active' : 'invalid';
                set(state => ({
                    credentials: state.credentials.map(cred =>
                        cred.id === id
                            ? { ...cred, status: newStatus, last_tested_at: new Date().toISOString() }
                            : cred
                    )
                }));
                return response.data.valid;
            }
            return false;
        } catch (error) {
            console.error('Failed to test credential:', error);
            return false;
        }
    },

    updateCredentialById: async (id, input) => {
        set({ loading: true, error: null });
        try {
            const response = await updateCredential(id, input);
            if (response.success && response.data) {
                set(state => ({
                    credentials: state.credentials.map(cred =>
                        cred.id === id ? response.data : cred
                    ),
                    loading: false
                }));
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update credential',
                loading: false
            });
            throw error;
        }
    },

    deleteCredentialById: async (id) => {
        set({ loading: true, error: null });
        try {
            await deleteCredential(id);
            set(state => ({
                credentials: state.credentials.filter(cred => cred.id !== id),
                loading: false
            }));
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete credential',
                loading: false
            });
            throw error;
        }
    },

    getByProvider: (provider) => {
        return get().credentials.filter(cred => cred.provider === provider);
    },

    clearError: () => set({ error: null }),
}));
