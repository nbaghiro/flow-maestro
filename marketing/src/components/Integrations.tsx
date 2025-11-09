import { motion, useInView } from "framer-motion";
import { Database, Cloud, MessageSquare, Zap } from "lucide-react";
import React from "react";

interface Integration {
    name: string;
    category: string;
    icon: React.ReactNode;
}

const integrations: Integration[] = [
    { name: "PostgreSQL", category: "Database", icon: <Database /> },
    { name: "Redis", category: "Cache", icon: <Database /> },
    { name: "MongoDB", category: "Database", icon: <Database /> },
    { name: "AWS S3", category: "Storage", icon: <Cloud /> },
    { name: "Google Cloud", category: "Cloud", icon: <Cloud /> },
    { name: "Azure", category: "Cloud", icon: <Cloud /> },
    { name: "Slack", category: "Communication", icon: <MessageSquare /> },
    { name: "Discord", category: "Communication", icon: <MessageSquare /> },
    { name: "Teams", category: "Communication", icon: <MessageSquare /> },
    { name: "Temporal", category: "Orchestration", icon: <Zap /> },
    { name: "OpenAI", category: "AI", icon: <Zap /> },
    { name: "Anthropic", category: "AI", icon: <Zap /> }
];

export const Integrations: React.FC = () => {
    const ref = React.useRef<HTMLDivElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section
            ref={ref}
            className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-gray-950 overflow-hidden"
        >
            {/* Background Decoration */}
            <div className="absolute inset-0 grid-pattern opacity-30"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                        Connect
                        <span className="gradient-text"> Everything</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Pre-built integrations for the tools you already use. Plus custom API
                        support for anything else.
                    </p>
                </motion.div>

                {/* Integration Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12"
                >
                    {integrations.map((integration, index) => (
                        <motion.div
                            key={integration.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className="group relative p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-primary-500/50 transition-all duration-300"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-lg bg-primary-500/10 flex items-center justify-center mb-3 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
                                    {integration.icon}
                                </div>
                                <h3 className="font-semibold text-sm mb-1">{integration.name}</h3>
                                <p className="text-xs text-gray-400">{integration.category}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-center"
                >
                    <p className="text-gray-400 mb-4">+ 98 more integrations available</p>
                    <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all duration-200">
                        View All Integrations
                    </button>
                </motion.div>
            </div>
        </section>
    );
};
