import { Database, BrainCircuit, Cloud } from "lucide-react";
import React from "react";
import Marquee from "react-fast-marquee";

export const HeroNew: React.FC = () => {
    return (
        <section className="h-screen grid grid-rows-[1fr_2fr_1fr] overflow-hidden">
            {/*Intro*/}
            <div>
                <div className="text-4xl sm:text-5xl lg:text-5xl">
                    <p>Orchestrate Workflows & Agents</p>
                    <span>At Enterprise Scale</span>
                </div>

                <div>
                    <p className="w-[300px]"></p>
                </div>
            </div>

            {/*Hero animation*/}
            <div className="flex items-center justify-center">
                <p></p>
            </div>

            {/*Marquee*/}
            <Marquee autoFill={true} className="row-start-3 flex items-end text-2xl">
                <div className="p-4">
                    <p>TechCorp</p>
                </div>
                <div className="p-4 flex items-center gap-2">
                    <Database className="stroke-1" />
                    <p>DataFlow</p>
                </div>
                <div className="p-4 flex items-center gap-2">
                    <Cloud className="stroke-1" />
                    <p>CloudScale</p>
                </div>
                <div className="p-4 flex items-center gap-2">
                    <BrainCircuit className="stroke-1" />
                    <p>AI Labs</p>
                </div>
            </Marquee>
        </section>
    );
};
