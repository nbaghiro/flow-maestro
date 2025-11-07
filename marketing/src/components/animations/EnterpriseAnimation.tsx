import React from "react";
import { motion } from "framer-motion";

export const EnterpriseAnimation: React.FC = () => {
    const nodes = [
        { x: 200, y: 100, delay: 0.2 },
        { x: 140, y: 150, delay: 0.3 },
        { x: 260, y: 150, delay: 0.4 },
        { x: 100, y: 200, delay: 0.5 },
        { x: 180, y: 200, delay: 0.6 },
        { x: 220, y: 200, delay: 0.7 },
        { x: 300, y: 200, delay: 0.8 }
    ];

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="max-w-md mx-auto">
                {/* Connection Lines */}
                <motion.g opacity="0.3">
                    {/* Center to Ring 1 */}
                    <motion.line
                        x1="200"
                        y1="100"
                        x2="140"
                        y2="150"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.9, duration: 0.3 }}
                    />
                    <motion.line
                        x1="200"
                        y1="100"
                        x2="260"
                        y2="150"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                    />

                    {/* Ring 1 to Ring 2 */}
                    {[
                        { x1: 140, y1: 150, x2: 100, y2: 200 },
                        { x1: 140, y1: 150, x2: 180, y2: 200 },
                        { x1: 260, y1: 150, x2: 220, y2: 200 },
                        { x1: 260, y1: 150, x2: 300, y2: 200 }
                    ].map((line, i) => (
                        <motion.line
                            key={i}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="#64748b"
                            strokeWidth="1.5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ delay: 1.1 + i * 0.1, duration: 0.3 }}
                        />
                    ))}
                </motion.g>

                {/* Nodes */}
                {nodes.map((node, i) => (
                    <motion.g key={i}>
                        {/* Outer Glow */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="12"
                            fill="none"
                            stroke={i === 0 ? "#8b5cf6" : "#64748b"}
                            strokeWidth="1"
                            opacity="0.3"
                            initial={{ r: 12, opacity: 0 }}
                            animate={{
                                r: [12, 18, 12],
                                opacity: [0.3, 0, 0.3]
                            }}
                            transition={{
                                delay: node.delay + 1.5,
                                duration: 2,
                                repeat: Infinity
                            }}
                        />

                        {/* Node Circle */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="8"
                            fill={i === 0 ? "#8b5cf6" : "#1e293b"}
                            stroke={i === 0 ? "#a78bfa" : "#64748b"}
                            strokeWidth="2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                delay: node.delay,
                                type: "spring"
                            }}
                        />

                        {/* Status Indicator */}
                        <motion.circle
                            cx={node.x}
                            cy={node.y}
                            r="3"
                            fill="#4ade80"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: node.delay + 0.5 }}
                        />
                    </motion.g>
                ))}

                {/* Data Flow Particles */}
                {[0, 1, 2].map((i) => (
                    <motion.circle
                        key={i}
                        cx="200"
                        cy="100"
                        r="2"
                        fill="#8b5cf6"
                        initial={{ opacity: 0 }}
                        animate={{
                            cx: [200, i % 2 === 0 ? 140 : 260, i % 2 === 0 ? 100 : 300],
                            cy: [100, 150, 200],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            delay: 2 + i * 0.5,
                            duration: 1.5,
                            repeat: Infinity,
                            repeatDelay: 1
                        }}
                    />
                ))}

                {/* Labels */}
                <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                >
                    <text x="200" y="70" fill="#94a3b8" fontSize="10" textAnchor="middle">
                        Master Node
                    </text>
                    <text x="200" y="250" fill="#94a3b8" fontSize="10" textAnchor="middle">
                        Distributed Execution
                    </text>
                </motion.g>

                {/* Status Badge */}
                <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2, type: "spring" }}
                >
                    <rect
                        x="150"
                        y="20"
                        width="100"
                        height="24"
                        rx="12"
                        fill="#16a34a"
                        opacity="0.2"
                    />
                    <rect
                        x="150"
                        y="20"
                        width="100"
                        height="24"
                        rx="12"
                        fill="none"
                        stroke="#4ade80"
                        strokeWidth="1"
                    />
                    <circle cx="165" cy="32" r="3" fill="#4ade80" />
                    <text x="200" y="37" fill="#4ade80" fontSize="10" textAnchor="middle">
                        99.9% Uptime
                    </text>
                </motion.g>
            </svg>
        </div>
    );
};
