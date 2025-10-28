/**
 * Error Dialog Component
 * Custom dialog for displaying error messages
 */

import { X } from "lucide-react";

interface ErrorDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export function ErrorDialog({ isOpen, title, message, onClose }: ErrorDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    {message}
                </p>
                <div className="flex items-center justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
