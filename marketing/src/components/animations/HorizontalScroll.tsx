import { motion, useScroll, useTransform } from "framer-motion";
import React, { useRef } from "react";

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
                    <div className="w-[1100px] h-[650px] flex flex-col bg-white border border-gray-200 rounded-[50px]">
                        <div className="flex h-[75%]">
                            <img
                                className="h-full w-full object-cover rounded-tr-[50px] rounded-tl-[50px]"
                                src="preview.png"
                                alt=""
                            />
                        </div>
                        <div className="flex-1 flex text-3xl pl-4 pt-4 font-semibold">
                            <div>
                                <p className="text-gray-300">01</p>
                                <p>Sales</p>
                            </div>
                            <div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                    <div className="w-[1100px] h-[650px] bg-white border border-gray-200 rounded-[50px]"></div>
                    <div className="w-[1100px] h-[650px] bg-white border border-gray-200 rounded-[50px]"></div>
                    <div className="w-[1100px] h-[650px] bg-white border border-gray-200 rounded-[50px]"></div>
                </motion.div>
            </div>
        </section>
    );
};
