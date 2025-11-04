import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import {
    LLM_PROVIDERS,
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider
} from "@flowmaestro/shared";

interface EmbeddingsNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const dimensionsByModel: Record<string, number> = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
    "embed-english-v3.0": 1024,
    "embed-multilingual-v3.0": 1024,
    "textembedding-gecko": 768,
    "textembedding-gecko-multilingual": 768,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
    "sentence-transformers/all-mpnet-base-v2": 768
};

export function EmbeddingsNodeConfig({ data, onUpdate }: EmbeddingsNodeConfigProps) {
    const [provider, setProvider] = useState(data.provider || "openai");
    const [model, setModel] = useState(
        data.model || getDefaultModelForProvider(data.provider || "openai")
    );
    const [input, setInput] = useState(data.input || "");
    const [batchMode, setBatchMode] = useState(data.batchMode || false);
    const [outputVariable, setOutputVariable] = useState(data.outputVariable || "");

    const dimensions = dimensionsByModel[model] || 1536;

    useEffect(() => {
        onUpdate({
            provider,
            model,
            input,
            batchMode,
            dimensions,
            outputVariable
        });
    }, [provider, model, input, batchMode, dimensions, outputVariable]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        const defaultModel = getDefaultModelForProvider(newProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
    };

    return (
        <div>
            <FormSection title="Model Configuration">
                <FormField label="Provider">
                    <select
                        value={provider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {LLM_PROVIDERS.map((p) => (
                            <option key={p.value} value={p.value}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Model">
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {LLM_MODELS_BY_PROVIDER[provider]?.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField
                    label="Embedding Dimensions"
                    description="Vector dimensions for this model"
                >
                    <input
                        type="text"
                        value={dimensions}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Input">
                <FormField
                    label="Batch Mode"
                    description="Process multiple texts at once (one per line)"
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={batchMode}
                            onChange={(e) => setBatchMode(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Enable batch processing</span>
                    </label>
                </FormField>

                <FormField
                    label={batchMode ? "Text Inputs (one per line)" : "Text Input"}
                    description="Use ${variableName} to reference other node outputs"
                >
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            batchMode
                                ? "First text to embed\nSecond text to embed\nThird text to embed"
                                : "Enter text to generate embeddings..."
                        }
                        rows={batchMode ? 8 : 6}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Embeddings"}
                    nodeType="embeddings"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
