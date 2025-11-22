import { Node, Edge } from "reactflow";
import { create } from "zustand";
import { useWorkflowStore } from "./workflowStore";

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

export const useHistoryStore = create<HistoryStore>((set, get) => ({
    past: [],
    future: [],

    // Push a new snapshot into history.
    // This is only called by the debounced subscriber when a meaningful change is detected.
    // Any new push clears the redo stack (standard undo/redo behavior).
    push: (snapshot) => {
        const { past } = get();

        set({
            past: [...past, snapshot],
            future: []
        });
    },

    // Undo the last user action.
    // We apply the previous snapshot to the workflow store and push the current state into the redo stack.
    // isApplyingHistory prevents the subscriber from treating this state change as a new history entry.
    undo: () => {
        const { past, future } = get();

        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        const currentSnapshot: HistorySnapshot = {
            nodes: structuredClone(useWorkflowStore.getState().nodes),
            edges: structuredClone(useWorkflowStore.getState().edges),
            selectedNode: useWorkflowStore.getState().selectedNode
        };

        isApplyingHistory = true;
        lastSnapshot = null; // Reset snapshot tracking so next real user action starts a fresh history entry

        useWorkflowStore.setState({
            nodes: structuredClone(previous.nodes),
            edges: structuredClone(previous.edges),
            selectedNode: previous.selectedNode
        });

        set({
            past: newPast,
            future: [currentSnapshot, ...future]
        });

        isApplyingHistory = false;
    },

    // Redo the next action in the redo stack.
    // Similar to undo: we apply the next snapshot and move the current state back into history.
    // Again, guard against history recording while applying snapshots.
    redo: () => {
        const { past, future } = get();

        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        const currentSnapshot: HistorySnapshot = {
            nodes: structuredClone(useWorkflowStore.getState().nodes),
            edges: structuredClone(useWorkflowStore.getState().edges),
            selectedNode: useWorkflowStore.getState().selectedNode
        };

        isApplyingHistory = true;
        lastSnapshot = null; // Reset snapshot tracking so next real user action starts a fresh history entry

        useWorkflowStore.setState({
            nodes: structuredClone(next.nodes),
            edges: structuredClone(next.edges),
            selectedNode: next.selectedNode
        });

        set({
            past: [...past, currentSnapshot],
            future: newFuture
        });

        isApplyingHistory = false;
    },

    clear: () => {
        set({
            past: [],
            future: []
        });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0
}));

// Tracks the last recorded workflow snapshot.
// Used to detect whether the current state has changed enough to push a new history entry.
let lastSnapshot: HistorySnapshot | null = null;

// Ensures we don't push multiple history entries during rapid state changes (dragging nodes, etc).
let debounceTimer: NodeJS.Timeout | null = null;
const debounce_ms = 120;

// When true, the subscriber MUST NOT record history.
// This prevents undo/redo from generating new snapshots and destroying the redo stack.
let isApplyingHistory = false;

// The workflow store changes constantly (dragging nodes, selecting, editing config).
// Instead of recording every tiny update, we:
//   1. Compare against the last snapshot to detect meaningful changes.
//   2. Debounce to avoid recording mid-drag states.
//   3. Push the PREVIOUS snapshot into `past` (true undo behavior).
//
// IMPORTANT: If undo/redo is applying state (`isApplyingHistory === true`)
// this subscriber must NOT push history, or redo will break.
useWorkflowStore.subscribe((state) => {
    if (isApplyingHistory) return; // Ignore state changes caused by undo/redo

    const snapshot: HistorySnapshot = {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selectedNode: state.selectedNode
    };

    if (lastSnapshot === null) {
        lastSnapshot = snapshot;
        return;
    }

    // Compare deeply to detect if nodes, edges, or selection actually changed.
    // JSON.stringify is acceptable here since objects are small and well-structured.
    const changed =
        JSON.stringify(snapshot.nodes) !== JSON.stringify(lastSnapshot.nodes) ||
        JSON.stringify(snapshot.edges) !== JSON.stringify(lastSnapshot.edges) ||
        snapshot.selectedNode !== lastSnapshot.selectedNode;

    if (!changed) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    // Debounce ensures that during rapid changes (like dragging nodes)
    // only the final position is stored as a history entry.
    debounceTimer = setTimeout(() => {
        useHistoryStore.getState().push({
            nodes: structuredClone(lastSnapshot!.nodes),
            edges: structuredClone(lastSnapshot!.edges),
            selectedNode: lastSnapshot!.selectedNode
        });

        lastSnapshot = snapshot;

        const { past } = useHistoryStore.getState();

        // Prevent the history stack from growing unbounded.
        // Keep only the last 50 actions (more than enough for workflow editing).
        if (past.length > 50) {
            useHistoryStore.setState({ past: past.slice(past.length - 50) });
        }
    }, debounce_ms);
});
