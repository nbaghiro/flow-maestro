import * as Tabs from "@radix-ui/react-tabs";
import { useInView, motion } from "framer-motion";
import { BarChart, Users, Cog, GitBranch, CheckCircle2, ArrowRight } from "lucide-react";
import React from "react";

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
            "Real-time monitoring and debugging"
        ],
        gradient: "from-gray-900/50 to-gray-800/50"
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
            "Agent-to-agent communication"
        ],
        gradient: "from-gray-900/50 to-gray-800/50"
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
            "Fallback from agent to workflow when needed"
        ],
        gradient: "from-gray-900/50 to-gray-800/50"
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
            "SOC 2 compliance ready"
        ],
        gradient: "from-gray-900/50 to-gray-800/50"
    }
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl sm:text-4xl font-semibold mb-4">
                        Choose Your Execution Model
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Deterministic workflows, autonomous agents, or both working together. You
                        decide what fits your use case.
                    </p>
                </motion.div>

                {/* Tabs */}
                <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                                    className="group relative px-6 py-3 rounded-lg border border-gray-800 hover:border-gray-700 data-[state=active]:bg-gray-800 data-[state=active]:border-gray-700 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 group-data-[state=active]:text-gray-300 transition-colors">
                                            {useCase.icon}
                                        </span>
                                        <span className="font-medium text-gray-400 group-data-[state=active]:text-white">
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
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className={`relative rounded-lg bg-gradient-to-br ${useCase.gradient} p-8 border border-gray-800`}
                            >
                                <div className="grid lg:grid-cols-2 gap-8 items-start">
                                    {/* Left: Content */}
                                    <div>
                                        <h3 className="text-2xl font-semibold mb-3">
                                            {useCase.title}
                                        </h3>

                                        <p className="text-gray-400 mb-6">{useCase.description}</p>

                                        <ul className="space-y-3 mb-6">
                                            {useCase.features.map((feature, index) => (
                                                <li key={index} className="flex items-start gap-3">
                                                    <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                    <span className="text-sm text-gray-400">
                                                        {feature}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <button className="group inline-flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">
                                            Explore Examples
                                            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>

                                    {/* Right: Simplified Visual placeholder */}
                                    <div className="relative">
                                        <div className="aspect-square rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center p-8">
                                            <div className="text-center text-gray-600">
                                                <div className="text-4xl mb-2">{useCase.icon}</div>
                                                <div className="text-sm">{useCase.label}</div>
                                            </div>
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
