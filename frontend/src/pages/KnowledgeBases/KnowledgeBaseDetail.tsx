import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useKnowledgeBaseStore } from "../../stores/knowledgeBaseStore";
import { wsClient } from "../../lib/websocket";
import {
    BookOpen,
    Upload,
    Link as LinkIcon,
    ArrowLeft,
    FileText,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";

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
    } = useKnowledgeBaseStore();

    const [showUrlModal, setShowUrlModal] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [urlNameInput, setUrlNameInput] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchKnowledgeBase(id);
            fetchDocuments(id);
            fetchStats(id);
        }
    }, [id]);

    // Subscribe to document processing events for realtime updates
    useEffect(() => {
        if (!id) return;

        const handleDocumentCompleted = (event: any) => {
            // Check if this event is for the current KB
            if (event.knowledgeBaseId === id) {
                console.log("Document completed, refreshing stats and documents...", event);
                // Refresh both stats and documents list
                fetchStats(id);
                fetchDocuments(id);
            }
        };

        const handleDocumentFailed = (event: any) => {
            // Check if this event is for the current KB
            if (event.knowledgeBaseId === id) {
                console.log("Document failed, refreshing documents...", event);
                // Refresh documents to show failed status
                fetchDocuments(id);
            }
        };

        // Subscribe to WebSocket events
        wsClient.on("kb:document:completed", handleDocumentCompleted);
        wsClient.on("kb:document:failed", handleDocumentFailed);

        // Cleanup on unmount
        return () => {
            wsClient.off("kb:document:completed", handleDocumentCompleted);
            wsClient.off("kb:document:failed", handleDocumentFailed);
        };
    }, [id, fetchStats, fetchDocuments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !id) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            await uploadDoc(id, file);
            // Refresh stats after upload
            fetchStats(id);
        } catch (error) {
            console.error("Failed to upload file:", error);
        } finally {
            setUploading(false);
            e.target.value = ""; // Reset input
        }
    };

    const handleAddUrl = async () => {
        if (!urlInput.trim() || !id) return;

        setUploading(true);
        try {
            await addUrl(id, urlInput, urlNameInput || undefined);
            setShowUrlModal(false);
            setUrlInput("");
            setUrlNameInput("");
            // Refresh stats after adding URL
            fetchStats(id);
        } catch (error) {
            console.error("Failed to add URL:", error);
        } finally {
            setUploading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "ready":
                return <CheckCircle className="w-4 h-4 text-green-600" />;
            case "processing":
                return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
            case "failed":
                return <XCircle className="w-4 h-4 text-red-600" />;
            case "pending":
                return <Clock className="w-4 h-4 text-yellow-600" />;
            default:
                return null;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "ready":
                return "Ready";
            case "processing":
                return "Processing...";
            case "failed":
                return "Failed";
            case "pending":
                return "Pending";
            default:
                return status;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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

            {/* Upload Section */}
            <div className="border border-border rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Add Documents</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload */}
                    <label className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors cursor-pointer">
                        <input
                            type="file"
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.doc,.txt,.md,.html,.json,.csv"
                            className="hidden"
                            disabled={uploading}
                        />
                        <div className="text-center">
                            {uploading ? (
                                <>
                                    <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="font-medium mb-1">Upload File</p>
                                    <p className="text-xs text-muted-foreground">
                                        PDF, DOCX, TXT, MD, HTML, JSON, CSV
                                    </p>
                                </>
                            )}
                        </div>
                    </label>

                    {/* Add URL */}
                    <button
                        onClick={() => setShowUrlModal(true)}
                        disabled={uploading}
                        className="border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="text-center">
                            <LinkIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="font-medium mb-1">Add from URL</p>
                            <p className="text-xs text-muted-foreground">
                                Scrape content from a website
                            </p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Documents List */}
            <div className="border border-border rounded-lg">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold">Documents</h2>
                </div>

                {currentDocuments.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No documents yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Upload a file or add a URL to get started
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {currentDocuments.map((doc) => (
                            <div key={doc.id} className="p-4 hover:bg-muted/50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{doc.name}</span>
                                            <span className="text-xs text-muted-foreground uppercase">
                                                {doc.file_type}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>
                                                {doc.file_size
                                                    ? formatFileSize(Number(doc.file_size))
                                                    : "N/A"}
                                            </span>
                                            <span>
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </span>
                                            {doc.source_type === "url" && doc.source_url && (
                                                <a
                                                    href={doc.source_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    View Source
                                                </a>
                                            )}
                                        </div>

                                        {doc.error_message && (
                                            <p className="text-sm text-red-600 mt-1">
                                                {doc.error_message}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        {getStatusIcon(doc.status)}
                                        <span className="text-sm">{getStatusText(doc.status)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add URL Modal */}
            {showUrlModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Add from URL</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">URL *</label>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/article"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={urlNameInput}
                                    onChange={(e) => setUrlNameInput(e.target.value)}
                                    placeholder="Article Name"
                                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowUrlModal(false);
                                    setUrlInput("");
                                    setUrlNameInput("");
                                }}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                disabled={uploading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddUrl}
                                disabled={!urlInput.trim() || uploading}
                                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? "Adding..." : "Add URL"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
