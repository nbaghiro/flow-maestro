import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../lib/api";

export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const tokenParam = searchParams.get("token");
        if (!tokenParam) {
            setError("Invalid or missing reset token. Please request a new password reset link.");
        } else {
            setToken(tokenParam);
        }
    }, [searchParams]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validation
        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!token) {
            setError("Invalid reset token.");
            return;
        }

        setIsLoading(true);

        try {
            await resetPassword(token, password);
            setSuccess(true);
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (err: unknown) {
            setError(
                (err as Error).message || "Failed to reset password. The link may have expired."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-lg mb-4">
                            <span className="text-white font-bold text-2xl">FM</span>
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Reset your password
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your new password below.
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <p className="font-medium">Password reset successful!</p>
                                <p className="mt-1">Redirecting to login page...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    {!success && token && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Must be at least 8 characters
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Resetting password...
                                    </>
                                ) : (
                                    "Reset password"
                                )}
                            </button>
                        </form>
                    )}

                    {/* Back to Login Link */}
                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm text-primary hover:underline font-medium"
                        >
                            Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
