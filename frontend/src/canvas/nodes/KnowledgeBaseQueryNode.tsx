import { memo } from "react";
import { NodeProps } from "reactflow";
import { BaseNode } from "./BaseNode";
import { BookOpen } from "lucide-react";

interface KnowledgeBaseQueryNodeData {
    label: string;
    status?: "idle" | "pending" | "running" | "success" | "error";
    config?: {
        knowledgeBaseId?: string;
        knowledgeBaseName?: string;
        queryText?: string;
        topK?: number;
        similarityThreshold?: number;
    };
}

function KnowledgeBaseQueryNode({ data, selected }: NodeProps<KnowledgeBaseQueryNodeData>) {
    const kbName = data.config?.knowledgeBaseName || "No KB selected";
    const topK = data.config?.topK || 5;
    const threshold = data.config?.similarityThreshold || 0.7;
    const queryPreview = data.config?.queryText
        ? data.config.queryText.substring(0, 30) + (data.config.queryText.length > 30 ? "..." : "")
        : "No query set";

    return (
        <BaseNode
            icon={BookOpen}
            label={data.label || "KB Query"}
            status={data.status}
            category="data"
            selected={selected}
        >
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Knowledge Base:</span>
                    <span className="text-xs font-medium truncate max-w-[120px]" title={kbName}>
                        {kbName}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Query:</span>
                    <span className="text-xs font-medium truncate max-w-[120px]" title={data.config?.queryText}>
                        {queryPreview}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Results:</span>
                    <span className="text-xs font-medium">
                        {topK} (≥{(threshold * 100).toFixed(0)}%)
                    </span>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(KnowledgeBaseQueryNode);
