import React from "react";
import { motion } from "framer-motion";

export const WorkflowAnimation: React.FC = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 400 300"
                className="max-w-md mx-auto"
            >
                {/* Workflow Boxes */}
                <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Box 1 */}
                    <motion.rect
                        x="30"
                        y="120"
                        width="80"
                        height="60"
                        rx="8"
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                    />
                    <text
                        x="70"
                        y="155"
                        fill="#e2e8f0"
                        fontSize="12"
                        textAnchor="middle"
                    >
                        Start
                    </text>

                    {/* Box 2 */}
                    <motion.rect
                        x="160"
                        y="120"
                        width="80"
                        height="60"
                        rx="8"
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                    />
                    <text
                        x="200"
                        y="155"
                        fill="#e2e8f0"
                        fontSize="12"
                        textAnchor="middle"
                    >
                        Process
                    </text>

                    {/* Box 3 */}
                    <motion.rect
                        x="290"
                        y="120"
                        width="80"
                        height="60"
                        rx="8"
                        fill="#1e293b"
                        stroke="#64748b"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                    />
                    <text
                        x="330"
                        y="155"
                        fill="#e2e8f0"
                        fontSize="12"
                        textAnchor="middle"
                    >
                        Output
                    </text>
                </motion.g>

                {/* Animated Connecting Lines */}
                <motion.line
                    x1="110"
                    y1="150"
                    x2="160"
                    y2="150"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                />
                <motion.line
                    x1="240"
                    y1="150"
                    x2="290"
                    y2="150"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                />

                {/* Animated Flow Particles */}
                <motion.circle
                    cx="0"
                    cy="150"
                    r="4"
                    fill="#a78bfa"
                    initial={{ cx: 110 }}
                    animate={{ cx: [110, 160, 160] }}
                    transition={{
                        delay: 1.5,
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                    }}
                />
                <motion.circle
                    cx="0"
                    cy="150"
                    r="4"
                    fill="#a78bfa"
                    initial={{ cx: 240 }}
                    animate={{ cx: [240, 290, 290] }}
                    transition={{
                        delay: 2.2,
                        duration: 1.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                    }}
                />
            </svg>
        </div>
    );
};
