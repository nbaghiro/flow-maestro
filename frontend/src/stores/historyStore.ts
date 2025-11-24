import { Node, Edge } from "reactflow";
import { create } from "zustand";
import { useWorkflowStore } from "./workflowStore";

const MAX_HISTORY_SIZE = 50;
const DEBOUNCE_MS = 120;

export interface HistorySnapshot {
    nodes: Node[];
    edges: Edge[];
    selectedNode: string | null;
}

interface HistoryStore {
    past: HistorySnapshot[];
    future: HistorySnapshot[];

    push: (snapshot: HistorySnapshot) => void;
    undo: () => void;
    redo: () => void;
    clear: () => void;

    canUndo: () => boolean;
    canRedo: () => boolean;
}

// Internal state shared between undo/redo and the subscriber.
// Not part of Zustand to avoid triggering re-renders.
export const historyInternal = {
    isApplyingHistory: false,
    lastSnapshot: null as HistorySnapshot | null
};

// Helper: Capture current workflow state as a snapshot
function createSnapshot(): HistorySnapshot {
    const state = useWorkflowStore.getState();
    return {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selectedNode: state.selectedNode
    };
}

// Helper: Apply a snapshot to the workflow store
function applySnapshot(snapshot: HistorySnapshot): void {
    useWorkflowStore.setState({
        nodes: structuredClone(snapshot.nodes),
        edges: structuredClone(snapshot.edges),
        selectedNode: snapshot.selectedNode
    });
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
    past: [],
    future: [],

    push: (snapshot) => {
        const { past } = get();

        set({
            past: [...past, snapshot],
            future: [] // New action clears redo stack
        });
    },

    undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const currentSnapshot = createSnapshot();

        historyInternal.isApplyingHistory = true;
        historyInternal.lastSnapshot = null;

        applySnapshot(previous);

        set({
            past: newPast,
            future: [currentSnapshot, ...future]
        });

        historyInternal.isApplyingHistory = false;
    },

    redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);
        const currentSnapshot = createSnapshot();

        historyInternal.isApplyingHistory = true;
        historyInternal.lastSnapshot = null;

        applySnapshot(next);

        set({
            past: [...past, currentSnapshot],
            future: newFuture
        });

        historyInternal.isApplyingHistory = false;
    },

    clear: () => {
        set({ past: [], future: [] });
        historyInternal.lastSnapshot = null;
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0
}));

/**
 * Initialize history tracking for the workflow builder.
 * Subscribes to workflow changes and records snapshots with debouncing.
 *
 * @returns Unsubscribe function to clean up the subscription
 */
export function initializeHistoryTracking(): () => void {
    historyInternal.lastSnapshot = null;
    let debounceTimer: NodeJS.Timeout | null = null;

    const unsubscribe = useWorkflowStore.subscribe((state) => {
        // Ignore state changes caused by undo/redo
        if (historyInternal.isApplyingHistory) return;

        const snapshot: HistorySnapshot = {
            nodes: structuredClone(state.nodes),
            edges: structuredClone(state.edges),
            selectedNode: state.selectedNode
        };

        // Initialize tracking on first change
        if (historyInternal.lastSnapshot === null) {
            historyInternal.lastSnapshot = snapshot;
            return;
        }

        // Detect structural changes (ignore selection-only changes)
        const changed =
            JSON.stringify(snapshot.nodes) !== JSON.stringify(historyInternal.lastSnapshot.nodes) ||
            JSON.stringify(snapshot.edges) !== JSON.stringify(historyInternal.lastSnapshot.edges);

        if (!changed) return;

        if (debounceTimer) clearTimeout(debounceTimer);

        // Debounce to record only final state after rapid changes (e.g., dragging)
        debounceTimer = setTimeout(() => {
            // Abort if history was cleared (lastSnapshot reset to null)
            if (!historyInternal.lastSnapshot) return;

            useHistoryStore.getState().push({
                nodes: structuredClone(historyInternal.lastSnapshot.nodes),
                edges: structuredClone(historyInternal.lastSnapshot.edges),
                selectedNode: historyInternal.lastSnapshot.selectedNode
            });

            historyInternal.lastSnapshot = snapshot;

            // Enforce history size limit
            const { past } = useHistoryStore.getState();
            if (past.length > MAX_HISTORY_SIZE) {
                useHistoryStore.setState({ past: past.slice(-MAX_HISTORY_SIZE) });
            }
        }, DEBOUNCE_MS);
    });

    return unsubscribe;
}
