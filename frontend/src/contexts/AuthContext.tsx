import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
    login as apiLogin,
    register as apiRegister,
    getCurrentUser,
    setAuthToken,
    clearAuthToken
} from "../lib/api";

interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in on mount
        const token = localStorage.getItem("auth_token");
        if (token) {
            // Validate token and restore user session
            getCurrentUser()
                .then((response) => {
                    if (response.success && response.data) {
                        setUser(response.data.user);
                    } else {
                        // Token is invalid, clear it
                        clearAuthToken();
                    }
                })
                .catch((error) => {
                    // Token is invalid or expired, clear it
                    console.error("Failed to validate token:", error);
                    clearAuthToken();
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await apiLogin(email, password);
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                setUser(response.data.user);
            } else {
                throw new Error(response.error || "Login failed");
            }
        } catch (error) {
            throw error;
        }
    };

    const register = async (email: string, password: string, name?: string) => {
        try {
            const response = await apiRegister(email, password, name);
            if (response.success && response.data) {
                setAuthToken(response.data.token);
                setUser(response.data.user);
            } else {
                throw new Error(response.error || "Registration failed");
            }
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        clearAuthToken();
        setUser(null);
    };

    const value = {
        user,
        isAuthenticated: !!user || !!localStorage.getItem("auth_token"),
        isLoading,
        login,
        register,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
