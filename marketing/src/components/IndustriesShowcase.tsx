import React from "react";
import { HorizontalScroll } from "./animations/HorizontalScroll";

export const IndustriesShowcase: React.FC = () => {
    return (
        <section className="relative h-[300vh]">
            {/*Title*/}
            <div className="sticky top-0 h-screen flex flex-col justify-center pl-5 pointer-events-none text-7xl font-semibold">
                <p>Turn workflow</p>
                <p>Into</p>
            </div>
            <div className="absolute inset-0">
                <HorizontalScroll />
            </div>
        </section>
    );
};
