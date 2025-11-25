import { X, Trash2 } from "lucide-react";
import { useState } from "react";

interface VersionPanelProps {
    open: boolean;
    onClose: () => void;
    versions: { id: string; name: string | null; createdAt: string }[];
    onRevert: (id: string) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newName: string) => void;
}

interface Version {
    id: string;
    name: string | null;
    createdAt: string;
}

export function VersionPanel({
    open,
    onClose,
    versions,
    onRevert,
    onDelete,
    onRename
}: VersionPanelProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmType, setConfirmType] = useState<"delete" | "revert" | null>(null);
    const [pendingVersion, setPendingVersion] = useState<Version | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState("");

    if (!open) return null;

    const triggerConfirm = (type: "delete" | "revert", version: Version) => {
        setConfirmType(type);
        setPendingVersion(version);
        setShowConfirm(true);
    };

    return (
        <div
            className={`
                absolute right-0 h-full w-[360px] bg-white border-l border-border shadow-xl z-50
                transform transition-transform duration-300
                flex flex-col
                ${open ? "translate-x-0" : "translate-x-full"}
            `}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-lg font-semibold">Versions</h2>

                <button
                    onClick={onClose}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Current Version */}
            <div className="px-4 py-4 border-b border-border bg-muted/30">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium">Current Version</p>
                        <div>
                            <p className="text-xs text-muted-foreground">
                                {versions[0]?.name || "Untitled Version"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {versions[0]?.createdAt}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {/* Older Versions Header */}
            {versions.length > 1 && (
                <div className="px-4 py-2 border-b border-border bg-muted/10 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Version History
                </div>
            )}
            {/* Content Placeholder */}
            <div className="p-4 pb-24 overflow-y-auto flex-1">
                {versions.length === 1 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No older versions yet.
                        <div className="text-xs mt-2">
                            Click “Save Version” to create your first checkpoint.
                        </div>
                    </div>
                ) : (
                    <div>
                        {versions.slice(1).map((v) => (
                            <div
                                key={v.id}
                                className={
                                    "p-3 border border-border rounded-lg bg-muted/20 hover:bg-muted/90 mb-2 cursor-pointer"
                                }
                                onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfirm("revert", v);
                                }}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col gap-1">
                                        {editingId === v.id ? (
                                            <input
                                                autoFocus
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onBlur={() => {
                                                    onRename(v.id, editingValue);
                                                    setEditingId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        onRename(v.id, editingValue);
                                                        setEditingId(null);
                                                    }
                                                    if (e.key === "Escape") {
                                                        setEditingId(null);
                                                    }
                                                }}
                                                className="text-sm font-medium border px-1 py-0.5 rounded w-full bg-white"
                                            />
                                        ) : (
                                            <span
                                                className="font-medium cursor-text"
                                                onClick={() => {
                                                    setEditingId(v.id);
                                                    setEditingValue(v.name || "");
                                                }}
                                            >
                                                {v.name || "Untitled Version"}
                                            </span>
                                        )}
                                        <p className="text-xs px-1 py-0.5 rounded bg-muted">
                                            {v.createdAt}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            triggerConfirm("delete", v);
                                        }}
                                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                                        title="Delete this version"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && pendingVersion && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white p-5 rounded-lg shadow-lg w-[300px] space-y-4">
                        {confirmType === "delete" && (
                            <>
                                <p className="text-sm">Delete this version?</p>
                                <p className="text-xs text-muted-foreground border-l-2 pl-2">
                                    {pendingVersion.name || "Untitled Version"}
                                    <br />
                                    {pendingVersion.createdAt}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    This will revert the workflow to the previous saved version.
                                </p>
                            </>
                        )}

                        {confirmType === "revert" && (
                            <>
                                <p className="text-sm font-medium">Revert to:</p>
                                <p className="text-xs text-muted-foreground border-l-2 pl-2">
                                    {pendingVersion.name || "Untitled Version"}
                                    <br />
                                    {pendingVersion.createdAt}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    This will replace the current workflow with this version.
                                </p>
                            </>
                        )}

                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-3 py-1 text-sm bg-muted rounded hover:bg-muted/70"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    if (confirmType === "delete") onDelete(pendingVersion.id);
                                    if (confirmType === "revert") onRevert(pendingVersion.id);
                                    setShowConfirm(false);
                                }}
                                className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 w-full p-3 border-t border-border bg-white">
                <button
                    onClick={() => console.log("Save version")}
                    className="w-full py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                    Save Version
                </button>
            </div>
        </div>
    );
}
