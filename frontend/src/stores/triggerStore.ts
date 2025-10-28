/**
 * Trigger Store
 * Manages trigger drawer state and trigger data
 */

import { create } from "zustand";
import type { WorkflowTrigger } from "../types/trigger";

const MIN_WIDTH = 400;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 500;

interface TriggerStore {
    // Drawer state
    isDrawerOpen: boolean;
    drawerWidth: number;

    // Triggers
    triggers: WorkflowTrigger[];
    loadingTriggers: boolean;
    selectedTriggerId: string | null;

    // Actions
    setDrawerOpen: (open: boolean) => void;
    setDrawerWidth: (width: number) => void;
    setTriggers: (triggers: WorkflowTrigger[]) => void;
    setLoadingTriggers: (loading: boolean) => void;
    setSelectedTriggerId: (id: string | null) => void;
    addTrigger: (trigger: WorkflowTrigger) => void;
    updateTrigger: (id: string, updates: Partial<WorkflowTrigger>) => void;
    removeTrigger: (id: string) => void;
}

export const useTriggerStore = create<TriggerStore>((set) => ({
    // Initial state
    isDrawerOpen: false,
    drawerWidth: DEFAULT_WIDTH,
    triggers: [],
    loadingTriggers: false,
    selectedTriggerId: null,

    // Actions
    setDrawerOpen: (open) => set({ isDrawerOpen: open }),

    setDrawerWidth: (width) => {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        set({ drawerWidth: clampedWidth });
    },

    setTriggers: (triggers) => set({ triggers }),

    setLoadingTriggers: (loading) => set({ loadingTriggers: loading }),

    setSelectedTriggerId: (id) => set({ selectedTriggerId: id }),

    addTrigger: (trigger) =>
        set((state) => ({
            triggers: [...state.triggers, trigger],
        })),

    updateTrigger: (id, updates) =>
        set((state) => ({
            triggers: state.triggers.map((t) =>
                t.id === id ? { ...t, ...updates } : t
            ),
        })),

    removeTrigger: (id) =>
        set((state) => ({
            triggers: state.triggers.filter((t) => t.id !== id),
            selectedTriggerId: state.selectedTriggerId === id ? null : state.selectedTriggerId,
        })),
}));
