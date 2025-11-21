import { useState, useEffect } from "react";
import {
    LLM_PROVIDERS,
    LLM_MODELS_BY_PROVIDER,
    getDefaultModelForProvider
} from "@flowmaestro/shared";
import { Select } from "../../../components/common/Select";
import { ConnectionPicker } from "../../../components/connections/ConnectionPicker";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";
import { Slider } from "../../../components/Slider";

interface LLMNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

export function LLMNodeConfig({ data, onUpdate }: LLMNodeConfigProps) {
    const [provider, setProvider] = useState((data.provider as string) || "openai");
    const [model, setModel] = useState(
        (data.model as string) || getDefaultModelForProvider((data.provider as string) || "openai")
    );
    const [connectionId, setConnectionId] = useState<string | null>(
        (data.connectionId as string) || null
    );
    const [systemPrompt, setSystemPrompt] = useState((data.systemPrompt as string) || "");
    const [prompt, setPrompt] = useState((data.prompt as string) || "");
    const [temperature, setTemperature] = useState((data.temperature as number) || 0.7);
    const [maxTokens, setMaxTokens] = useState((data.maxTokens as number) || 1000);
    const [topP, setTopP] = useState((data.topP as number) || 1);
    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

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
            outputVariable
        });
    }, [
        provider,
        model,
        connectionId,
        systemPrompt,
        prompt,
        temperature,
        maxTokens,
        topP,
        outputVariable
    ]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        const defaultModel = getDefaultModelForProvider(newProvider);
        if (defaultModel) {
            setModel(defaultModel);
        }
        // Reset connection since it's provider-specific
        setConnectionId(null);
    };

    return (
        <div>
            <FormSection title="Model Configuration">
                <FormField label="Provider">
                    <Select
                        value={provider}
                        onChange={handleProviderChange}
                        options={LLM_PROVIDERS}
                    />
                </FormField>

                <FormField label="Model">
                    <Select
                        value={model}
                        onChange={setModel}
                        options={
                            LLM_MODELS_BY_PROVIDER[
                                provider as keyof typeof LLM_MODELS_BY_PROVIDER
                            ] || []
                        }
                    />
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

                <FormField label="Max Tokens" description="Maximum length of the response">
                    <input
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
                        min={1}
                        max={32000}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>

                <FormField label="Top P" description="Nucleus sampling threshold">
                    <Slider value={topP} onChange={setTopP} min={0} max={1} step={0.05} />
                </FormField>
            </FormSection>

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "LLM"}
                    nodeType="llm"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
