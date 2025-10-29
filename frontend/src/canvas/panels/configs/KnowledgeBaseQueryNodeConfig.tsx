import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface KnowledgeBaseQueryNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

interface KnowledgeBase {
    id: string;
    name: string;
    description: string;
}

export function KnowledgeBaseQueryNodeConfig({ data, onUpdate }: KnowledgeBaseQueryNodeConfigProps) {
    const [knowledgeBaseId, setKnowledgeBaseId] = useState(data.config?.knowledgeBaseId || "");
    const [queryText, setQueryText] = useState(data.config?.queryText || "");
    const [topK, setTopK] = useState(data.config?.topK || 5);
    const [similarityThreshold, setSimilarityThreshold] = useState(
        data.config?.similarityThreshold || 0.7
    );
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    // Fetch available knowledge bases
    const { data: kbData, isLoading } = useQuery({
        queryKey: ["knowledge-bases"],
        queryFn: async () => {
            const response = await axios.get("/api/knowledge-bases");
            return response.data.data as KnowledgeBase[];
        },
    });

    useEffect(() => {
        // Find the selected KB name
        const selectedKB = kbData?.find((kb) => kb.id === knowledgeBaseId);

        onUpdate({
            knowledgeBaseId,
            knowledgeBaseName: selectedKB?.name || "",
            queryText,
            topK,
            similarityThreshold,
            outputVariable,
        });
    }, [knowledgeBaseId, queryText, topK, similarityThreshold, outputVariable, kbData]);

    return (
        <div>
            <FormSection title="Knowledge Base">
                <FormField
                    label="Select Knowledge Base"
                    description="Choose which knowledge base to search"
                >
                    {isLoading ? (
                        <div className="text-sm text-muted-foreground">Loading knowledge bases...</div>
                    ) : kbData && kbData.length > 0 ? (
                        <select
                            value={knowledgeBaseId}
                            onChange={(e) => setKnowledgeBaseId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Select a knowledge base...</option>
                            {kbData.map((kb) => (
                                <option key={kb.id} value={kb.id}>
                                    {kb.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                No knowledge bases found.
                            </div>
                            <a
                                href="/knowledge-bases"
                                className="inline-block text-sm text-primary hover:underline"
                            >
                                Create your first knowledge base →
                            </a>
                        </div>
                    )}
                </FormField>
            </FormSection>

            <FormSection title="Query">
                <FormField
                    label="Query Text"
                    description="The text to search for. Supports variables like {{input.query}}"
                >
                    <textarea
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        placeholder='What is the purpose of this system?
Or use: {{input.question}}'
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                </FormField>

                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                        <strong>Tip:</strong> Use variables like{" "}
                        <code className="px-1 bg-blue-100 rounded">{"{{input.query}}"}</code> to make
                        the query dynamic based on workflow inputs.
                    </p>
                </div>
            </FormSection>

            <FormSection title="Search Parameters">
                <FormField
                    label="Number of Results (Top K)"
                    description="How many relevant chunks to return (1-20)"
                >
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={topK}
                            onChange={(e) => setTopK(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Fewer results</span>
                            <span className="font-medium">{topK} results</span>
                            <span className="text-muted-foreground">More results</span>
                        </div>
                    </div>
                </FormField>

                <FormField
                    label="Similarity Threshold"
                    description="Minimum similarity score (0.0 - 1.0). Higher = more relevant."
                >
                    <div className="space-y-2">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={similarityThreshold}
                            onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">More results</span>
                            <span className="font-medium">{(similarityThreshold * 100).toFixed(0)}%</span>
                            <span className="text-muted-foreground">Higher quality</span>
                        </div>
                    </div>
                </FormField>

                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-700">
                        <strong>How it works:</strong> The node will search the knowledge base using
                        semantic similarity and return the most relevant chunks. Use the{" "}
                        <code className="px-1 bg-gray-100 rounded">combinedText</code> output to
                        include context in LLM prompts.
                    </p>
                </div>
            </FormSection>

            <FormSection title="Output">
                <div className="space-y-3">
                    <div className="text-sm">
                        <div className="font-medium mb-2">Available Outputs:</div>
                        <div className="space-y-1 text-muted-foreground">
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">results</code> - Array of
                                all matches
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">topResult</code> - Best
                                match
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">combinedText</code> -
                                Formatted text for prompts
                            </div>
                            <div>
                                • <code className="px-1 bg-gray-100 rounded">count</code> - Number of
                                results
                            </div>
                        </div>
                    </div>

                    <OutputSettingsSection
                        nodeName={data.label || "KB Query"}
                        nodeType="knowledgeBaseQuery"
                        value={outputVariable}
                        onChange={setOutputVariable}
                    />
                </div>
            </FormSection>
        </div>
    );
}
