import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { Slider } from "../../../components/Slider";

interface VoiceGreetNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const voiceProviders = [
    { value: "elevenlabs", label: "ElevenLabs (High Quality)" },
    { value: "openai", label: "OpenAI TTS" },
];

const voicesByProvider: Record<string, Array<{ value: string; label: string }>> = {
    elevenlabs: [
        { value: "rachel", label: "Rachel (Natural)" },
        { value: "domi", label: "Domi (Strong)" },
        { value: "bella", label: "Bella (Soft)" },
        { value: "antoni", label: "Antoni (Well-rounded)" },
        { value: "elli", label: "Elli (Emotional)" },
    ],
    openai: [
        { value: "alloy", label: "Alloy" },
        { value: "echo", label: "Echo" },
        { value: "fable", label: "Fable" },
        { value: "onyx", label: "Onyx" },
        { value: "nova", label: "Nova" },
        { value: "shimmer", label: "Shimmer" },
    ],
};

export function VoiceGreetNodeConfig({ data, onUpdate }: VoiceGreetNodeConfigProps) {
    const [message, setMessage] = useState(data.config?.message || "Hello! How can I help you today?");
    const [voiceProvider, setVoiceProvider] = useState(data.config?.voiceProvider || "elevenlabs");
    const [voice, setVoice] = useState(data.config?.voice || "rachel");
    const [speed, setSpeed] = useState(data.config?.speed || 1.0);
    const [interruptible, setInterruptible] = useState(data.config?.interruptible !== false);

    useEffect(() => {
        onUpdate({
            message,
            voiceProvider,
            voice,
            speed,
            interruptible,
        });
    }, [message, voiceProvider, voice, speed, interruptible, onUpdate]);

    const handleProviderChange = (newProvider: string) => {
        setVoiceProvider(newProvider);
        // Set default voice for new provider
        const voices = voicesByProvider[newProvider];
        if (voices && voices.length > 0) {
            setVoice(voices[0].value);
        }
    };

    return (
        <div>
            <FormSection title="Message">
                <FormField label="Text to speak">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px]"
                        placeholder="Hello! How can I help you today?"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Use variables like {"{"}user.name{"}"} to personalize the message
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Voice Settings">
                <FormField label="Voice Provider">
                    <select
                        value={voiceProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {voiceProviders.map((provider) => (
                            <option key={provider.value} value={provider.value}>
                                {provider.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Voice">
                    <select
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {(voicesByProvider[voiceProvider] || []).map((v) => (
                            <option key={v.value} value={v.value}>
                                {v.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField label="Speed">
                    <Slider
                        value={speed}
                        onChange={setSpeed}
                        min={0.25}
                        max={4.0}
                        step={0.25}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Adjust speech speed (0.25 = very slow, 1.0 = normal, 4.0 = very fast)
                    </p>
                </FormField>
            </FormSection>

            <FormSection title="Behavior">
                <FormField label="">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={interruptible}
                            onChange={(e) => setInterruptible(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Allow caller to interrupt (barge-in)</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                        If enabled, caller can speak during playback to interrupt
                    </p>
                </FormField>
            </FormSection>
        </div>
    );
}
