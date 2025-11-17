import {
    motion,
    useScroll,
    useTransform,
    useMotionValueEvent,
    useSpring,
    useMotionValue
} from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { AgentAnimation } from "./animations/AgentAnimation";
import { EnterpriseAnimation } from "./animations/EnterpriseAnimation";
import { HybridAnimation } from "./animations/HybridAnimation";
import { WorkflowAnimation } from "./animations/WorkflowAnimation";

interface UseCase {
    id: string;
    label: string;
    title: string;
    description: string;
    features: string[];
}

const useCases: UseCase[] = [
    {
        id: "workflow-orchestration",
        label: "Workflow Orchestration",
        title: "Deterministic Workflows for Reliable Execution",
        description:
            "Build predictable, repeatable workflows for data processing, ETL pipelines, and business automation. Perfect when you need guaranteed, step-by-step execution.",
        features: [
            "Visual workflow designer with 110+ nodes",
            "Conditional branching and loops",
            "Parallel execution for performance",
            "Schedule recurring workflows",
            "Real-time monitoring and debugging"
        ]
    },
    {
        id: "agent-deployment",
        label: "Agent Deployment",
        title: "Deploy Autonomous AI Agents",
        description:
            "Create intelligent agents that make decisions, adapt to context, and handle complex tasks. Ideal for customer support, research, content generation, and dynamic problem-solving.",
        features: [
            "Multi-agent collaboration and coordination",
            "MCP server integration for tool access",
            "Context-aware decision making",
            "Learning from execution history",
            "Agent-to-agent communication"
        ]
    },
    {
        id: "hybrid-systems",
        label: "Hybrid Systems",
        title: "Combine Workflows + Agents",
        description:
            "Get the best of both worlds. Use workflows for structured tasks and delegate complex decisions to agents. They work together seamlessly in the same system.",
        features: [
            "Workflows trigger agents for intelligent steps",
            "Agents execute workflows as sub-tasks",
            "Shared context and data between both",
            "Unified monitoring and observability",
            "Fallback from agent to workflow when needed"
        ]
    },
    {
        id: "enterprise-scale",
        label: "Enterprise Scale",
        title: "Production-Ready Orchestration",
        description:
            "Whether you're running workflows, agents, or both, FlowMaestro provides enterprise-grade reliability, security, and scale powered by Temporal.",
        features: [
            "Durable execution survives failures",
            "Automatic retries with backoff",
            "Version control and rollbacks",
            "Multi-tenant isolation",
            "SOC 2 compliance ready"
        ]
    }
];

export const UseCasesNew: React.FC = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState(0);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const indexProgress = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 1, 2, 3, 3]);

    useMotionValueEvent(indexProgress, "change", (v) => {
        setCurrent(Math.round(v));
    });

    const active = useCases[current];

    const opacityFor = (idx: number) => {
        const distance = Math.abs(idx - current);
        if (distance === 0) return 1;
        if (distance === 1) return 0.4;
        return 0;
    };

    const ITEM_HEIGHT = 60;

    const yRaw = useMotionValue(0);
    const y = useSpring(yRaw, { stiffness: 260, damping: 25 });

    useEffect(() => {
        yRaw.set(-current * ITEM_HEIGHT);
    }, [current]);

    return (
        <section ref={ref} className="h-[400vh] relative">
            <div className="sticky top-0 h-screen p-6">
                <div className="h-full flex items-center gap-7 px-10 rounded-2xl">
                    {/*Right Content*/}
                    <div className="h-[80%] w-[35%] flex flex-col items-center justify-between p-8 bg-white rounded-lg shadow-[0px_2px_5px_rgba(0,0,0,0.1)]">
                        {/*Top Label*/}
                        <p className="uppercase text-sm font-semibold">
                            Choose Your Execution Model
                        </p>
                        {/*Snapping Rail*/}
                        <div className="relative w-full overflow-hidden h-[180px]">
                            <motion.div
                                style={{ y }}
                                className="absolute top-0 left-0 w-full flex flex-col items-center"
                            >
                                {useCases.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        animate={{
                                            opacity: opacityFor(idx),
                                            scale: idx === current ? 1 : 0.92
                                        }}
                                        transition={{ duration: 0.25 }}
                                        className="h-[60px] flex items-center"
                                    >
                                        <span
                                            className={
                                                idx === current
                                                    ? "text-3xl font-semibold text-black"
                                                    : "text-xl text-gray-400"
                                            }
                                        >
                                            {item.label}
                                        </span>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                        <p className="text-sm font-semibold">
                            Deterministic workflows, autonomous agents, or both working together.
                            decide what fits your use case.
                        </p>
                    </div>
                    {/*Left Content*/}
                    <div className="flex-1 h-[80%] grid grid-cols-2 bg-white rounded-lg shadow-[0px_2px_5px_rgba(0,0,0,0.1)]">
                        {/*Description*/}
                        <motion.div
                            key={`text-${current}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col gap-6 p-8"
                        >
                            <div className="text-3xl font-semibold">
                                <p>{active.title}</p>
                            </div>
                            <div>
                                <p>{active.description}</p>
                            </div>
                            <ul className="list-disc pl-8 space-y-2">
                                {active.features.map((feature, idx) => (
                                    <li key={idx} className="font-semibold">
                                        <p>{feature}</p>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        {/*Animation Content*/}
                        <motion.div
                            key={`anim-${current}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full items-center justify-center py-6 pr-6"
                        >
                            <div className="w-full h-full flex flex-col items-center justify-center bg-[rgba(248,247,247,1)] rounded-xl">
                                <p>PLACEHOLDER</p>
                                {current === 0 && <WorkflowAnimation />}
                                {current === 1 && <AgentAnimation />}
                                {current === 2 && <HybridAnimation />}
                                {current === 3 && <EnterpriseAnimation />}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};
