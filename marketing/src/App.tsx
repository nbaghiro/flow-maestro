import React from "react";
import { CTA } from "./components/CTA";
import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Integrations } from "./components/Integrations";
import { Navigation } from "./components/Navigation";
import { SocialProof } from "./components/SocialProof";
import { UseCases } from "./components/UseCases";
import { WorkflowDemo } from "./components/WorkflowDemo";

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-black text-white">
            <Navigation />
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
