import { useState, useEffect } from "react";
import { FormField, FormSection } from "../../../components/FormField";
import { OutputSettingsSection } from "../../../components/OutputSettingsSection";

interface IntegrationNodeConfigProps {
    data: any;
    onUpdate: (config: any) => void;
}

const services = [
    { value: "slack", label: "Slack" },
    { value: "discord", label: "Discord" },
    { value: "email", label: "Email" },
    { value: "webhook", label: "Webhook" },
    { value: "custom", label: "Custom API" },
];

const slackActions = [
    { value: "sendMessage", label: "Send Message" },
    { value: "createChannel", label: "Create Channel" },
    { value: "inviteUser", label: "Invite User" },
];

const emailProviders = [
    { value: "smtp", label: "SMTP" },
    { value: "sendgrid", label: "SendGrid" },
    { value: "mailgun", label: "Mailgun" },
    { value: "ses", label: "AWS SES" },
];

export function IntegrationNodeConfig({ data, onUpdate }: IntegrationNodeConfigProps) {
    const [service, setService] = useState(data.config?.service || "slack");
    const [action, setAction] = useState(data.config?.action || "sendMessage");
    const [credentialsId, setCredentialsId] = useState(data.config?.credentialsId || "");

    // Slack config
    const [slackChannel, setSlackChannel] = useState(data.config?.slackChannel || "");
    const [slackMessage, setSlackMessage] = useState(data.config?.slackMessage || "");

    // Discord config
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState(data.config?.discordWebhookUrl || "");
    const [discordMessage, setDiscordMessage] = useState(data.config?.discordMessage || "");

    // Email config
    const [emailProvider, setEmailProvider] = useState(data.config?.emailProvider || "smtp");
    const [emailTo, setEmailTo] = useState(data.config?.emailTo || "");
    const [emailSubject, setEmailSubject] = useState(data.config?.emailSubject || "");
    const [emailBody, setEmailBody] = useState(data.config?.emailBody || "");

    // Webhook config
    const [webhookUrl, setWebhookUrl] = useState(data.config?.webhookUrl || "");
    const [webhookPayload, setWebhookPayload] = useState(data.config?.webhookPayload || "");
    const [outputVariable, setOutputVariable] = useState(data.config?.outputVariable || "");

    useEffect(() => {
        const config: any = { service, action, credentialsId, outputVariable };

        if (service === "slack") {
            config.slackChannel = slackChannel;
            config.slackMessage = slackMessage;
        } else if (service === "discord") {
            config.discordWebhookUrl = discordWebhookUrl;
            config.discordMessage = discordMessage;
        } else if (service === "email") {
            config.emailProvider = emailProvider;
            config.emailTo = emailTo;
            config.emailSubject = emailSubject;
            config.emailBody = emailBody;
        } else if (service === "webhook") {
            config.webhookUrl = webhookUrl;
            config.webhookPayload = webhookPayload;
        }

        onUpdate(config);
    }, [service, action, credentialsId, slackChannel, slackMessage, discordWebhookUrl, discordMessage, emailProvider, emailTo, emailSubject, emailBody, webhookUrl, webhookPayload, outputVariable]);

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
                    <FormField
                        label="Webhook URL"
                        description="Discord webhook URL"
                    >
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

                    <FormField
                        label="Payload"
                        description="JSON payload to send"
                    >
                        <textarea
                            value={webhookPayload}
                            onChange={(e) => setWebhookPayload(e.target.value)}
                            placeholder={'{\n  "event": "workflow_complete",\n  "data": "${result}"\n}'}
                            rows={8}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                        />
                    </FormField>
                </FormSection>
            )}

            <FormSection title="Output Settings">
                <OutputSettingsSection
                    nodeName={data.label || "Integration"}
                    nodeType="integration"
                    value={outputVariable}
                    onChange={setOutputVariable}
                />
            </FormSection>
        </div>
    );
}
