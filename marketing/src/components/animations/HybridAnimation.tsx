import React from "react";
import { motion } from "framer-motion";

export const HybridAnimation: React.FC = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 400 300"
                className="max-w-md mx-auto"
            >
                {/* Left: Workflow Box */}
                <motion.g
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <rect
                        x="30"
                        y="110"
                        width="90"
                        height="80"
                        rx="8"
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth="2"
                    />
                    <text
                        x="75"
                        y="140"
                        fill="#e2e8f0"
                        fontSize="12"
                        textAnchor="middle"
                    >
                        ⚙️
                    </text>
                    <text
                        x="75"
                        y="165"
                        fill="#94a3b8"
                        fontSize="10"
                        textAnchor="middle"
                    >
                        Workflow
                    </text>
                    <text
                        x="75"
                        y="180"
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="middle"
                    >
                        Fetch Data
                    </text>
                </motion.g>

                {/* Center: AI Agent */}
                <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                >
                    <motion.path
                        d="M 200 125 L 235 143 L 235 177 L 200 195 L 165 177 L 165 143 Z"
                        fill="#d946ef"
                        stroke="#f0abfc"
                        strokeWidth="2"
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                        }}
                        style={{ originX: "200px", originY: "160px" }}
                    />
                    <text
                        x="200"
                        y="155"
                        fill="#fae8ff"
                        fontSize="14"
                        fontWeight="bold"
                        textAnchor="middle"
                    >
                        🤖
                    </text>
                    <text
                        x="200"
                        y="173"
                        fill="#fae8ff"
                        fontSize="9"
                        textAnchor="middle"
                    >
                        AI Agent
                    </text>
                </motion.g>

                {/* Right: Workflow Box */}
                <motion.g
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <rect
                        x="280"
                        y="110"
                        width="90"
                        height="80"
                        rx="8"
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth="2"
                    />
                    <text
                        x="325"
                        y="140"
                        fill="#e2e8f0"
                        fontSize="12"
                        textAnchor="middle"
                    >
                        ⚙️
                    </text>
                    <text
                        x="325"
                        y="165"
                        fill="#94a3b8"
                        fontSize="10"
                        textAnchor="middle"
                    >
                        Workflow
                    </text>
                    <text
                        x="325"
                        y="180"
                        fill="#94a3b8"
                        fontSize="9"
                        textAnchor="middle"
                    >
                        Save Results
                    </text>
                </motion.g>

                {/* Animated Arrows */}
                <motion.g>
                    {/* Arrow 1: Workflow to Agent */}
                    <motion.path
                        d="M 120 150 L 160 160"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1, duration: 0.5 }}
                    />
                    <motion.path
                        d="M 160 160 L 155 155 M 160 160 L 155 165"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        fill="none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5 }}
                    />

                    {/* Arrow 2: Agent to Workflow */}
                    <motion.path
                        d="M 240 160 L 280 150"
                        stroke="#d946ef"
                        strokeWidth="2"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1.7, duration: 0.5 }}
                    />
                    <motion.path
                        d="M 280 150 L 275 155 M 280 150 L 275 145"
                        stroke="#d946ef"
                        strokeWidth="2"
                        fill="none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.2 }}
                    />
                </motion.g>

                {/* Flowing Particles */}
                <motion.circle
                    cx="120"
                    cy="150"
                    r="3"
                    fill="#a78bfa"
                    animate={{
                        cx: [120, 160, 240, 280],
                        cy: [150, 160, 160, 150],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                        delay: 2.5,
                    }}
                />

                {/* Label */}
                <motion.text
                    x="200"
                    y="240"
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                >
                    Seamless Handoff
                </motion.text>
            </svg>
        </div>
    );
};
