import React, { useEffect, useState } from "react";

export const Navbar: React.FC = () => {
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const triggerOffset = window.innerHeight * 0.82;
            setIsSticky(window.scrollY > triggerOffset);
        };
        window.addEventListener("scroll", handleScroll);
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div
            className={`navbar-container ${isSticky ? "navbar-sticky" : "navbar-floating"} h-[43px]`}
        >
            <div className="flex items-center w-fit h-full">
                {/*Logo*/}
                <div className="flex items-center justify-center gap-1 bg-white text-black p-1 rounded-tl-xl">
                    <img className="h-[35px] w-[35px] object-cover" src="/file-2.svg" alt="logo" />
                    <p className="text-lg font-bold pr-2">FlowMaestro</p>
                </div>
                {/*Navigation*/}
                <div className="h-full flex items-center pl-3 pr-3 gap-4 text-white bg-[rgba(39,38,38,1)] rounded-br-xl">
                    <p>Product</p>
                    <p>Pricing</p>
                    <p>Company</p>
                    <p>Blog</p>
                    <p>Docs</p>
                </div>
            </div>
            {/*Waiting list button*/}
            <div className="h-full flex items-center border border-black/20 pr-3 pl-3 rounded-md bg-[rgba(245,245,245,1)] cursor-pointer">
                <p>Join Waitlist</p>
            </div>
        </div>
    );
};
