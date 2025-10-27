import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { Slider } from "../../../components/Slider";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface AudioNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const providers = [
    { value: "openai", label: "OpenAI" },
    { value: "elevenlabs", label: "ElevenLabs" },
    { value: "google", label: "Google" },
];

const modelsByProvider: Record<string, Array<{ value: string; label: string }>> = {
    openai: [
        { value: "whisper-1", label: "Whisper (Transcription)" },
        { value: "tts-1", label: "TTS-1 (Text-to-Speech)" },
        { value: "tts-1-hd", label: "TTS-1 HD (High Quality)" },
    ],
    elevenlabs: [
        { value: "eleven_multilingual_v2", label: "Multilingual v2" },
        { value: "eleven_turbo_v2", label: "Turbo v2" },
    ],
    google: [
        { value: "chirp", label: "Chirp (Transcription)" },
        { value: "wavenet", label: "WaveNet (TTS)" },
    ],
};

const operations = [
    { value: "transcribe", label: "Transcribe Audio" },
    { value: "tts", label: "Text-to-Speech" },
];

const voices = [
    { value: "alloy", label: "Alloy" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "onyx", label: "Onyx" },
    { value: "nova", label: "Nova" },
    { value: "shimmer", label: "Shimmer" },
];

export function AudioNodeConfig({ data, onUpdate }: AudioNodeConfigProps) {
    const [operation, setOperation] = useState(data.config?.operation || "transcribe");
    const [provider, setProvider] = useState(data.config?.provider || "openai");
    const [model, setModel] = useState(data.config?.model || "whisper-1");
    const [audioInput, setAudioInput] = useState(data.config?.audioInput || "");
    const [textInput, setTextInput] = useState(data.config?.textInput || "");
    const [voice, setVoice] = useState(data.config?.voice || "alloy");
    const [speed, setSpeed] = useState(data.config?.speed || 1.0);
    const [language, setLanguage] = useState(data.config?.language || "en");
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    useEffect(() => {
        onUpdate({
            operation,
            provider,
            model,
            audioInput,
            textInput,
            voice,
            speed,
            language,
            outputVariable,
        });
    }, [operation, provider, model, audioInput, textInput, voice, speed, language, outputVariable]);

    const handleProviderChange = (newProvider: string) => {
        setProvider(newProvider);
        // Set default model for new provider
        const models = modelsByProvider[newProvider];
        if (models && models.length > 0) {
            setModel(models[0].value);
        }
    };

    return (
        <div>
            <FormSection title="Operation">
                <FormField label="Type">
                    <select
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {operations.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                </FormField>
            </FormSection>

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
            </FormSection>

            {operation === "transcribe" && (
                <FormSection title="Transcription">
                    <FormField
                        label="Audio Source"
                        description="URL or use ${variableName} to reference node outputs"
                    >
                        <input
                            type="text"
                            value={audioInput}
                            onChange={(e) => setAudioInput(e.target.value)}
                            placeholder="https://example.com/audio.mp3 or ${audioFile}"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>

                    <FormField
                        label="Language"
                        description="Source language (optional, auto-detected if not specified)"
                    >
                        <input
                            type="text"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            placeholder="en, es, fr, de, etc."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </FormField>
                </FormSection>
            )}

            {operation === "tts" && (
                <FormSection title="Text-to-Speech">
                    <FormField
                        label="Text Input"
                        description="Text to convert to speech"
                    >
                        <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Enter text to convert to speech..."
                            rows={6}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                    </FormField>

                    <FormField label="Voice">
                        <select
                            value={voice}
                            onChange={(e) => setVoice(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {voices.map((v) => (
                                <option key={v.value} value={v.value}>
                                    {v.label}
                                </option>
                            ))}
                        </select>
                    </FormField>

                    <FormField
                        label="Speed"
                        description="Speaking rate (0.25 = slow, 4.0 = fast)"
                    >
                        <Slider
                            value={speed}
                            onChange={setSpeed}
                            min={0.25}
                            max={4.0}
                            step={0.25}
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Audio"}
                    nodeType="audio"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
