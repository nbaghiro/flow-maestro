import { X, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

interface CustomMCPServer {
    name: string;
    url: string;
    apiKey?: string;
}

interface AddCustomMCPDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (server: CustomMCPServer) => Promise<void>;
}

export function AddCustomMCPDialog({ isOpen, onClose, onAdd }: AddCustomMCPDialogProps) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError("Server name is required");
            return;
        }

        if (!url.trim()) {
            setError("Server URL is required");
            return;
        }

        // Basic URL validation
        try {
            new URL(url);
        } catch {
            setError("Please enter a valid URL");
            return;
        }

        setIsAdding(true);
        try {
            await onAdd({
                name: name.trim(),
                url: url.trim(),
                apiKey: apiKey.trim() || undefined
            });

            // Reset form
            setName("");
            setUrl("");
            setApiKey("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add custom MCP server");
        } finally {
            setIsAdding(false);
        }
    };

    const handleClose = () => {
        if (!isAdding) {
            setName("");
            setUrl("");
            setApiKey("");
            setError(null);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">
                        Connect Custom MCP Server
                    </h3>
                    <button
                        onClick={handleClose}
                        disabled={isAdding}
                        className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    {/* Server Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Server Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Custom MCP Server"
                            disabled={isAdding}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg",
                                "bg-background border border-border",
                                "text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary",
                                "disabled:opacity-50"
                            )}
                        />
                    </div>

                    {/* Server URL */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Server URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://mcp.example.com"
                            disabled={isAdding}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg",
                                "bg-background border border-border",
                                "text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary",
                                "disabled:opacity-50"
                            )}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            HTTP/HTTPS endpoint where your MCP server is hosted
                        </p>
                    </div>

                    {/* API Key (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            API Key / Token (optional)
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="••••••••••••••••"
                            disabled={isAdding}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg",
                                "bg-background border border-border",
                                "text-foreground placeholder:text-muted-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary",
                                "disabled:opacity-50"
                            )}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Authentication credentials if required by your server
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isAdding}
                            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isAdding}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                "bg-primary text-primary-foreground",
                                "hover:bg-primary/90",
                                "disabled:opacity-50 flex items-center gap-2"
                            )}
                        >
                            {isAdding && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isAdding ? "Connecting..." : "Connect Server"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
