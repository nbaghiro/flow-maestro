import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export const Hero: React.FC = () => {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 grid-pattern opacity-50"></div>

            {/* Gradient Orbs */}
            <motion.div
                className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-600/30 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            ></motion.div>
            <motion.div
                className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-600/30 rounded-full blur-3xl"
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            ></motion.div>

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8"
                >
                    <Sparkles className="w-4 h-4 text-primary-400" />
                    <span className="text-sm text-primary-300">
                        Enterprise AI Solution
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
                >
                    Orchestrate Workflows & Agents
                    <br />
                    <span className="gradient-text">At Enterprise Scale</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12"
                >
                    Build visual workflows, deploy intelligent AI agents, and
                    connect them together. FlowMaestro provides durable
                    orchestration for both deterministic processes and
                    autonomous agents.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                >
                    <button className="group px-8 py-4 bg-primary-600 hover:bg-primary-700 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg shadow-primary-600/50 hover:shadow-xl hover:shadow-primary-600/60">
                        Start Free Trial
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg font-semibold transition-all duration-200">
                        Watch Demo
                    </button>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
                >
                    <div>
                        <div className="text-3xl font-bold gradient-text">
                            99.9%
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                            Uptime SLA
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold gradient-text">
                            110+
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                            Integrations
                        </div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold gradient-text">
                            10M+
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                            Workflows Run
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-2"
                >
                    <motion.div className="w-1.5 h-1.5 bg-white rounded-full"></motion.div>
                </motion.div>
            </motion.div>
        </section>
    );
};
