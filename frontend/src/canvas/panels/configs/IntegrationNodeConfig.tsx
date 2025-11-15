import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface IntegrationNodeConfigProps {
    data: Record<string, unknown>;
    onUpdate: (config: unknown) => void;
}

const services = [
    { value: "slack", label: "Slack" },
    { value: "discord", label: "Discord" },
    { value: "email", label: "Email" },
    { value: "webhook", label: "Webhook" },
    { value: "coda", label: "Coda" },
    { value: "custom", label: "Custom API" }
];

const slackActions = [
    { value: "sendMessage", label: "Send Message" },
    { value: "createChannel", label: "Create Channel" },
    { value: "inviteUser", label: "Invite User" }
];

const emailProviders = [
    { value: "smtp", label: "SMTP" },
    { value: "sendgrid", label: "SendGrid" },
    { value: "mailgun", label: "Mailgun" },
    { value: "ses", label: "AWS SES" }
];

const codaOperations = [
    { value: "listDocuments", label: "List Documents" },
    { value: "getTableRows", label: "Get Table Rows" },
    { value: "insertRow", label: "Insert Row" },
    { value: "updateRow", label: "Update Row" },
    { value: "deleteRow", label: "Delete Row" }
];

export function IntegrationNodeConfig({ data, onUpdate }: IntegrationNodeConfigProps) {
    const [service, setService] = useState((data.service as string) || "slack");
    const [action, setAction] = useState((data.action as string) || "sendMessage");
    const [credentialsId, setCredentialsId] = useState((data.credentialsId as string) || "");

    // Slack config
    const [slackChannel, setSlackChannel] = useState((data.slackChannel as string) || "");
    const [slackMessage, setSlackMessage] = useState((data.slackMessage as string) || "");

    // Discord config
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
        (data.discordWebhookUrl as string) || ""
    );
    const [discordMessage, setDiscordMessage] = useState((data.discordMessage as string) || "");

    // Email config
    const [emailProvider, setEmailProvider] = useState((data.emailProvider as string) || "smtp");
    const [emailTo, setEmailTo] = useState((data.emailTo as string) || "");
    const [emailSubject, setEmailSubject] = useState((data.emailSubject as string) || "");
    const [emailBody, setEmailBody] = useState((data.emailBody as string) || "");

    // Webhook config
    const [webhookUrl, setWebhookUrl] = useState((data.webhookUrl as string) || "");
    const [webhookPayload, setWebhookPayload] = useState((data.webhookPayload as string) || "");

    // Coda config
    const [codaOperation, setCodaOperation] = useState(
        (data.codaOperation as string) || "listDocuments"
    );
    const [codaDocId, setCodaDocId] = useState((data.codaDocId as string) || "");
    const [codaTableId, setCodaTableId] = useState((data.codaTableId as string) || "");
    const [codaRowId, setCodaRowId] = useState((data.codaRowId as string) || "");
    const [codaRowData, setCodaRowData] = useState((data.codaRowData as string) || "");
    const [codaQuery, setCodaQuery] = useState((data.codaQuery as string) || "");

    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        const config: Record<string, unknown> = { service, credentialsId, outputVariable };

        if (service === "slack") {
            config.action = action;
            config.slackChannel = slackChannel;
            config.slackMessage = slackMessage;
        } else if (service === "discord") {
            config.action = "send";
            config.discordWebhookUrl = discordWebhookUrl;
            config.discordMessage = discordMessage;
        } else if (service === "email") {
            config.action = "send";
            config.emailProvider = emailProvider;
            config.emailTo = emailTo;
            config.emailSubject = emailSubject;
            config.emailBody = emailBody;
        } else if (service === "webhook") {
            config.action = "send";
            config.webhookUrl = webhookUrl;
            config.webhookPayload = webhookPayload;
        } else if (service === "coda") {
            config.action = codaOperation;
            config.codaOperation = codaOperation;
            config.codaDocId = codaDocId;
            config.codaTableId = codaTableId;
            config.codaRowId = codaRowId;
            config.codaRowData = codaRowData;
            config.codaQuery = codaQuery;
        }

        onUpdate(config);
    }, [
        service,
        action,
        credentialsId,
        slackChannel,
        slackMessage,
        discordWebhookUrl,
        discordMessage,
        emailProvider,
        emailTo,
        emailSubject,
        emailBody,
        webhookUrl,
        webhookPayload,
        codaOperation,
        codaDocId,
        codaTableId,
        codaRowId,
        codaRowData,
        codaQuery,
        outputVariable
    ]);

    return (
        <div>
            <FormSection title="Service">
                <FormField label="Type">
                    <select
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        {services.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField
                    label="Credentials"
                    description="Stored credential reference (OAuth token or API key)"
                >
                    <input
                        type="text"
                        value={credentialsId}
                        onChange={(e) => setCredentialsId(e.target.value)}
                        placeholder="my-slack-workspace"
                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </FormField>
            </FormSection>

            {service === "slack" && (
                <>
                    <FormSection title="Action">
                        <FormField label="Action Type">
                            <select
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                {slackActions.map((a) => (
                                    <option key={a.value} value={a.value}>
                                        {a.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </FormSection>

                    <FormSection title="Configuration">
                        <FormField label="Channel">
                            <input
                                type="text"
                                value={slackChannel}
                                onChange={(e) => setSlackChannel(e.target.value)}
                                placeholder="#general or @username"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                        </FormField>

                        <FormField label="Message">
                            <textarea
                                value={slackMessage}
                                onChange={(e) => setSlackMessage(e.target.value)}
                                placeholder="Hello from FlowMaestro! ${variableName}"
                                rows={6}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                            />
                        </FormField>
                    </FormSection>
                </>
            )}

            {service === "discord" && (
                <FormSection title="Configuration">
                    <FormField label="Webhook URL" description="Discord webhook URL">
                        <input
                            type="text"
                            value={discordWebhookUrl}
                            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>

                    <FormField label="Message">
                        <textarea
                            value={discordMessage}
                            onChange={(e) => setDiscordMessage(e.target.value)}
                            placeholder="Hello from FlowMaestro! ${variableName}"
                            rows={6}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                    </FormField>
                </FormSection>
            )}

            {service === "email" && (
                <>
                    <FormSection title="Provider">
                        <FormField label="Email Provider">
                            <select
                                value={emailProvider}
                                onChange={(e) => setEmailProvider(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                {emailProviders.map((p) => (
                                    <option key={p.value} value={p.value}>
                                        {p.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </FormSection>

                    <FormSection title="Email">
                        <FormField label="To">
                            <input
                                type="text"
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                placeholder="user@example.com or ${emailVariable}"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                            />
                        </FormField>

                        <FormField label="Subject">
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                placeholder="Email subject"
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                        </FormField>

                        <FormField label="Body">
                            <textarea
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                placeholder="Email body with ${variableName} support"
                                rows={8}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                            />
                        </FormField>
                    </FormSection>
                </>
            )}

            {service === "webhook" && (
                <FormSection title="Webhook">
                    <FormField label="URL">
                        <input
                            type="text"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-webhook-url.com"
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                        />
                    </FormField>

                    <FormField label="Payload" description="JSON payload to send">
                        <textarea
                            value={webhookPayload}
                            onChange={(e) => setWebhookPayload(e.target.value)}
                            placeholder={
                                '{\n  "event": "workflow_complete",\n  "data": "${result}"\n}'
                            }
                            rows={8}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            {service === "coda" && (
                <>
                    <FormSection title="Operation">
                        <FormField label="Operation Type">
                            <select
                                value={codaOperation}
                                onChange={(e) => setCodaOperation(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                {codaOperations.map((op) => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </FormSection>

                    <FormSection title="Configuration">
                        {codaOperation !== "listDocuments" && (
                            <FormField
                                label="Document ID"
                                description="Coda document ID (e.g., 'abc123' from URL or ${variableName})"
                            >
                                <input
                                    type="text"
                                    value={codaDocId}
                                    onChange={(e) => setCodaDocId(e.target.value)}
                                    placeholder="abc123 or ${documentId}"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                />
                            </FormField>
                        )}

                        {(codaOperation === "getTableRows" ||
                            codaOperation === "insertRow" ||
                            codaOperation === "updateRow" ||
                            codaOperation === "deleteRow") && (
                            <FormField
                                label="Table ID"
                                description="Table ID or name (e.g., 'grid-abc' or 'Tasks')"
                            >
                                <input
                                    type="text"
                                    value={codaTableId}
                                    onChange={(e) => setCodaTableId(e.target.value)}
                                    placeholder="grid-abc or ${tableId}"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                />
                            </FormField>
                        )}

                        {(codaOperation === "updateRow" || codaOperation === "deleteRow") && (
                            <FormField label="Row ID" description="Row ID to update or delete">
                                <input
                                    type="text"
                                    value={codaRowId}
                                    onChange={(e) => setCodaRowId(e.target.value)}
                                    placeholder="i-abc123 or ${rowId}"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                />
                            </FormField>
                        )}

                        {(codaOperation === "insertRow" || codaOperation === "updateRow") && (
                            <FormField
                                label="Row Data"
                                description="JSON object with column names/IDs as keys"
                            >
                                <textarea
                                    value={codaRowData}
                                    onChange={(e) => setCodaRowData(e.target.value)}
                                    placeholder={
                                        '{\n  "Name": "John Doe",\n  "Email": "john@example.com",\n  "Status": "${status}"\n}'
                                    }
                                    rows={6}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                />
                            </FormField>
                        )}

                        {codaOperation === "getTableRows" && (
                            <FormField
                                label="Query Parameters"
                                description="Optional: JSON for filters, sorting, limit (e.g., {limit: 100})"
                            >
                                <textarea
                                    value={codaQuery}
                                    onChange={(e) => setCodaQuery(e.target.value)}
                                    placeholder={
                                        '{\n  "limit": 100,\n  "query": "${searchTerm}"\n}'
                                    }
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                />
                            </FormField>
                        )}
                    </FormSection>
                </>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={(data.label as string) || "Integration"}
                    nodeType="integration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
