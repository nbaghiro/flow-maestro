import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { Slider } from "../../../components/Slider";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { ConnectionPicker } from "../../../components/connections/ConnectionPicker";

interface LLMNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const providers = [
    { value: "openai", label: "OpenAI" },
    { value: "anthropic", label: "Anthropic" },
    { value: "google", label: "Google" },
    { value: "cohere", label: "Cohere" },
];

const modelsByProvider: Record<string, Array<{ value: string; label: string }>> = {
    openai: [
        { value: "gpt-4", label: "GPT-4" },
        { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    ],
    anthropic: [
        { value: "claude-3-opus", label: "Claude 3 Opus" },
        { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
        { value: "claude-3-haiku", label: "Claude 3 Haiku" },
    ],
    google: [
        { value: "gemini-pro", label: "Gemini Pro" },
        { value: "gemini-ultra", label: "Gemini Ultra" },
    ],
    cohere: [
        { value: "command", label: "Command" },
        { value: "command-light", label: "Command Light" },
    ],
};

export function LLMNodeConfig({ data, onUpdate }: LLMNodeConfigProps) {
    const [provider, setProvider] = useState(data.config?.provider || "openai");
    const [model, setModel] = useState(data.config?.model || "gpt-4");
    const [connectionId, setConnectionId] = useState<string | null>(data.config?.connectionId || null);
    const [systemPrompt, setSystemPrompt] = useState(data.config?.systemPrompt || "");
    const [prompt, setPrompt] = useState(data.config?.prompt || "");
    const [temperature, setTemperature] = useState(data.config?.temperature || 0.7);
    const [maxTokens, setMaxTokens] = useState(data.config?.maxTokens || 1000);
    const [topP, setTopP] = useState(data.config?.topP || 1);
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    useEffect(() => {
        onUpdate({
            provider,
            model,
            connectionId,
            systemPrompt,
            prompt,
            temperature,
            maxTokens,
            topP,
            outputVariable,
        });
    }, [provider, model, connectionId, systemPrompt, prompt, temperature, maxTokens, topP, outputVariable]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        const models = modelsByProvider[newProvider];
        if (models && models.length > 0) {
            setModel(models[0].value);
        }
        // Reset connection since it's provider-specific
        setConnectionId(null);
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
                        {providers.map((p) => (
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
                        {modelsByProvider[provider]?.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <ConnectionPicker
                    provider={provider}
                    value={connectionId}
                    onChange={setConnectionId}
                    label="API Connection"
                    description="Select the API connection to use for authentication"
                    required
                    allowedMethods={["api_key", "oauth2"]}
                />
            </FormSection>

            <FormSection title="Prompts">
                <FormField
                    label="System Prompt"
                    description="Instructions for the AI model's behavior"
                >
                    <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="You are a helpful assistant..."
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                </FormField>

                <FormField
                    label="User Prompt"
                    description="Use ${variableName} to reference other node outputs"
                >
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter your prompt here..."
                        rows={6}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                    />
                </FormField>
            </FormSection>

            <FormSection title="Parameters">
                <FormField
                    label="Temperature"
                    description="Controls randomness (0 = deterministic, 2 = creative)"
                >
                    <Slider
                        value={temperature}
                        onChange={setTemperature}
                        min={0}
                        max={2}
                        step={0.1}
                    />
                </FormField>

                <FormField
                    label="Max Tokens"
                    description="Maximum length of the response"
                >
                    <input
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                        min={1}
                        max={32000}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>

                <FormField
                    label="Top P"
                    description="Nucleus sampling threshold"
                >
                    <Slider
                        value={topP}
                        onChange={setTopP}
                        min={0}
                        max={1}
                        step={0.05}
                    />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "LLM"}
                    nodeType="llm"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
