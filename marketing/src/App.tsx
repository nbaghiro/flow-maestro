import React from "react";
import { BackgroundNoise } from "./components/animations/BackgroundNoise";
import { Footer } from "./components/Footer";
import { HeroNew } from "./components/HeroNew";
import { HowItWorks } from "./components/HowItWorks";
import { IndustriesShowcase } from "./components/IndustriesShowcase";
import { Integrations } from "./components/Integrations";
import { Navbar } from "./components/Navbar";
import { SocialProof } from "./components/SocialProof";
import { UseCases } from "./components/UseCases";
import { WorkflowDemo } from "./components/WorkflowDemo";

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-[rgba(248,247,247,1)] text-black">
            <BackgroundNoise />
            <Navbar />
            <HeroNew />
            <IndustriesShowcase />
            <HowItWorks />
            <UseCases />
            <WorkflowDemo />
            <Integrations />
            <SocialProof />
            <Footer />
        </div>
    );
};

export default App;
