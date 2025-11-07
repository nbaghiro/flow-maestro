import React from "react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { Workflow, Zap, Shield, Clock, GitBranch, Database } from "lucide-react";

interface Feature {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const features: Feature[] = [
    {
        icon: <Workflow className="w-6 h-6" />,
        title: "Visual Workflow Builder",
        description:
            "Design deterministic workflows with drag-and-drop nodes. Perfect for data pipelines, ETL, and business processes."
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: "AI Agent Orchestration",
        description:
            "Deploy autonomous agents that make decisions, learn from context, and collaborate with workflows seamlessly."
    },
    {
        icon: <Shield className="w-6 h-6" />,
        title: "Unified Orchestration",
        description:
            "Connect workflows and agents together. Let agents trigger workflows, and workflows delegate to agents for intelligent decisions."
    },
    {
        icon: <Clock className="w-6 h-6" />,
        title: "Durable Execution",
        description:
            "Powered by Temporal. Both workflows and agents survive failures, resume on errors, and maintain state across restarts."
    },
    {
        icon: <GitBranch className="w-6 h-6" />,
        title: "Smart Routing",
        description:
            "Route tasks to the right executor - deterministic nodes for predictable steps, agents for complex reasoning."
    },
    {
        icon: <Database className="w-6 h-6" />,
        title: "Rich Integrations",
        description:
            "Connect to 110+ services, databases, APIs, and AI models. Agents can access MCP servers for extended capabilities."
    }
];

const FeatureCard: React.FC<{ feature: Feature; index: number }> = ({ feature, index }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="relative group"
        >
            <div className="relative p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 h-full">
                {/* Icon */}
                <div className="inline-flex p-3 rounded-xl bg-primary-500/10 text-primary-400 mb-4 group-hover:bg-primary-500/20 transition-colors">
                    {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>

                {/* Gradient Border Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-500/0 via-accent-500/0 to-primary-500/0 group-hover:from-primary-500/20 group-hover:via-accent-500/20 group-hover:to-primary-500/20 transition-all duration-500 -z-10"></div>
            </div>
        </motion.div>
    );
};

export const Features: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

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
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Workflows + Agents
                        <span className="gradient-text"> Working Together</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Combine the reliability of structured workflows with the intelligence of
                        autonomous agents.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={index} feature={feature} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};
