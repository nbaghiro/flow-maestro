import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKnowledgeBaseStore } from "../../stores/knowledgeBaseStore";
import { BookOpen, Plus, Trash2, FileText, Loader2 } from "lucide-react";

export function KnowledgeBaseList() {
    const navigate = useNavigate();
    const { knowledgeBases, loading, error, fetchKnowledgeBases, deleteKB } = useKnowledgeBaseStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKBName, setNewKBName] = useState("");
    const [newKBDescription, setNewKBDescription] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const { createKB } = useKnowledgeBaseStore();

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    const handleCreate = async () => {
        if (!newKBName.trim()) return;

        try {
            const kb = await createKB({
                name: newKBName,
                description: newKBDescription || undefined,
            });
            setShowCreateModal(false);
            setNewKBName("");
            setNewKBDescription("");
            navigate(`/knowledge-bases/${kb.id}`);
        } catch (error) {
            console.error("Failed to create knowledge base:", error);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        setDeletingId(deleteConfirm.id);
        try {
            await deleteKB(deleteConfirm.id);
            // Refresh the list after deletion
            await fetchKnowledgeBases();
            setDeleteConfirm(null);
        } catch (error) {
            console.error("Failed to delete knowledge base:", error);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Knowledge Bases</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your document collections for RAG workflows
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Knowledge Base
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && !knowledgeBases.length && (
                <div className="text-center py-12">
                    <div className="text-muted-foreground">Loading knowledge bases...</div>
                </div>
            )}

            {/* Empty State */}
            {!loading && knowledgeBases.length === 0 && (
                <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Knowledge Bases</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Create your first knowledge base to start uploading documents
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Create Knowledge Base
                    </button>
                </div>
            )}

            {/* Knowledge Base Grid */}
            {!loading && knowledgeBases.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {knowledgeBases.map((kb) => (
                        <div
                            key={kb.id}
                            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => navigate(`/knowledge-bases/${kb.id}`)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold">{kb.name}</h3>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirm({ id: kb.id, name: kb.name });
                                    }}
                                    disabled={deletingId === kb.id}
                                    className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                >
                                    <Trash2 className={`w-4 h-4 text-red-600 ${deletingId === kb.id ? 'animate-pulse' : ''}`} />
                                </button>
                            </div>

                            {kb.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {kb.description}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>Documents</span>
                                </div>
                                <div>
                                    {kb.config.embeddingModel}
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-muted-foreground">
                                Created {new Date(kb.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Create Knowledge Base</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newKBName}
                                    onChange={(e) => setNewKBName(e.target.value)}
                                    placeholder="My Knowledge Base"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newKBDescription}
                                    onChange={(e) => setNewKBDescription(e.target.value)}
                                    placeholder="What is this knowledge base for?"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setNewKBName("");
                                    setNewKBDescription("");
                                }}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!newKBName.trim()}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Delete Knowledge Base</h2>
                        <p className="text-muted-foreground mb-6">
                            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will delete all documents and embeddings.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                disabled={deletingId === deleteConfirm.id}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deletingId === deleteConfirm.id}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deletingId === deleteConfirm.id ? (
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
