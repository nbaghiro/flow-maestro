import { ArrowRight } from "lucide-react";
import React from "react";

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="p-6">
            <div className="bg-[rgba(20,19,19,1)] rounded-lg p-8 pt-20 px-10">
                <div className="mb-[130px]">
                    {/* Content */}
                    <div className="relative z-10 text-center">
                        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                            <p>Ready to Automate At Enterprise Scale?</p>
                        </h2>

                        <p className="text-xl mb-8 max-w-2xl text-white mx-auto">
                            Join thousands of teams building powerful workflows with FlowMaestro.
                            <br />
                            Join the list to have first access.
                        </p>

                        {/* Features */}
                        {/*<div className="flex flex-wrap justify-center gap-6 mb-10">
                            {["Free 14-day trial", "No credit card required", "Cancel anytime"].map(
                                (feature) => (
                                    <div
                                        key={feature}
                                        className="flex items-center text-white gap-2"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        <span>{feature}</span>
                                    </div>
                                )
                            )}
                        </div>*/}

                        {/* Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button className="group px-8 py-2 bg-[rgba(248,247,247,1)] text-black rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg">
                                Join Waitlist
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                {/*Directory*/}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Product */}
                    <div className="flex justify-center">
                        <div>
                            <h3 className="font-semibold text-white mb-4">Product</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Features
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Integrations
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Documentation
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Company */}
                    <div className="flex justify-center">
                        <div>
                            <h3 className="font-semibold text-white mb-4">Company</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Careers
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Resource */}
                    <div className="flex justify-center">
                        <div>
                            <h3 className="font-semibold text-white mb-4">Resource</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Blog
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        FAQ
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Social */}
                    <div className="flex justify-center">
                        <div>
                            <h3 className="font-semibold text-white mb-4">Social</h3>
                            <ul className="space-y-2 text-gray-400 text-sm">
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        GitHub
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        X
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Linkedin
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="hover:text-white transition-colors">
                                        Email
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
                    <p>© {currentYear} FlowMaestro. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-white transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Terms of Service
                        </a>
                        <a href="#" className="hover:text-white transition-colors">
                            Cookie Policy
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
