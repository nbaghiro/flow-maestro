import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { wsClient } from "../lib/websocket";
import { useExecutionEventHandlers } from "../hooks/useExecutionEventHandlers";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();

    // Set up WebSocket event handlers for execution monitoring
    useExecutionEventHandlers();

    // Initialize WebSocket connection when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const token = localStorage.getItem("auth_token");
            if (token) {
                wsClient.connect(token).catch((error) => {
                    console.error("Failed to connect WebSocket:", error);
                });
            }
        }

        return () => {
            // Disconnect when component unmounts or user logs out
            if (!isAuthenticated) {
                wsClient.disconnect();
            }
        };
    }, [isAuthenticated]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
