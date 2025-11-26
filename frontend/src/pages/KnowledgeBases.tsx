import { BookOpen, Plus, Trash2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateKnowledgeBaseModal, DeleteKnowledgeBaseModal } from "../components/knowledgebases";
import { useKnowledgeBaseStore } from "../stores/knowledgeBaseStore";

export function KnowledgeBases() {
    const navigate = useNavigate();
    const { knowledgeBases, loading, error, fetchKnowledgeBases, createKB, deleteKB } =
        useKnowledgeBaseStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    const handleCreate = async (name: string, description?: string) => {
        try {
            const kb = await createKB({
                name,
                description
            });
            setShowCreateModal(false);
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
                                    <Trash2
                                        className={`w-4 h-4 text-red-600 ${deletingId === kb.id ? "animate-pulse" : ""}`}
                                    />
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
                                <div>{kb.config.embeddingModel}</div>
                            </div>

                            <div className="mt-3 text-xs text-muted-foreground">
                                Created {new Date(kb.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <CreateKnowledgeBaseModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
            />

            {/* Delete Confirmation Modal */}
            <DeleteKnowledgeBaseModal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                isLoading={deletingId === deleteConfirm?.id}
                knowledgeBaseName={deleteConfirm?.name || ""}
            />
        </div>
    );
}
