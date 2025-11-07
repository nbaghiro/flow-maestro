import React from "react";
import { motion } from "framer-motion";

export const AgentAnimation: React.FC = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="max-w-md mx-auto">
                {/* Central AI Brain */}
                <motion.g
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                >
                    {/* Hexagon Shape for AI */}
                    <motion.path
                        d="M 200 100 L 250 125 L 250 175 L 200 200 L 150 175 L 150 125 Z"
                        fill="#d946ef"
                        stroke="#f0abfc"
                        strokeWidth="3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    />

                    {/* Inner Gear/Brain Icon */}
                    <motion.circle
                        cx="200"
                        cy="150"
                        r="25"
                        fill="none"
                        stroke="#fae8ff"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        style={{ originX: "200px", originY: "150px" }}
                    />

                    {/* AI Symbol */}
                    <text
                        x="200"
                        y="160"
                        fill="#fae8ff"
                        fontSize="24"
                        fontWeight="bold"
                        textAnchor="middle"
                    >
                        AI
                    </text>
                </motion.g>

                {/* Thinking Particles */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <motion.circle
                        key={i}
                        cx="200"
                        cy="150"
                        r="3"
                        fill="#c084fc"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0],
                            x: [0, Math.cos(i * 60 * (Math.PI / 180)) * 60],
                            y: [0, Math.sin(i * 60 * (Math.PI / 180)) * 60]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3
                        }}
                    />
                ))}

                {/* Pulsing Glow */}
                <motion.circle
                    cx="200"
                    cy="150"
                    r="50"
                    fill="none"
                    stroke="#d946ef"
                    strokeWidth="2"
                    opacity="0.3"
                    animate={{
                        r: [50, 70, 50],
                        opacity: [0.3, 0, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Context Labels */}
                <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <text x="200" y="60" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        Analyzing Context
                    </text>
                    <text x="200" y="250" fill="#94a3b8" fontSize="11" textAnchor="middle">
                        Making Decisions
                    </text>
                </motion.g>
            </svg>
        </div>
    );
};
