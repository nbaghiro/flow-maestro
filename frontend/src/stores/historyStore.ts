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

    canUndo: boolean;
    canRedo: boolean;
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
    past: [],
    future: [],

    push: (snapshot) => {
        const { past } = get();

        set({
            past: [...past, snapshot],
            future: []
        });
    },

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

        useWorkflowStore.setState({
            nodes: structuredClone(previous.nodes),
            edges: structuredClone(previous.edges),
            selectedNode: previous.selectedNode
        });

        set({
            past: newPast,
            future: [currentSnapshot, ...future]
        });
    },

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

        useWorkflowStore.setState({
            nodes: structuredClone(next.nodes),
            edges: structuredClone(next.edges),
            selectedNode: next.selectedNode
        });

        set({
            past: [...past, currentSnapshot],
            future: newFuture
        });
    },

    clear: () => {
        set({
            past: [],
            future: []
        });
    },

    get canUndo() {
        return get().past.length > 0;
    },

    get canRedo() {
        return get().future.length > 0;
    }
}));

let lastSnapshot: HistorySnapshot | null = null;

useWorkflowStore.subscribe((state) => {
    const snapshot: HistorySnapshot = {
        nodes: structuredClone(state.nodes),
        edges: structuredClone(state.edges),
        selectedNode: state.selectedNode
    };

    if (lastSnapshot === null) {
        lastSnapshot = snapshot;
        return;
    }

    const changed =
        JSON.stringify(snapshot.nodes) !== JSON.stringify(lastSnapshot.nodes) ||
        JSON.stringify(snapshot.edges) !== JSON.stringify(lastSnapshot.edges) ||
        snapshot.selectedNode !== lastSnapshot.selectedNode;

    if (changed) {
        useHistoryStore.getState().push(lastSnapshot);
        lastSnapshot = snapshot;

        const { past } = useHistoryStore.getState();
        if (past.length > 50) {
            useHistoryStore.setState({ past: past.slice(past.length - 50) });
        }
    }
});
