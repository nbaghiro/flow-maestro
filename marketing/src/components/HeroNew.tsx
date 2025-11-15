import { Database, BrainCircuit, Cloud } from "lucide-react";
import React from "react";
import Marquee from "react-fast-marquee";
import { ParticleAnimation } from "./animations/ParticleAnimation";

export const HeroNew: React.FC = () => {
    return (
        <section className="relative h-screen grid grid-rows-[2fr_2fr_1fr] overflow-hidden">
            {/*Intro*/}
            <div className="relative flex items-center pl-4">
                <ParticleAnimation />
                <div className="text-5xl sm:text-5xl lg:text-7xl w-full">
                    <p>Orchestrate Workflows & Agents</p>
                    <span>At Enterprise Scale</span>
                </div>
            </div>

            {/*Hero animation*/}
            <div className="flex items-center justify-between pl-4 pr-10 text-xl">
                <div className="text-center z-10">
                    <p className="font-bold text-3xl">PLACEHOLDER</p>
                    <p>Animation/art here with possible position absolute under texts</p>
                </div>
                <p className="w-[450px] font-semibold">
                    Build visual workflows, deploy intelligent AI agents, and connect them together.
                    FlowMaestro provides durable orchestration for both deterministic processes and
                    autonomous agents.
                </p>
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
