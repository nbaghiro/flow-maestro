import { useCallback, useRef } from "react";
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
    addEdge,
    Connection,
    BackgroundVariant,
    ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "../stores/workflowStore";
import { generateId } from "../lib/utils";

// Import all node components
import LLMNode from "./nodes/LLMNode";
import VisionNode from "./nodes/VisionNode";
import AudioNode from "./nodes/AudioNode";
import EmbeddingsNode from "./nodes/EmbeddingsNode";
import ConditionalNode from "./nodes/ConditionalNode";
import SwitchNode from "./nodes/SwitchNode";
import LoopNode from "./nodes/LoopNode";
import CodeNode from "./nodes/CodeNode";
import WaitNode from "./nodes/WaitNode";
import InputNode from "./nodes/InputNode";
import TransformNode from "./nodes/TransformNode";
import VariableNode from "./nodes/VariableNode";
import OutputNode from "./nodes/OutputNode";
import HTTPNode from "./nodes/HTTPNode";
import DatabaseNode from "./nodes/DatabaseNode";
import IntegrationNode from "./nodes/IntegrationNode";
import KnowledgeBaseQueryNode from "./nodes/KnowledgeBaseQueryNode";

// Register node types
const nodeTypes = {
    llm: LLMNode,
    vision: VisionNode,
    audio: AudioNode,
    embeddings: EmbeddingsNode,
    conditional: ConditionalNode,
    switch: SwitchNode,
    loop: LoopNode,
    code: CodeNode,
    wait: WaitNode,
    input: InputNode,
    transform: TransformNode,
    variable: VariableNode,
    output: OutputNode,
    http: HTTPNode,
    database: DatabaseNode,
    integration: IntegrationNode,
    knowledgeBaseQuery: KnowledgeBaseQueryNode,
};

export function WorkflowCanvas() {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        addNode,
        selectNode,
    } = useWorkflowStore();

    const onConnect = useCallback(
        (connection: Connection) => {
            useWorkflowStore.setState({
                edges: addEdge(connection, edges),
            });
        },
        [edges]
    );

    const onNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
        selectNode(node.id);
    }, [selectNode]);

    const onPaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    const onInit = useCallback((instance: ReactFlowInstance) => {
        reactFlowInstance.current = instance;
    }, []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData("application/reactflow");
            if (!type || !reactFlowInstance.current || !reactFlowWrapper.current) {
                return;
            }

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.current.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNode = {
                id: generateId(),
                type,
                position,
                data: {
                    label: getDefaultLabel(type),
                    status: "idle" as const,
                    config: {},
                },
            };

            addNode(newNode);
        },
        [addNode]
    );

    return (
        <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onInit={onInit}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls />
                <MiniMap
                    className="!absolute !bottom-4 !right-4"
                    style={{
                        backgroundColor: "rgba(0, 0, 0, 0.05)",
                        border: "1px solid rgba(0, 0, 0, 0.1)",
                    }}
                    nodeColor="#6366f1"
                    maskColor="rgba(0, 0, 0, 0.1)"
                />
            </ReactFlow>
        </div>
    );
}

function getDefaultLabel(type: string): string {
    const labels: Record<string, string> = {
        llm: "LLM",
        vision: "Vision",
        audio: "Audio",
        embeddings: "Embeddings",
        conditional: "Conditional",
        switch: "Switch",
        loop: "Loop",
        code: "Code",
        wait: "Wait/Delay",
        input: "Input",
        transform: "Transform",
        variable: "Variable",
        output: "Output",
        http: "HTTP",
        database: "Database",
        integration: "Integration",
    };
    return labels[type] || "Node";
}
