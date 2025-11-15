import React, { useRef, useEffect } from "react";

export const ParticleAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d")!;
        let particles: {
            x: number;
            y: number;
            size: number;
            speedX: number;
            speedY: number;
        }[] = [];

        const resize = () => {
            const ratio = window.devicePixelRatio || 1;
            const parent = canvas.parentElement;
            const width = parent?.clientWidth ?? window.innerWidth;
            const height = parent?.clientHeight ?? window.innerHeight;
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(ratio, ratio);
            createParticles();
        };

        const createParticles = () => {
            particles = [];
            const numParticles = Math.floor((canvas.width * canvas.height) / 5000);
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 1.3 + 0.3,
                    speedX: (Math.random() - 0.5) * 0.2,
                    speedY: (Math.random() - 0.5) * 0.2
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "rgba(6,6,6,0.97)";
            particles.forEach((p) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                p.x += p.speedX;
                p.y += p.speedY;

                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
            });
            requestAnimationFrame(animate);
        };

        resize();
        animate();
        window.addEventListener("resize", resize);

        return () => window.removeEventListener("resize", resize);
    }, []);

    return <canvas ref={canvasRef} className="absolute top-0 w-full h-full pointer-events-none" />;
};
