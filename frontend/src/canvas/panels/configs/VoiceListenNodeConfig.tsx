import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { Slider } from "../../../components/Slider";

interface VoiceListenNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const sttProviders = [
    { value: "deepgram", label: "Deepgram (Recommended)" },
    { value: "openai", label: "OpenAI Whisper" },
];

const languages = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "es-ES", label: "Spanish (Spain)" },
    { value: "es-MX", label: "Spanish (Mexico)" },
    { value: "fr-FR", label: "French" },
    { value: "de-DE", label: "German" },
    { value: "it-IT", label: "Italian" },
    { value: "pt-BR", label: "Portuguese (Brazil)" },
    { value: "ja-JP", label: "Japanese" },
    { value: "ko-KR", label: "Korean" },
    { value: "zh-CN", label: "Chinese (Simplified)" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
    { value: "ru", label: "Russian" },
];

export function VoiceListenNodeConfig({ data, onUpdate }: VoiceListenNodeConfigProps) {
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "userSpeech");
    const [maxDuration, setMaxDuration] = useState(data.config?.maxDuration || 30);
    const [endSilenceMs, setEndSilenceMs] = useState(data.config?.endSilenceMs || 1500);
    const [language, setLanguage] = useState(data.config?.language || "en-US");
    const [sttProvider, setSttProvider] = useState(data.config?.sttProvider || "deepgram");

    useEffect(() => {
        onUpdate({
            outputVariable,
            maxDuration,
            endSilenceMs,
            language,
            sttProvider,
        });
    }, [outputVariable, maxDuration, endSilenceMs, language, sttProvider, onUpdate]);

    return (
        <div>
            <FormSection title="Output">
                <FormField label="Variable Name">
                    <input
                        type="text"
                        value={outputVariable}
                        onChange={(e) => setOutputVariable(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="userSpeech"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Variable name to store the transcribed text (e.g., userSpeech)
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Listening Duration">
                <FormField label="Max Duration (seconds)">
                    <Slider
                        value={maxDuration}
                        onChange={setMaxDuration}
                        min={5}
                        max={120}
                        step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Maximum time to wait for user speech (5-120 seconds)
                    </p>
                </FormField>

                <FormField label="End Silence Threshold (ms)">
                    <Slider
                        value={endSilenceMs}
                        onChange={setEndSilenceMs}
                        min={500}
                        max={5000}
                        step={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        How long to wait after silence before stopping (500-5000 milliseconds)
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Speech Recognition">
                <FormField label="STT Provider">
                    <select
                        value={sttProvider}
                        onChange={(e) => setSttProvider(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {sttProviders.map((provider) => (
                            <option key={provider.value} value={provider.value}>
                                {provider.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Language">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {languages.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Language for speech recognition
                    </p>
                </FormField>
            </FormSection>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-xs">
                <p className="text-blue-800 dark:text-blue-200">
                    <strong>Tip:</strong> The transcribed text will be stored in the variable{" "}
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{outputVariable}</code>
                    {" "}and can be used in subsequent nodes with{" "}
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{${outputVariable}}`}</code>
                </p>
            </div>
        </div>
    );
}
