import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAgentStore } from "../stores/agentStore";
import { Plus, Bot, Trash2, MoreVertical, Calendar, Loader2, Edit2 } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";

export function Agents() {
    const navigate = useNavigate();
    const { agents, isLoading, error, fetchAgents, deleteAgent } = useAgentStore();
    const [agentToDelete, setAgentToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };

        if (openMenuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
        return undefined;
    }, [openMenuId]);

    const handleDeleteAgent = async () => {
        if (!agentToDelete) return;

        setIsDeleting(true);
        try {
            await deleteAgent(agentToDelete.id);
            await fetchAgents();
            setAgentToDelete(null);
        } catch (error) {
            console.error("Failed to delete agent:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <PageHeader
                title="Agents"
                description={`Create and manage AI agents that can use tools and workflows`}
                action={
                    <button
                        onClick={() => navigate("/agents/new")}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Agent
                    </button>
                }
            />

            {/* Error message */}
            {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {/* Agent Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading agents...</p>
                    </div>
                </div>
            ) : agents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-white">
                    <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No agents yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                        Create your first AI agent to automate tasks, answer questions, or execute workflows.
                    </p>
                    <button
                        onClick={() => navigate("/agents/new")}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Agent
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-white border border-border rounded-lg p-5 hover:border-primary hover:shadow-md transition-all group relative"
                        >
                            <div
                                onClick={() => navigate(`/agents/${agent.id}`)}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Bot className="w-5 h-5 text-primary" />
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {agent.provider}
                                        </span>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {agent.model}
                                        </span>

                                        {/* Menu Button */}
                                        <div className="relative" ref={openMenuId === agent.id ? menuRef : null}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === agent.id ? null : agent.id);
                                                }}
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                                title="More options"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === agent.id && (
                                                <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-lg py-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            navigate(`/agents/${agent.id}`);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(null);
                                                            setAgentToDelete(agent);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                                    {agent.name}
                                </h3>

                                {agent.description && (
                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {agent.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>Created {formatDate(agent.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            {agentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            Delete Agent
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to delete "{agentToDelete.name}"? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setAgentToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAgent}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
