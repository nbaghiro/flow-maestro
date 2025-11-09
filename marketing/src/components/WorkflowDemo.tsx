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
            background: "#7c3aed",
            color: "white",
            border: "2px solid #a78bfa",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600"
        }
    },
    {
        id: "2",
        data: { label: "⚙️ Extract Data" },
        position: { x: 250, y: 80 },
        style: {
            background: "#1e293b",
            color: "white",
            border: "2px solid #64748b",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px"
        }
    },
    {
        id: "3",
        data: { label: "🤖 AI Agent: Analyze" },
        position: { x: 250, y: 200 },
        style: {
            background: "#d946ef",
            color: "white",
            border: "2px solid #f0abfc",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600"
        }
    },
    {
        id: "4",
        data: { label: "⚙️ Format Response" },
        position: { x: 450, y: 150 },
        style: {
            background: "#1e293b",
            color: "white",
            border: "2px solid #64748b",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px"
        }
    },
    {
        id: "5",
        type: "output",
        data: { label: "✅ Send to Slack" },
        position: { x: 650, y: 150 },
        style: {
            background: "#16a34a",
            color: "white",
            border: "2px solid #4ade80",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600"
        }
    }
];

const initialEdges: Edge[] = [
    {
        id: "e1-2",
        source: "1",
        target: "2",
        animated: true,
        style: { stroke: "#a78bfa", strokeWidth: 2 }
    },
    {
        id: "e1-3",
        source: "1",
        target: "3",
        animated: true,
        style: { stroke: "#d946ef", strokeWidth: 2 }
    },
    {
        id: "e2-4",
        source: "2",
        target: "4",
        animated: true,
        style: { stroke: "#a78bfa", strokeWidth: 2 }
    },
    {
        id: "e3-4",
        source: "3",
        target: "4",
        animated: true,
        style: { stroke: "#d946ef", strokeWidth: 2 }
    },
    {
        id: "e4-5",
        source: "4",
        target: "5",
        animated: true,
        style: { stroke: "#4ade80", strokeWidth: 2 }
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
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20 mb-6">
                        <Sparkles className="w-4 h-4 text-accent-400" />
                        <span className="text-sm text-accent-300">Interactive Demo</span>
                    </div>

                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Workflows
                        <span className="gradient-text"> Meet Agents</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
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
                                        className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"
                                    ></motion.div>
                                    <p className="text-lg font-semibold">Executing workflow...</p>
                                    <p className="text-sm text-gray-400 mt-2">
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
