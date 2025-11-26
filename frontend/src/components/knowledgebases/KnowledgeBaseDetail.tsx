import { BookOpen, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { wsClient } from "../../lib/websocket";
import { useKnowledgeBaseStore } from "../../stores/knowledgeBaseStore";
import { AddUrlModal } from "./AddUrlModal";
import { DeleteDocumentModal } from "./DeleteDocumentModal";
import { DeleteKnowledgeBaseModal } from "./DeleteKnowledgeBaseModal";
import { DocumentList } from "./DocumentList";
import { SearchSection } from "./SearchSection";
import { UploadSection } from "./UploadSection";

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function KnowledgeBaseDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        currentKB,
        currentDocuments,
        currentStats,
        loading,
        fetchKnowledgeBase,
        fetchDocuments,
        fetchStats,
        uploadDoc,
        addUrl,
        deleteDoc,
        reprocessDoc,
        query,
        deleteKB
    } = useKnowledgeBaseStore();

    const [showUrlModal, setShowUrlModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);
    const [showDeleteKBModal, setShowDeleteKBModal] = useState(false);
    const [deletingKB, setDeletingKB] = useState(false);

    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            fetchKnowledgeBase(id);
            fetchDocuments(id);
            fetchStats(id);
        }
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        wsClient.connect(token).catch(console.error);

        const handleDocumentProcessing = () => {
            fetchDocuments(id);
        };

        const handleDocumentCompleted = () => {
            fetchDocuments(id);
            fetchStats(id);
        };

        const handleDocumentFailed = () => {
            fetchDocuments(id);
        };

        wsClient.on("kb:document:processing", handleDocumentProcessing);
        wsClient.on("kb:document:completed", handleDocumentCompleted);
        wsClient.on("kb:document:failed", handleDocumentFailed);

        pollingIntervalRef.current = setInterval(() => {
            fetchDocuments(id);
            fetchStats(id);
        }, 5000);

        return () => {
            wsClient.off("kb:document:processing", handleDocumentProcessing);
            wsClient.off("kb:document:completed", handleDocumentCompleted);
            wsClient.off("kb:document:failed", handleDocumentFailed);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [id, fetchDocuments, fetchStats]);

    const handleFileUpload = async (file: File) => {
        if (!id) return;

        setUploading(true);
        try {
            await uploadDoc(id, file);
            fetchStats(id);
        } catch (error) {
            console.error("Failed to upload file:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleAddUrl = async (url: string, name?: string) => {
        if (!id) return;

        setUploading(true);
        try {
            await addUrl(id, url, name);
            setShowUrlModal(false);
            fetchStats(id);
        } catch (error) {
            console.error("Failed to add URL:", error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!id || !deleteConfirmDocId) return;

        setProcessingDocId(deleteConfirmDocId);
        try {
            await deleteDoc(id, deleteConfirmDocId);
            setDeleteConfirmDocId(null);
        } catch (error) {
            console.error("Failed to delete document:", error);
        } finally {
            setProcessingDocId(null);
        }
    };

    const handleReprocessDocument = async (docId: string) => {
        if (!id) return;

        setProcessingDocId(docId);
        try {
            await reprocessDoc(id, docId);
        } catch (error) {
            console.error("Failed to reprocess document:", error);
        } finally {
            setProcessingDocId(null);
        }
    };

    const handleSearch = async (searchQuery: string, topK: number, similarityThreshold: number) => {
        if (!id) return [];

        return await query(id, {
            query: searchQuery,
            top_k: topK,
            similarity_threshold: similarityThreshold
        });
    };

    const handleDeleteKnowledgeBase = async () => {
        if (!id) return;

        setDeletingKB(true);
        try {
            await deleteKB(id);
            navigate("/knowledge-bases");
        } catch (error) {
            console.error("Failed to delete knowledge base:", error);
            setDeletingKB(false);
        }
    };

    if (loading && !currentKB) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                    <p className="text-muted-foreground mt-2">Loading knowledge base...</p>
                </div>
            </div>
        );
    }

    if (!currentKB) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <p className="text-red-600">Knowledge base not found</p>
                    <button
                        onClick={() => navigate("/knowledge-bases")}
                        className="mt-4 text-primary hover:underline"
                    >
                        Back to Knowledge Bases
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate("/knowledge-bases")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Knowledge Bases
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl font-bold">{currentKB.name}</h1>
                        </div>
                        {currentKB.description && (
                            <p className="text-muted-foreground">{currentKB.description}</p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowDeleteKBModal(true)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete knowledge base"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {currentStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">Documents</div>
                        <div className="text-2xl font-bold">{currentStats.document_count}</div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">Chunks</div>
                        <div className="text-2xl font-bold">{currentStats.chunk_count}</div>
                    </div>
                    <div className="border border-border rounded-lg p-4">
                        <div className="text-sm text-muted-foreground mb-1">Total Size</div>
                        <div className="text-2xl font-bold">
                            {formatFileSize(currentStats.total_size_bytes)}
                        </div>
                    </div>
                </div>
            )}

            {/* Search Section */}
            <SearchSection
                knowledgeBaseId={id || ""}
                documents={currentDocuments}
                onSearch={handleSearch}
            />

            {/* Upload Section */}
            <UploadSection
                onFileUpload={handleFileUpload}
                onAddUrlClick={() => setShowUrlModal(true)}
                isUploading={uploading}
            />

            {/* Documents List */}
            <DocumentList
                documents={currentDocuments}
                onDeleteClick={setDeleteConfirmDocId}
                onReprocess={handleReprocessDocument}
                processingDocId={processingDocId}
            />

            {/* Modals */}
            <AddUrlModal
                isOpen={showUrlModal}
                onClose={() => setShowUrlModal(false)}
                onSubmit={handleAddUrl}
                isLoading={uploading}
            />

            <DeleteDocumentModal
                isOpen={deleteConfirmDocId !== null}
                onClose={() => setDeleteConfirmDocId(null)}
                onConfirm={handleDeleteDocument}
                isLoading={processingDocId === deleteConfirmDocId}
            />

            <DeleteKnowledgeBaseModal
                isOpen={showDeleteKBModal}
                onClose={() => setShowDeleteKBModal(false)}
                onConfirm={handleDeleteKnowledgeBase}
                isLoading={deletingKB}
                knowledgeBaseName={currentKB.name}
            />
        </div>
    );
}
