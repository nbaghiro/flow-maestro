import { useState, useEffect } from "react";
import { ConnectionPicker } from "../../../components/connections/ConnectionPicker";
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
    { value: "notion", label: "Notion" },
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

const notionOperations = [
    { value: "search", label: "Search Pages/Databases" },
    { value: "createPage", label: "Create Page" },
    { value: "updatePage", label: "Update Page" },
    { value: "getPage", label: "Get Page" },
    { value: "queryDatabase", label: "Query Database" },
    { value: "createDatabaseEntry", label: "Create Database Entry" },
    { value: "updateDatabaseEntry", label: "Update Database Entry" }
];

export function IntegrationNodeConfig({ data, onUpdate }: IntegrationNodeConfigProps) {
    // Get nested config if it exists
    const nestedConfig = (data.config as Record<string, unknown>) || {};

    const [service, setService] = useState((data.service as string) || "slack");
    const [action, setAction] = useState((data.operation as string) || "sendMessage");
    const [connectionId, setConnectionId] = useState((data.connectionId as string) || "");

    // Slack config
    const [slackChannel, setSlackChannel] = useState((nestedConfig.channel as string) || "");
    const [slackMessage, setSlackMessage] = useState((nestedConfig.text as string) || "");

    // Discord config
    const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
        (nestedConfig.webhookUrl as string) || ""
    );
    const [discordMessage, setDiscordMessage] = useState((nestedConfig.message as string) || "");

    // Email config
    const [emailProvider, setEmailProvider] = useState((nestedConfig.provider as string) || "smtp");
    const [emailTo, setEmailTo] = useState((nestedConfig.to as string) || "");
    const [emailSubject, setEmailSubject] = useState((nestedConfig.subject as string) || "");
    const [emailBody, setEmailBody] = useState((nestedConfig.body as string) || "");

    // Webhook config
    const [webhookUrl, setWebhookUrl] = useState((nestedConfig.url as string) || "");
    const [webhookPayload, setWebhookPayload] = useState((nestedConfig.payload as string) || "");

    // Coda config
    const [codaOperation, setCodaOperation] = useState(
        (data.operation as string) || "listDocuments"
    );
    const [codaDocId, setCodaDocId] = useState((nestedConfig.docId as string) || "");
    const [codaTableId, setCodaTableId] = useState((nestedConfig.tableId as string) || "");
    const [codaRowId, setCodaRowId] = useState((nestedConfig.rowId as string) || "");
    const [codaRowData, setCodaRowData] = useState((nestedConfig.rowData as string) || "");
    const [codaQuery, setCodaQuery] = useState((nestedConfig.query as string) || "");

    // Notion config
    const [notionOperation, setNotionOperation] = useState((data.operation as string) || "search");
    const [notionPageId, setNotionPageId] = useState((nestedConfig.pageId as string) || "");
    const [notionDatabaseId, setNotionDatabaseId] = useState(
        (nestedConfig.databaseId as string) || ""
    );
    const [notionParentId, setNotionParentId] = useState((nestedConfig.parentId as string) || "");
    const [notionPageTitle, setNotionPageTitle] = useState(
        (nestedConfig.pageTitle as string) || ""
    );
    const [notionPageContent, setNotionPageContent] = useState(
        (nestedConfig.pageContent as string) || ""
    );
    const [notionPageProperties, setNotionPageProperties] = useState(
        (nestedConfig.pageProperties as string) || ""
    );
    const [notionProperties, setNotionProperties] = useState(
        (nestedConfig.properties as string) || ""
    );
    const [notionFilter, setNotionFilter] = useState((nestedConfig.filter as string) || "");
    const [notionSorts, setNotionSorts] = useState((nestedConfig.sorts as string) || "");
    const [notionQuery, setNotionQuery] = useState((nestedConfig.query as string) || "");

    const [outputVariable, setOutputVariable] = useState((data.outputVariable as string) || "");

    useEffect(() => {
        const config: Record<string, unknown> = {
            service,
            operation: action, // Backend expects "operation" not "action"
            connectionId,
            outputVariable,
            config: {} // Nested config object for service-specific fields
        };

        if (service === "slack") {
            config.operation = action;
            config.config = {
                channel: slackChannel,
                text: slackMessage
            };
        } else if (service === "discord") {
            config.operation = "send";
            config.config = {
                webhookUrl: discordWebhookUrl,
                message: discordMessage
            };
        } else if (service === "email") {
            config.operation = "send";
            config.config = {
                provider: emailProvider,
                to: emailTo,
                subject: emailSubject,
                body: emailBody
            };
        } else if (service === "webhook") {
            config.operation = "send";
            config.config = {
                url: webhookUrl,
                payload: webhookPayload
            };
        } else if (service === "coda") {
            config.operation = codaOperation;
            config.config = {
                docId: codaDocId,
                tableId: codaTableId,
                rowId: codaRowId,
                rowData: codaRowData,
                query: codaQuery
            };
        } else if (service === "notion") {
            config.operation = notionOperation;
            config.config = {
                pageId: notionPageId,
                databaseId: notionDatabaseId,
                parentId: notionParentId,
                pageTitle: notionPageTitle,
                pageContent: notionPageContent,
                pageProperties: notionPageProperties,
                properties: notionProperties,
                filter: notionFilter,
                sorts: notionSorts,
                query: notionQuery
            };
        }

        onUpdate(config);
    }, [
        service,
        action,
        connectionId,
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
        notionOperation,
        notionPageId,
        notionDatabaseId,
        notionParentId,
        notionPageTitle,
        notionPageContent,
        notionPageProperties,
        notionProperties,
        notionFilter,
        notionSorts,
        notionQuery,
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

                <ConnectionPicker
                    provider={service}
                    value={connectionId}
                    onChange={(id) => setConnectionId(id || "")}
                    label="Connection"
                    description={`Select your ${service === "slack" ? "Slack" : service === "notion" ? "Notion" : service === "coda" ? "Coda" : service} connection`}
                    required
                />
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

            {service === "notion" && (
                <>
                    <FormSection title="Operation">
                        <FormField label="Operation Type">
                            <select
                                value={notionOperation}
                                onChange={(e) => setNotionOperation(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                {notionOperations.map((op) => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </FormSection>

                    <FormSection title="Configuration">
                        {notionOperation === "search" && (
                            <>
                                <FormField
                                    label="Query"
                                    description="Optional: Search query string"
                                >
                                    <input
                                        type="text"
                                        value={notionQuery}
                                        onChange={(e) => setNotionQuery(e.target.value)}
                                        placeholder="Search term or ${queryVariable}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Filter"
                                    description="Optional: JSON filter object"
                                >
                                    <textarea
                                        value={notionFilter}
                                        onChange={(e) => setNotionFilter(e.target.value)}
                                        placeholder='{"property": "object", "value": "page"}'
                                        rows={4}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
                        )}

                        {notionOperation === "createPage" && (
                            <>
                                <FormField
                                    label="Parent ID"
                                    description="Page ID or Database ID where to create the page (e.g., 'abc123' or ${parentId})"
                                >
                                    <input
                                        type="text"
                                        value={notionParentId}
                                        onChange={(e) => setNotionParentId(e.target.value)}
                                        placeholder="abc123 or ${parentId}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField label="Page Title" description="Title for the new page">
                                    <input
                                        type="text"
                                        value={notionPageTitle}
                                        onChange={(e) => setNotionPageTitle(e.target.value)}
                                        placeholder="My New Page or ${pageTitle}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </FormField>
                                <FormField
                                    label="Page Content"
                                    description="Optional: JSON with properties and children blocks"
                                >
                                    <textarea
                                        value={notionPageContent}
                                        onChange={(e) => setNotionPageContent(e.target.value)}
                                        placeholder={
                                            '{\n  "properties": {...},\n  "children": [...]\n}'
                                        }
                                        rows={8}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
                        )}

                        {notionOperation === "updatePage" && (
                            <>
                                <FormField
                                    label="Page ID"
                                    description="ID of the page to update (e.g., 'abc123' or ${pageId})"
                                >
                                    <input
                                        type="text"
                                        value={notionPageId}
                                        onChange={(e) => setNotionPageId(e.target.value)}
                                        placeholder="abc123 or ${pageId}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Page Properties"
                                    description="JSON object with properties to update"
                                >
                                    <textarea
                                        value={notionPageProperties}
                                        onChange={(e) => setNotionPageProperties(e.target.value)}
                                        placeholder={
                                            '{\n  "Title": {"title": [{"text": {"content": "New Title"}}]}\n}'
                                        }
                                        rows={6}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
                        )}

                        {notionOperation === "getPage" && (
                            <FormField
                                label="Page ID"
                                description="ID of the page to retrieve (e.g., 'abc123' or ${pageId})"
                            >
                                <input
                                    type="text"
                                    value={notionPageId}
                                    onChange={(e) => setNotionPageId(e.target.value)}
                                    placeholder="abc123 or ${pageId}"
                                    className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                />
                            </FormField>
                        )}

                        {notionOperation === "queryDatabase" && (
                            <>
                                <FormField
                                    label="Database ID"
                                    description="ID of the database to query (e.g., 'abc123' or ${databaseId})"
                                >
                                    <input
                                        type="text"
                                        value={notionDatabaseId}
                                        onChange={(e) => setNotionDatabaseId(e.target.value)}
                                        placeholder="abc123 or ${databaseId}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Filter"
                                    description="Optional: JSON filter object"
                                >
                                    <textarea
                                        value={notionFilter}
                                        onChange={(e) => setNotionFilter(e.target.value)}
                                        placeholder='{"property": "Status", "select": {"equals": "Done"}}'
                                        rows={4}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Sorts"
                                    description="Optional: JSON array of sort objects"
                                >
                                    <textarea
                                        value={notionSorts}
                                        onChange={(e) => setNotionSorts(e.target.value)}
                                        placeholder='[{"property": "Created", "direction": "descending"}]'
                                        rows={4}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
                        )}

                        {notionOperation === "createDatabaseEntry" && (
                            <>
                                <FormField
                                    label="Database ID"
                                    description="ID of the database (e.g., 'abc123' or ${databaseId})"
                                >
                                    <input
                                        type="text"
                                        value={notionDatabaseId}
                                        onChange={(e) => setNotionDatabaseId(e.target.value)}
                                        placeholder="abc123 or ${databaseId}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Properties"
                                    description="JSON object with database properties"
                                >
                                    <textarea
                                        value={notionProperties}
                                        onChange={(e) => setNotionProperties(e.target.value)}
                                        placeholder={
                                            '{\n  "Name": {"title": [{"text": {"content": "Task Name"}}]},\n  "Status": {"select": {"name": "In Progress"}}\n}'
                                        }
                                        rows={6}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
                        )}

                        {notionOperation === "updateDatabaseEntry" && (
                            <>
                                <FormField
                                    label="Page ID"
                                    description="ID of the database entry (page) to update (e.g., 'abc123' or ${pageId})"
                                >
                                    <input
                                        type="text"
                                        value={notionPageId}
                                        onChange={(e) => setNotionPageId(e.target.value)}
                                        placeholder="abc123 or ${pageId}"
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
                                    />
                                </FormField>
                                <FormField
                                    label="Properties"
                                    description="JSON object with properties to update"
                                >
                                    <textarea
                                        value={notionProperties}
                                        onChange={(e) => setNotionProperties(e.target.value)}
                                        placeholder={
                                            '{\n  "Status": {"select": {"name": "Done"}},\n  "Priority": {"select": {"name": "High"}}\n}'
                                        }
                                        rows={6}
                                        className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono"
                                    />
                                </FormField>
                            </>
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
