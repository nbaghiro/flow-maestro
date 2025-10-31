import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";

interface VoiceHangupNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const hangupReasons = [
    { value: "normal", label: "Normal (Call completed successfully)" },
    { value: "user_hangup", label: "User Hangup" },
    { value: "timeout", label: "Timeout" },
    { value: "error", label: "Error" },
    { value: "transfer", label: "Transfer to Another Number" },
    { value: "voicemail", label: "Voicemail" },
];

export function VoiceHangupNodeConfig({ data, onUpdate }: VoiceHangupNodeConfigProps) {
    const [farewellMessage, setFarewellMessage] = useState(data.config?.farewellMessage || "");
    const [reason, setReason] = useState(data.config?.reason || "normal");
    const [enableFarewell, setEnableFarewell] = useState(!!data.config?.farewellMessage);

    useEffect(() => {
        onUpdate({
            farewellMessage: enableFarewell ? farewellMessage : undefined,
            reason,
        });
    }, [farewellMessage, reason, enableFarewell, onUpdate]);

    return (
        <div>
            <FormSection title="Farewell Message (Optional)">
                <FormField label="">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                        <input
                            type="checkbox"
                            checked={enableFarewell}
                            onChange={(e) => setEnableFarewell(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="text-sm">Play farewell message before hanging up</span>
                    </label>
                </FormField>

                {enableFarewell && (
                    <FormField label="Message">
                        <textarea
                            value={farewellMessage}
                            onChange={(e) => setFarewellMessage(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[80px]"
                            placeholder="Thank you for calling. Goodbye!"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Final message to play before ending the call
                        </p>
                    </FormField>
                )}
            </FormSection>

            <FormSection title="Hangup Reason">
                <FormField label="Reason">
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {hangupReasons.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                        Reason code for logging and analytics
                    </p>
                </FormField>
            </FormSection>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs">
                <p className="text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> This node will end the call immediately after executing.
                    Any nodes connected after this will not be executed.
                </p>
            </div>
        </div>
    );
}
