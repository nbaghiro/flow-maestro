import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";
import { workflows } from "../../data/workflowcard";
import { iconRegistry } from "../../utils/iconRegistry";
import type { WorkflowCard } from "../../data/workflowcard";

export const HorizontalScroll: React.FC = () => {
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    const x = useTransform(scrollYProgress, [0, 1], ["13%", "-70%"]);

    return (
        <section ref={ref} className="relative h-[300vh]">
            <div className="sticky top-0 h-screen flex items-center overflow-hidden">
                <motion.div style={{ x }} className="flex gap-8 bg-[rgba(245,245,245,1)]">
                    {/*Cards*/}
                    {workflows.map((card: WorkflowCard) => (
                        <div
                            key={card.id}
                            className="w-[1100px] h-[650px] flex flex-col bg-white border border-gray-200 rounded-[30px]"
                        >
                            {/*Image*/}
                            <div className="relative flex h-[75%]">
                                <div className="absolute h-full w-full text-center flex flex-col justify-center">
                                    <p className="text-3xl font-semibold">PLACEHOLDER</p>
                                    <p className="font-semibold">
                                        Either animation or video of Workflow for named industry
                                    </p>
                                </div>
                                <img
                                    className="h-full w-full object-cover rounded-tr-[30px] rounded-tl-[30px]"
                                    src={card.image}
                                    alt=""
                                />
                            </div>
                            {/*Title*/}
                            <div className="flex justify-between pl-4 pt-6 pr-8">
                                <div className="flex flex flex-col text-3xl font-semibold">
                                    <p className="text-gray-300 mb-3">0{card.id}</p>
                                    <p>{card.title}</p>
                                </div>
                                {/*Workflow Description*/}
                                <div className="flex gap-[90px]">
                                    {card.icons.map((iconName, idx) => {
                                        const Icon = iconRegistry[
                                            iconName as keyof typeof iconRegistry
                                        ] as React.ElementType;

                                        return (
                                            <div key={idx}>
                                                {/*Icon*/}
                                                <div className="w-fit h-fit p-1 border border-black rounded flex items-center justify-center text-gray-500 shadow-[3px_2px_5px_rgba(0,0,0,0.1)]">
                                                    {Icon && <Icon className="stroke-1" />}
                                                </div>
                                                {/*Subtitle*/}
                                                <p className="text-xl mt-2">
                                                    {card.subtitles[idx]}
                                                </p>
                                                {/*text*/}
                                                <p className="text-gray-300 text-[14px]">
                                                    {card.texts[idx]}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
