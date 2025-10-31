/**
 * Create Trigger Dialog
 * Modal for creating new workflow triggers
 */

import { useState } from "react";
import { X, Calendar, Webhook, Play, Phone } from "lucide-react";
import { createTrigger } from "../../lib/api";
import type { TriggerType, CreateTriggerInput } from "../../types/trigger";

interface CreateTriggerDialogProps {
    workflowId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function CreateTriggerDialog({ workflowId, onClose, onSuccess }: CreateTriggerDialogProps) {
    const [name, setName] = useState("");
    const [triggerType, setTriggerType] = useState<TriggerType>("schedule");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Schedule trigger fields
    const [cronExpression, setCronExpression] = useState("0 9 * * *");
    const [timezone, setTimezone] = useState("UTC");

    // Webhook trigger fields
    const [webhookMethod, setWebhookMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ANY">("POST");
    const [authType, setAuthType] = useState<"none" | "hmac" | "bearer" | "api_key">("none");

    // Manual trigger fields
    const [manualInputs, setManualInputs] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
    const [manualDescription, setManualDescription] = useState("");

    // Phone call trigger fields
    const [phoneNumber, setPhoneNumber] = useState("");
    const [connectionId, setConnectionId] = useState("");
    const [greetingMessage, setGreetingMessage] = useState("Hello! How can I help you today?");
    const [language, setLanguage] = useState("en-US");
    const [voiceProvider, setVoiceProvider] = useState<"elevenlabs" | "openai">("elevenlabs");
    const [enableRecording, setEnableRecording] = useState(true);
    const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Please enter a trigger name");
            return;
        }

        setLoading(true);

        try {
            let config: any;
            if (triggerType === "schedule") {
                config = {
                    cronExpression,
                    timezone,
                    enabled: true,
                };
            } else if (triggerType === "webhook") {
                config = {
                    method: webhookMethod,
                    authType,
                    responseFormat: "json",
                };
            } else if (triggerType === "manual") {
                // Convert inputs array to object, filtering out empty keys
                const inputsObject: Record<string, any> = {};
                manualInputs.forEach(({ key, value }) => {
                    if (key.trim()) {
                        // Try to parse value as JSON, otherwise use as string
                        try {
                            inputsObject[key.trim()] = JSON.parse(value);
                        } catch {
                            inputsObject[key.trim()] = value;
                        }
                    }
                });

                config = {
                    inputs: inputsObject,
                    description: manualDescription || undefined,
                    requireInputs: Object.keys(inputsObject).length > 0,
                };
            } else if (triggerType === "phone_call") {
                config = {
                    phoneNumber,
                    sipProvider: "telnyx",
                    connectionId,
                    greetingMessage,
                    language,
                    voiceProvider,
                    enableRecording,
                    businessHoursEnabled,
                };
            }

            const input: CreateTriggerInput = {
                workflowId,
                name: name.trim(),
                triggerType,
                enabled: true,
                config,
            };

            await createTrigger(input);
            onSuccess();
        } catch (err) {
            console.error("Failed to create trigger:", err);
            setError(err instanceof Error ? err.message : "Failed to create trigger");
        } finally {
            setLoading(false);
        }
    };

    const cronExamples = [
        { label: "Every minute", value: "* * * * *" },
        { label: "Every hour", value: "0 * * * *" },
        { label: "Every day at 9 AM", value: "0 9 * * *" },
        { label: "Every Monday at 9 AM", value: "0 9 * * 1" },
        { label: "First day of month", value: "0 0 1 * *" },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                    <h2 className="text-lg font-semibold">Create Trigger</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded transition-colors"
                        disabled={loading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4 space-y-4">
                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                                {error}
                            </div>
                        )}

                        {/* Trigger Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Trigger Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                placeholder="e.g., Daily Report, Customer Webhook"
                                required
                                disabled={loading}
                            />
                        </div>

                        {/* Trigger Type */}
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Trigger Type
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTriggerType("manual")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "manual"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Play className="w-5 h-5 mx-auto mb-1 text-green-500" />
                                    <div className="text-sm font-medium">Manual</div>
                                    <div className="text-xs text-muted-foreground">Static inputs</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("schedule")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "schedule"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                                    <div className="text-sm font-medium">Schedule</div>
                                    <div className="text-xs text-muted-foreground">Cron-based</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("webhook")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "webhook"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Webhook className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                                    <div className="text-sm font-medium">Webhook</div>
                                    <div className="text-xs text-muted-foreground">HTTP endpoint</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTriggerType("phone_call")}
                                    className={`p-3 border rounded-lg transition-all ${
                                        triggerType === "phone_call"
                                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                            : "border-border hover:bg-muted"
                                    }`}
                                    disabled={loading}
                                >
                                    <Phone className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                                    <div className="text-sm font-medium">Phone Call</div>
                                    <div className="text-xs text-muted-foreground">Voice agent</div>
                                </button>
                            </div>
                        </div>

                        {/* Manual Configuration */}
                        {triggerType === "manual" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Description (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={manualDescription}
                                        onChange={(e) => setManualDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="e.g., Test with sample data"
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Static Inputs
                                    </label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Define key-value pairs for workflow inputs. Values can be strings or JSON.
                                    </p>
                                    <div className="space-y-2">
                                        {manualInputs.map((input, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={input.key}
                                                    onChange={(e) => {
                                                        const newInputs = [...manualInputs];
                                                        newInputs[index].key = e.target.value;
                                                        setManualInputs(newInputs);
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="key"
                                                    disabled={loading}
                                                />
                                                <input
                                                    type="text"
                                                    value={input.value}
                                                    onChange={(e) => {
                                                        const newInputs = [...manualInputs];
                                                        newInputs[index].value = e.target.value;
                                                        setManualInputs(newInputs);
                                                    }}
                                                    className="flex-[2] px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    placeholder="value"
                                                    disabled={loading}
                                                />
                                                {manualInputs.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newInputs = manualInputs.filter((_, i) => i !== index);
                                                            setManualInputs(newInputs);
                                                        }}
                                                        className="px-3 py-2 border border-border rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                                        disabled={loading}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setManualInputs([...manualInputs, { key: "", value: "" }])}
                                        className="mt-2 text-sm text-primary hover:underline"
                                        disabled={loading}
                                    >
                                        + Add Input
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Schedule Configuration */}
                        {triggerType === "schedule" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Cron Expression
                                    </label>
                                    <input
                                        type="text"
                                        value={cronExpression}
                                        onChange={(e) => setCronExpression(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="0 9 * * *"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Format: minute hour day month weekday
                                    </p>
                                </div>

                                {/* Quick Examples */}
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Quick Examples
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {cronExamples.map((example) => (
                                            <button
                                                key={example.value}
                                                type="button"
                                                onClick={() => setCronExpression(example.value)}
                                                className="px-3 py-2 text-xs border border-border rounded hover:bg-muted transition-colors text-left"
                                                disabled={loading}
                                            >
                                                <div className="font-medium">{example.label}</div>
                                                <code className="text-muted-foreground">{example.value}</code>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Timezone
                                    </label>
                                    <input
                                        type="text"
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="UTC"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        e.g., UTC, America/New_York, Europe/London
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Webhook Configuration */}
                        {triggerType === "webhook" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        HTTP Method
                                    </label>
                                    <select
                                        value={webhookMethod}
                                        onChange={(e) => setWebhookMethod(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={loading}
                                    >
                                        <option value="POST">POST</option>
                                        <option value="GET">GET</option>
                                        <option value="PUT">PUT</option>
                                        <option value="DELETE">DELETE</option>
                                        <option value="PATCH">PATCH</option>
                                        <option value="ANY">ANY (all methods)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Authentication
                                    </label>
                                    <select
                                        value={authType}
                                        onChange={(e) => setAuthType(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        disabled={loading}
                                    >
                                        <option value="none">None</option>
                                        <option value="hmac">HMAC Signature</option>
                                        <option value="bearer">Bearer Token</option>
                                        <option value="api_key">API Key</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        A unique webhook URL and secret will be generated after creation
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Phone Call Configuration */}
                        {triggerType === "phone_call" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Phone Number (E.164 format)
                                    </label>
                                    <input
                                        type="text"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="+15551234567"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Your Telnyx phone number in E.164 format (e.g., +15551234567)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Telnyx Connection
                                    </label>
                                    <input
                                        type="text"
                                        value={connectionId}
                                        onChange={(e) => setConnectionId(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Connection ID"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Select your Telnyx connection from the Connections page
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Greeting Message
                                    </label>
                                    <textarea
                                        value={greetingMessage}
                                        onChange={(e) => setGreetingMessage(e.target.value)}
                                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        placeholder="Hello! How can I help you today?"
                                        rows={2}
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Initial message to play when call is answered
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            Language
                                        </label>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            disabled={loading}
                                        >
                                            <option value="en-US">English (US)</option>
                                            <option value="en-GB">English (UK)</option>
                                            <option value="es-ES">Spanish (Spain)</option>
                                            <option value="es-MX">Spanish (Mexico)</option>
                                            <option value="fr-FR">French</option>
                                            <option value="de-DE">German</option>
                                            <option value="it-IT">Italian</option>
                                            <option value="pt-BR">Portuguese (Brazil)</option>
                                            <option value="ja-JP">Japanese</option>
                                            <option value="ko-KR">Korean</option>
                                            <option value="zh-CN">Chinese (Simplified)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">
                                            Voice Provider
                                        </label>
                                        <select
                                            value={voiceProvider}
                                            onChange={(e) => setVoiceProvider(e.target.value as "elevenlabs" | "openai")}
                                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            disabled={loading}
                                        >
                                            <option value="elevenlabs">ElevenLabs (High Quality)</option>
                                            <option value="openai">OpenAI TTS</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={enableRecording}
                                            onChange={(e) => setEnableRecording(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                            disabled={loading}
                                        />
                                        <span className="text-sm">Enable call recording</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={businessHoursEnabled}
                                            onChange={(e) => setBusinessHoursEnabled(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                                            disabled={loading}
                                        />
                                        <span className="text-sm">Enable business hours (configure after creation)</span>
                                    </label>
                                </div>

                                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
                                    <p className="text-xs text-blue-800 dark:text-blue-200">
                                        <strong>Note:</strong> After creating this trigger, configure your Telnyx phone number
                                        to forward incoming calls to the webhook URL provided in the trigger details.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-muted/30 flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Trigger"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
