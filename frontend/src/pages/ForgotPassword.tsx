import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../lib/api";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);
        setIsLoading(true);

        try {
            await forgotPassword(email);
            setSuccess(true);
            setEmail("");
        } catch (err: unknown) {
            setError(
                (err as Error).message || "Failed to send reset email. Please try again later."
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
                            Forgot password?
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email address and we'll send you a link to reset your
                            password.
                        </p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-800">
                                <p className="font-medium">Check your email</p>
                                <p className="mt-1">
                                    If an account exists with this email, you will receive a
                                    password reset link shortly.
                                </p>
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
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="you@example.com"
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
                                    Sending...
                                </>
                            ) : (
                                "Send reset link"
                            )}
                        </button>
                    </form>

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
