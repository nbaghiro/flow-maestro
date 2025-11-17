import p5 from "p5";
import React, { useEffect, useRef, useState } from "react";
import TRUNK from "vanta/dist/vanta.trunk.min";

export const BackgroundTrunk: React.FC = () => {
    const vantaRef = useRef<HTMLDivElement>(null);
    const vantaEffect = useRef<VantaEffect | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
            threshold: 0.1
        });
        if (vantaRef.current) observer.observe(vantaRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (isVisible && !vantaEffect.current && vantaRef.current) {
            vantaEffect.current = TRUNK({
                el: vantaRef.current,
                p5,
                mouseControls: false,
                touchControls: false,
                gyroControls: false,
                scale: 0.7,
                scaleMobile: 1.0,
                color: 0x2f2f2f,
                backgroundColor: 0xf8f7f7,
                backgroundAlpha: 0,
                chaos: 5
            });
        } else if (!isVisible && vantaEffect.current) {
            vantaEffect.current.destroy();
            vantaEffect.current = null;
        }
    }, [isVisible]);

    return (
        <div
            ref={vantaRef}
            className="absolute top-0 left-0 w-full h-full -z-9 opacity-[0.05] pointer-events-none"
        />
    );
};
