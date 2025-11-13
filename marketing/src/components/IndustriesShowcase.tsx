import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

export const IndustriesShowcase: React.FC = () => {
    return (
        <div className="relative h-[800px] border border-white/20">
            {/*Showcase Nav*/}
            <div className="absolute flex items-center justify-between gap-4 bottom-0 left-1/2 -translate-x-1/2 mb-[30px] rounded-2xl border border-white/15 h-[50px] w-[450px]">
                <div className="p-2 border-r border-white/15 h-full flex items-center justify-center cursor-pointer">
                    <ChevronLeft />
                </div>

                {/*Placeholders could be replaced with icons or both icons and text with hover and active state*/}
                <div className="flex items-center justify-center gap-4">
                    <p className="underline underline-offset-4 decoration-2">Sales</p>
                    <p>Engineering</p>
                    <p>Support</p>
                    <p>Marketing</p>
                </div>

                <div className="p-2 border-l border-white/15 h-full flex items-center justify-center cursor-pointer">
                    <ChevronRight />
                </div>
            </div>

            {/*Showcase Container*/}
            <div className="h-full grid grid-cols-[1.5fr_1fr_1.5fr]">
                <div className="bg-gray-700 flex items-center justify-center">
                    <p className="w-[300px] text-center">
                        Possible workflow explaination either by text or maybe interactive animation
                    </p>
                </div>
                <div className="flex items-center justify-center">
                    <p className="w-[250px] text-center ">
                        Quarter Rotation animation of logo as you navigate through the industries
                    </p>
                </div>
                <div className="bg-red-700 flex items-center justify-center">
                    <p className="w-[250px] text-center">Animated workflow example</p>
                </div>
            </div>
        </div>
    );
};
