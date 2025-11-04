import { ReactNode, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
    content: string;
    children: ReactNode;
    delay?: number;
}

export function Tooltip({ content, children, delay = 300 }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top + rect.height / 2,
                left: rect.right + 8 // 8px gap
            });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <>
            <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                {children}
            </div>
            {isVisible &&
                createPortal(
                    <div
                        className="fixed z-50 pointer-events-none animate-in fade-in duration-150"
                        style={{
                            top: position.top,
                            left: position.left,
                            transform: "translateY(-50%)"
                        }}
                    >
                        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-nowrap">
                            {content}
                            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}
