import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ConnectionsGrid, type Provider } from "../connections/ConnectionsGrid";
import { NewConnectionDialog } from "../connections/NewConnectionDialog";
import { ConnectionDetailsDialog } from "../connections/ConnectionDetailsDialog";
import { useConnectionStore } from "../../stores/connectionStore";
import { ALL_PROVIDERS } from "../../lib/providers";
import type { Connection } from "../../lib/api";

interface AddMCPIntegrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddMCPIntegrationDialog({ isOpen, onClose }: AddMCPIntegrationDialogProps) {
    const { fetchConnections } = useConnectionStore();
    const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [isNewConnectionDialogOpen, setIsNewConnectionDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConnections();
        }
    }, [isOpen, fetchConnections]);

    // Filter providers to only those with MCP servers
    const mcpProviders = ALL_PROVIDERS.filter((provider) => {
        return !!provider.mcpServerUrl;
    });

    const handleConnect = (provider: Provider) => {
        setSelectedProvider(provider);
        setIsNewConnectionDialogOpen(true);
    };

    const handleViewDetails = (connection: Connection) => {
        setSelectedConnection(connection);
        setIsDetailsDialogOpen(true);
    };

    const handleConnectionSuccess = () => {
        fetchConnections();
        setIsNewConnectionDialogOpen(false);
        setSelectedProvider(null);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[85vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">
                                Add MCP Integration
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Connect to external services to add tools to your agent
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {mcpProviders.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">
                                    No MCP servers available at this time.
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Please check back later or add a custom MCP server.
                                </p>
                            </div>
                        ) : (
                            <ConnectionsGrid
                                providers={mcpProviders}
                                onConnect={handleConnect}
                                onViewDetails={handleViewDetails}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* New Connection Dialog */}
            {selectedProvider && (
                <NewConnectionDialog
                    isOpen={isNewConnectionDialogOpen}
                    onClose={() => {
                        setIsNewConnectionDialogOpen(false);
                        setSelectedProvider(null);
                    }}
                    provider={selectedProvider.provider}
                    providerDisplayName={selectedProvider.displayName}
                    providerIcon={
                        <img
                            src={selectedProvider.logoUrl}
                            alt={selectedProvider.displayName}
                            className="w-10 h-10 object-contain"
                        />
                    }
                    onSuccess={handleConnectionSuccess}
                    supportsOAuth={selectedProvider.methods.includes("oauth2")}
                    supportsApiKey={selectedProvider.methods.includes("api_key")}
                />
            )}

            {/* Connection Details Dialog */}
            {selectedConnection &&
                (() => {
                    const provider = ALL_PROVIDERS.find(
                        (p) => p.provider === selectedConnection.provider
                    );
                    return (
                        <ConnectionDetailsDialog
                            isOpen={isDetailsDialogOpen}
                            onClose={() => {
                                setIsDetailsDialogOpen(false);
                                setSelectedConnection(null);
                            }}
                            connection={selectedConnection}
                            providerDisplayName={
                                provider?.displayName || selectedConnection.provider
                            }
                            providerIcon={
                                provider ? (
                                    <img
                                        src={provider.logoUrl}
                                        alt={provider.displayName}
                                        className="w-10 h-10 object-contain"
                                    />
                                ) : undefined
                            }
                            onDisconnect={async () => {
                                await fetchConnections();
                                setIsDetailsDialogOpen(false);
                                setSelectedConnection(null);
                            }}
                        />
                    );
                })()}
        </>
    );
}
