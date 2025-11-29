import { motion, useInView } from "framer-motion";
import { Play, Sparkles } from "lucide-react";
import React from "react";
import Flow, { Node, Edge, Controls, Background, BackgroundVariant } from "reactflow";
import "reactflow/dist/style.css";

const initialNodes: Node[] = [
    {
        id: "1",
        type: "input",
        data: { label: "📧 Email Trigger" },
        position: { x: 50, y: 150 },
        style: {
            background: "#374151",
            color: "white",
            border: "2px solid #4b5563",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: "500"
        }
    },
    {
        id: "2",
        data: { label: "⚙️ Extract Data" },
        position: { x: 250, y: 80 },
        style: {
            background: "#1f2937",
            color: "white",
            border: "2px solid #374151",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px"
        }
    },
    {
        id: "3",
        data: { label: "🤖 AI Agent: Analyze" },
        position: { x: 250, y: 200 },
        style: {
            background: "#374151",
            color: "white",
            border: "2px solid #4b5563",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: "500"
        }
    },
    {
        id: "4",
        data: { label: "⚙️ Format Response" },
        position: { x: 450, y: 150 },
        style: {
            background: "#1f2937",
            color: "white",
            border: "2px solid #374151",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px"
        }
    },
    {
        id: "5",
        type: "output",
        data: { label: "✅ Send to Slack" },
        position: { x: 650, y: 150 },
        style: {
            background: "#374151",
            color: "white",
            border: "2px solid #4b5563",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "13px",
            fontWeight: "500"
        }
    }
];

const initialEdges: Edge[] = [
    {
        id: "e1-2",
        source: "1",
        target: "2",
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 }
    },
    {
        id: "e1-3",
        source: "1",
        target: "3",
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 }
    },
    {
        id: "e2-4",
        source: "2",
        target: "4",
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 }
    },
    {
        id: "e3-4",
        source: "3",
        target: "4",
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 }
    },
    {
        id: "e4-5",
        source: "4",
        target: "5",
        animated: true,
        style: { stroke: "#6b7280", strokeWidth: 2 }
    }
];

export const WorkflowDemo: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [isRunning, setIsRunning] = React.useState(false);

    const handleRun = (): void => {
        setIsRunning(true);
        setTimeout(() => setIsRunning(false), 3000);
    };

    return (
        <section ref={ref} className="relative py-24 px-4 sm:px-6 lg:px-8 bg-black">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700 mb-6">
                        <Sparkles className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-300">Interactive Demo</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                        Workflows Meet Agents
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Structured workflow nodes (⚙️) handle deterministic steps, while AI agents
                        (🤖) handle complex reasoning. They work together seamlessly.
                    </p>
                </motion.div>

                {/* Demo Container */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative"
                >
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900 to-black shadow-2xl">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-900/50 backdrop-blur-sm border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                </div>
                                <span className="ml-4 text-sm text-gray-400">Sample Workflow</span>
                            </div>

                            <button
                                onClick={handleRun}
                                disabled={isRunning}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                {isRunning ? "Running..." : "Run Workflow"}
                            </button>
                        </div>

                        {/* React Flow Canvas */}
                        <div className="h-[500px] bg-gray-950">
                            <Flow
                                nodes={initialNodes}
                                edges={initialEdges}
                                fitView
                                attributionPosition="bottom-left"
                                proOptions={{ hideAttribution: true }}
                            >
                                <Background
                                    variant={BackgroundVariant.Dots}
                                    gap={16}
                                    size={1}
                                    color="#374151"
                                />
                                <Controls className="bg-gray-800 border-gray-700" />
                            </Flow>
                        </div>

                        {/* Running Overlay */}
                        {isRunning && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
                            >
                                <div className="text-center">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                        className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full mx-auto mb-4"
                                    ></motion.div>
                                    <p className="text-base font-medium">Executing workflow...</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Processing nodes in parallel
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Feature Pills */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-wrap justify-center gap-4 mt-8"
                    >
                        {[
                            "⚙️ Workflow Nodes",
                            "🤖 AI Agents",
                            "↔️ Seamless Integration",
                            "🔄 Durable Execution",
                            "📊 Real-time Monitoring"
                        ].map((feature) => (
                            <div
                                key={feature}
                                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300"
                            >
                                {feature}
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
