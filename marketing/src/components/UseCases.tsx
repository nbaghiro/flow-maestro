import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import * as Tabs from "@radix-ui/react-tabs";
import {
    BarChart,
    Users,
    Cog,
    GitBranch,
    CheckCircle2,
    ArrowRight,
} from "lucide-react";
import { WorkflowAnimation } from "./animations/WorkflowAnimation";
import { AgentAnimation } from "./animations/AgentAnimation";
import { HybridAnimation } from "./animations/HybridAnimation";
import { EnterpriseAnimation } from "./animations/EnterpriseAnimation";

interface UseCase {
    id: string;
    label: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    features: string[];
    gradient: string;
}

const useCases: UseCase[] = [
    {
        id: "workflow-orchestration",
        label: "Workflow Orchestration",
        icon: <BarChart className="w-5 h-5" />,
        title: "Deterministic Workflows for Reliable Execution",
        description:
            "Build predictable, repeatable workflows for data processing, ETL pipelines, and business automation. Perfect when you need guaranteed, step-by-step execution.",
        features: [
            "Visual workflow designer with 110+ nodes",
            "Conditional branching and loops",
            "Parallel execution for performance",
            "Schedule recurring workflows",
            "Real-time monitoring and debugging",
        ],
        gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
        id: "agent-deployment",
        label: "Agent Deployment",
        icon: <Cog className="w-5 h-5" />,
        title: "Deploy Autonomous AI Agents",
        description:
            "Create intelligent agents that make decisions, adapt to context, and handle complex tasks. Ideal for customer support, research, content generation, and dynamic problem-solving.",
        features: [
            "Multi-agent collaboration and coordination",
            "MCP server integration for tool access",
            "Context-aware decision making",
            "Learning from execution history",
            "Agent-to-agent communication",
        ],
        gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
        id: "hybrid-systems",
        label: "Hybrid Systems",
        icon: <GitBranch className="w-5 h-5" />,
        title: "Combine Workflows + Agents",
        description:
            "Get the best of both worlds. Use workflows for structured tasks and delegate complex decisions to agents. They work together seamlessly in the same system.",
        features: [
            "Workflows trigger agents for intelligent steps",
            "Agents execute workflows as sub-tasks",
            "Shared context and data between both",
            "Unified monitoring and observability",
            "Fallback from agent to workflow when needed",
        ],
        gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
        id: "enterprise-scale",
        label: "Enterprise Scale",
        icon: <Users className="w-5 h-5" />,
        title: "Production-Ready Orchestration",
        description:
            "Whether you're running workflows, agents, or both, FlowMaestro provides enterprise-grade reliability, security, and scale powered by Temporal.",
        features: [
            "Durable execution survives failures",
            "Automatic retries with backoff",
            "Version control and rollbacks",
            "Multi-tenant isolation",
            "SOC 2 compliance ready",
        ],
        gradient: "from-orange-500/20 to-red-500/20",
    },
];

export const UseCases: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState(useCases[0].id);
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section
            ref={ref}
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-950"
        >
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Choose Your
                        <span className="gradient-text"> Execution Model</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Deterministic workflows, autonomous agents, or both
                        working together. You decide what fits your use case.
                    </p>
                </motion.div>

                {/* Tabs */}
                <Tabs.Root
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    {/* Tab List */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                    >
                        <Tabs.List className="flex flex-wrap justify-center gap-4 mb-12">
                            {useCases.map((useCase) => (
                                <Tabs.Trigger
                                    key={useCase.id}
                                    value={useCase.id}
                                    className="group relative px-6 py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 data-[state=active]:bg-primary-500/20 data-[state=active]:border-primary-500/50 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 group-data-[state=active]:text-primary-400 transition-colors">
                                            {useCase.icon}
                                        </span>
                                        <span className="font-medium text-gray-300 group-data-[state=active]:text-white">
                                            {useCase.label}
                                        </span>
                                    </div>
                                </Tabs.Trigger>
                            ))}
                        </Tabs.List>
                    </motion.div>

                    {/* Tab Content */}
                    {useCases.map((useCase) => (
                        <Tabs.Content
                            key={useCase.id}
                            value={useCase.id}
                            className="focus:outline-none"
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className={`relative rounded-2xl bg-gradient-to-br ${useCase.gradient} p-12 backdrop-blur-sm border border-white/10`}
                            >
                                <div className="grid lg:grid-cols-2 gap-12 items-center">
                                    {/* Left: Content */}
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-6">
                                            {useCase.icon}
                                            <span className="text-sm font-medium">
                                                {useCase.label}
                                            </span>
                                        </div>

                                        <h3 className="text-3xl font-bold mb-4">
                                            {useCase.title}
                                        </h3>

                                        <p className="text-gray-300 text-lg mb-8">
                                            {useCase.description}
                                        </p>

                                        <ul className="space-y-4 mb-8">
                                            {useCase.features.map(
                                                (feature, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start gap-3"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                                        <span className="text-gray-300">
                                                            {feature}
                                                        </span>
                                                    </li>
                                                )
                                            )}
                                        </ul>

                                        <button className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                                            Explore Examples
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Right: Animated Visual */}
                                    <div className="relative">
                                        <div className="aspect-square rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center p-8">
                                            {useCase.id === "workflow-orchestration" && (
                                                <WorkflowAnimation />
                                            )}
                                            {useCase.id === "agent-deployment" && (
                                                <AgentAnimation />
                                            )}
                                            {useCase.id === "hybrid-systems" && (
                                                <HybridAnimation />
                                            )}
                                            {useCase.id === "enterprise-scale" && (
                                                <EnterpriseAnimation />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Tabs.Content>
                    ))}
                </Tabs.Root>
            </div>
        </section>
    );
};
