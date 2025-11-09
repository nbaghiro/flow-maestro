import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./App.css";

// Create a client for TanStack Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000 // 5 minutes
        }
    }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </QueryClientProvider>
        </BrowserRouter>
    </React.StrictMode>
);
