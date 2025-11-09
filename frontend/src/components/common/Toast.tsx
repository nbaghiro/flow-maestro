import { CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
    isOpen: boolean;
    onClose: () => void;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

/**
 * Toast Notification Component
 *
 * Displays temporary notifications for success/error/warning messages
 */
export function Toast({ isOpen, onClose, type, title, message, duration = 5000 }: ToastProps) {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        error: <XCircle className="w-5 h-5 text-red-600" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-600" />,
        info: <AlertCircle className="w-5 h-5 text-blue-600" />
    };

    const colors = {
        success: "bg-green-50 border-green-200",
        error: "bg-red-50 border-red-200",
        warning: "bg-yellow-50 border-yellow-200",
        info: "bg-blue-50 border-blue-200"
    };

    const textColors = {
        success: "text-green-900",
        error: "text-red-900",
        warning: "text-yellow-900",
        info: "text-blue-900"
    };

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
            <div
                className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${colors[type]} min-w-[320px] max-w-md`}
            >
                <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>

                <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${textColors[type]}`}>{title}</p>
                    {message && (
                        <p className={`mt-1 text-sm ${textColors[type]} opacity-90`}>{message}</p>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className={`flex-shrink-0 ${textColors[type]} opacity-60 hover:opacity-100 transition-opacity`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
