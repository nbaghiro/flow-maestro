import React from "react";
import { CTA } from "./components/CTA";
import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { HeroNew } from "./components/HeroNew";
import { IndustriesShowcase } from "./components/IndustriesShowcase";
import { Integrations } from "./components/Integrations";
import { Navbar } from "./components/Navbar";
import { SocialProof } from "./components/SocialProof";
import { UseCases } from "./components/UseCases";
import { WorkflowDemo } from "./components/WorkflowDemo";

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-[rgba(245,245,245,1)] text-black">
            <Navbar />
            <HeroNew />
            <IndustriesShowcase />
            <Features />
            <UseCases />
            <WorkflowDemo />
            <Integrations />
            <SocialProof />
            <CTA />
            <Footer />
        </div>
    );
};

export default App;
