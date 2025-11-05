import React from "react";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { UseCases } from "./components/UseCases";
import { WorkflowDemo } from "./components/WorkflowDemo";
import { Integrations } from "./components/Integrations";
import { SocialProof } from "./components/SocialProof";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            <Hero />
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
