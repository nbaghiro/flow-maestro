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
    Trash2,
    RefreshCw,
    Search
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChunkSearchResult } from "../../lib/api";
import { wsClient } from "../../lib/websocket";
import { useKnowledgeBaseStore } from "../../stores/knowledgeBaseStore";

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
    const [urlInput, setUrlInput] = useState("");
    const [urlNameInput, setUrlNameInput] = useState("");
    const [uploading, setUploading] = useState(false);
    const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);
    const [processingDocId, setProcessingDocId] = useState<string | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ChunkSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showDeleteKBModal, setShowDeleteKBModal] = useState(false);
    const [deletingKB, setDeletingKB] = useState(false);

    // Polling interval ref
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (id) {
            fetchKnowledgeBase(id);
            fetchDocuments(id);
            fetchStats(id);
        }
    }, [id]);

    // Set up WebSocket listeners and polling for document updates
    useEffect(() => {
        if (!id) return;

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        // Connect WebSocket if not already connected
        wsClient.connect(token).catch(console.error);

        // Listen for document processing events
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

        // Register WebSocket event handlers
        wsClient.on("kb:document:processing", handleDocumentProcessing);
        wsClient.on("kb:document:completed", handleDocumentCompleted);
        wsClient.on("kb:document:failed", handleDocumentFailed);

        // Set up polling as fallback (every 5 seconds)
        pollingIntervalRef.current = setInterval(() => {
            fetchDocuments(id);
            fetchStats(id);
        }, 5000);

        // Cleanup
        return () => {
            wsClient.off("kb:document:processing", handleDocumentProcessing);
            wsClient.off("kb:document:completed", handleDocumentCompleted);
            wsClient.off("kb:document:failed", handleDocumentFailed);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [id, fetchDocuments, fetchStats]);

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

    const handleDeleteDocument = async (docId: string) => {
        if (!id) return;

        setProcessingDocId(docId);
        try {
            await deleteDoc(id, docId);
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

    const handleSearch = async () => {
        if (!searchQuery.trim() || !id) return;

        setSearching(true);
        setShowSearchResults(true);
        try {
            const results = await query(id, {
                query: searchQuery
            });
            setSearchResults(results);
        } catch (error) {
            console.error("Failed to search knowledge base:", error);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSearch();
        }
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
            <div className="border border-border rounded-lg p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Search className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Search Knowledge Base</h2>
                </div>

                <div className="space-y-4">
                    {/* Search Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            placeholder="Ask a question or search for information..."
                            className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={!searchQuery.trim() || searching}
                            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Search"
                        >
                            {searching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    {/* Search Results */}
                    {showSearchResults && (
                        <div className="mt-6 border-t border-border pt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">
                                    Search Results
                                    {searchResults.length > 0 && (
                                        <span className="text-sm text-muted-foreground ml-2">
                                            ({searchResults.length}{" "}
                                            {searchResults.length === 1 ? "result" : "results"})
                                        </span>
                                    )}
                                </h3>
                                <button
                                    onClick={() => setShowSearchResults(false)}
                                    className="text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Hide
                                </button>
                            </div>

                            {searching ? (
                                <div className="text-center py-8">
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Searching...
                                    </p>
                                </div>
                            ) : searchResults.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No results found</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Try adjusting your query or lowering the similarity
                                        threshold
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {searchResults.map((result, index) => (
                                        <div
                                            key={result.id}
                                            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        #{index + 1}
                                                    </span>
                                                    <span className="text-sm font-medium">
                                                        {result.document_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Chunk {result.chunk_index + 1}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-medium text-primary">
                                                        {(result.similarity * 100).toFixed(1)}%
                                                        match
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-sm text-foreground leading-relaxed">
                                                {result.content}
                                            </div>

                                            {result.metadata &&
                                                Object.keys(result.metadata).length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {(() => {
                                                            const meta = result.metadata as Record<
                                                                string,
                                                                unknown
                                                            >;
                                                            return (
                                                                <>
                                                                    {meta.page && (
                                                                        <span className="text-xs px-2 py-1 bg-muted rounded">
                                                                            Page {String(meta.page)}
                                                                        </span>
                                                                    )}
                                                                    {meta.section && (
                                                                        <span className="text-xs px-2 py-1 bg-muted rounded">
                                                                            {String(meta.section)}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                        <strong>Tip:</strong> Use semantic search to find relevant information
                        across all your documents. Press Enter to search.
                    </div>
                </div>
            </div>

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
                                            <span className="font-medium">
                                                {doc.source_type === "url" && doc.source_url
                                                    ? doc.source_url
                                                    : doc.name}
                                            </span>
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

                                    <div className="flex items-center gap-3 ml-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(doc.status)}
                                            <span className="text-sm">
                                                {getStatusText(doc.status)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {doc.status === "failed" && (
                                                <button
                                                    onClick={() => handleReprocessDocument(doc.id)}
                                                    disabled={processingDocId === doc.id}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Reprocess document"
                                                >
                                                    {processingDocId === doc.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeleteConfirmDocId(doc.id)}
                                                disabled={processingDocId === doc.id}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete document"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
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

            {/* Delete Document Confirmation Modal */}
            {deleteConfirmDocId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Delete Document</h2>
                        <p className="text-muted-foreground mb-6">
                            Are you sure you want to delete this document? This action cannot be
                            undone and will remove all associated chunks and embeddings.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setDeleteConfirmDocId(null)}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                disabled={processingDocId === deleteConfirmDocId}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteDocument(deleteConfirmDocId)}
                                disabled={processingDocId === deleteConfirmDocId}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {processingDocId === deleteConfirmDocId ? (
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

            {/* Delete Knowledge Base Confirmation Modal */}
            {showDeleteKBModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-semibold mb-4">Delete Knowledge Base</h2>
                        <p className="text-muted-foreground mb-6">
                            Are you sure you want to delete <strong>{currentKB?.name}</strong>? This
                            action cannot be undone and will permanently delete all documents,
                            chunks, and embeddings in this knowledge base.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowDeleteKBModal(false)}
                                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                disabled={deletingKB}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteKnowledgeBase}
                                disabled={deletingKB}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {deletingKB ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    "Delete Knowledge Base"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
