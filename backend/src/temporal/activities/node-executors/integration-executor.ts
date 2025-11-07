import axios from "axios";
import type { JsonObject } from "@flowmaestro/shared";
import * as nodemailer from "nodemailer";
import { interpolateVariables } from "./utils";
import { getAccessToken } from "../../../services/oauth/TokenRefreshService";

export interface IntegrationNodeConfig {
    service: "slack" | "email" | "webhook";
    operation: string;

    // Authentication (prioritized in this order)
    connectionId?: string; // OAuth connection ID (preferred)
    apiKey?: string; // Manual API key
    credentials?: unknown; // Legacy credentials

    // Service-specific config
    config: Record<string, unknown>;

    outputVariable?: string;
}

export interface IntegrationNodeResult {
    service: string;
    operation: string;
    success: boolean;
    data?: unknown;
    metadata?: {
        requestTime: number;
    };
}

/**
 * Execute Integration node - connect to external services
 */
export async function executeIntegrationNode(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const startTime = Date.now();

    console.log(`[Integration] Service: ${config.service}, Operation: ${config.operation}`);

    let result: JsonObject;

    switch (config.service) {
        case "slack":
            result = await executeSlack(config, context);
            break;

        case "email":
            result = await executeEmail(config, context);
            break;

        case "webhook":
            result = await executeWebhook(config, context);
            break;

        default:
            throw new Error(`Unsupported integration service: ${config.service}`);
    }

    result.metadata = {
        ...(result.metadata as JsonObject),
        requestTime: Date.now() - startTime
    };

    console.log(
        `[Integration] Completed in ${((result.metadata as JsonObject)?.requestTime as number) || 0}ms`
    );

    if (config.outputVariable) {
        return { [config.outputVariable]: result } as unknown as JsonObject;
    }

    return result as unknown as JsonObject;
}

/**
 * Execute Slack integration
 */
async function executeSlack(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    // Get token in priority order: OAuth connection > API key > env var
    let token: string;

    if (config.connectionId) {
        // Use OAuth token from connection (auto-refreshes if needed!)
        token = await getAccessToken(config.connectionId);
        console.log(`[Integration/Slack] Using OAuth connection: ${config.connectionId}`);
    } else if (config.apiKey) {
        token = config.apiKey;
        console.log("[Integration/Slack] Using provided API key");
    } else if (process.env.SLACK_BOT_TOKEN) {
        token = process.env.SLACK_BOT_TOKEN;
        console.log("[Integration/Slack] Using env var SLACK_BOT_TOKEN");
    } else {
        throw new Error(
            "Slack token not configured. Please connect your Slack account or provide an API key."
        );
    }

    const slackConfig = config.config;

    if (config.operation === "send_message") {
        // Send message to Slack channel
        const channel = interpolateVariables(slackConfig.channel as string || "", context);
        const text = interpolateVariables(slackConfig.text as string || "", context);
        const blocks = slackConfig.blocks as unknown[];
        const threadTs = slackConfig.threadTs;

        console.log(`[Integration/Slack] Sending message to channel: ${channel}`);

        const response = await axios.post(
            "https://slack.com/api/chat.postMessage",
            {
                channel,
                text,
                blocks,
                thread_ts: threadTs
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
        }

        return {
            service: "slack",
            operation: "send_message",
            success: true,
            data: response.data
        } as unknown as JsonObject;
    } else if (config.operation === "upload_file") {
        // Upload file to Slack
        const channels = (slackConfig.channels as string[])?.join(",") || "";
        const content = interpolateVariables(slackConfig.content as string || "", context);
        const filename = interpolateVariables(slackConfig.filename as string || "file.txt", context);

        console.log(`[Integration/Slack] Uploading file to channels: ${channels}`);

        const formData = new FormData();
        formData.append("channels", channels);
        formData.append("content", content);
        formData.append("filename", filename);

        const response = await axios.post("https://slack.com/api/files.upload", formData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.data.ok) {
            throw new Error(`Slack API error: ${response.data.error}`);
        }

        return {
            service: "slack",
            operation: "upload_file",
            success: true,
            data: response.data
        } as unknown as JsonObject;
    } else {
        throw new Error(`Unsupported Slack operation: ${config.operation}`);
    }
}

/**
 * Execute Email integration
 */
async function executeEmail(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const emailConfig = config.config;

    if (config.operation !== "send") {
        throw new Error(`Unsupported email operation: ${config.operation}`);
    }

    // Build transporter config
    let transportConfig:
        | { host: string; port: number; secure: boolean; auth: { user: string; pass: string } }
        | Record<string, unknown> = {};

    if (emailConfig.provider === "smtp") {
        // SMTP configuration
        const host = interpolateVariables(emailConfig.host as string || "", context);
        const port = emailConfig.port || 587;
        const secure = emailConfig.secure || false;
        const username = interpolateVariables(emailConfig.username as string || "", context);
        const password = interpolateVariables(emailConfig.password as string || "", context);

        transportConfig = {
            host,
            port,
            secure,
            auth: {
                user: username,
                pass: password
            }
        };
    } else if (emailConfig.provider === "sendgrid") {
        // SendGrid configuration
        const apiKey = config.apiKey || process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            throw new Error("SendGrid API key not configured");
        }

        // Use SendGrid SMTP
        transportConfig = {
            host: "smtp.sendgrid.net",
            port: 587,
            secure: false,
            auth: {
                user: "apikey",
                pass: apiKey
            }
        };
    } else {
        throw new Error(`Unsupported email provider: ${emailConfig.provider}`);
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Prepare email
    const from = interpolateVariables(emailConfig.from as string || "", context);
    const to = Array.isArray(emailConfig.to)
        ? emailConfig.to.map((t: string) => interpolateVariables(t, context))
        : interpolateVariables(emailConfig.to as string || "", context);
    const subject = interpolateVariables(emailConfig.subject as string || "", context);
    const body = interpolateVariables(emailConfig.body as string || "", context);
    const bodyType = emailConfig.bodyType || "text";

    console.log(`[Integration/Email] Sending email to: ${to}`);

    const mailOptions: {
        from: string;
        to: string | string[];
        subject: string;
        html?: string;
        text?: string;
        cc?: string | string[];
        bcc?: string | string[];
        attachments?: Array<{ filename: string; content: string }>;
    } = {
        from,
        to,
        subject,
        [bodyType === "html" ? "html" : "text"]: body
    };

    // Add CC and BCC if specified
    if (emailConfig.cc) {
        mailOptions.cc = Array.isArray(emailConfig.cc)
            ? emailConfig.cc.map((c: string) => interpolateVariables(c, context))
            : interpolateVariables(emailConfig.cc as string || "", context);
    }

    if (emailConfig.bcc) {
        mailOptions.bcc = Array.isArray(emailConfig.bcc)
            ? emailConfig.bcc.map((b: string) => interpolateVariables(b, context))
            : interpolateVariables(emailConfig.bcc as string || "", context);
    }

    // Add attachments if specified
    if (emailConfig.attachments) {
        mailOptions.attachments = (
            emailConfig.attachments as Array<{ filename?: string; content?: string }>
        ).map((att) => ({
            filename: interpolateVariables(att.filename || "attachment", context),
            content: interpolateVariables(att.content || "", context)
        }));
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`[Integration/Email] Email sent: ${info.messageId}`);

    return {
        service: "email",
        operation: "send",
        success: true,
        data: {
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected
        }
    } as unknown as JsonObject;
}

/**
 * Execute Webhook integration
 */
async function executeWebhook(
    config: IntegrationNodeConfig,
    context: JsonObject
): Promise<JsonObject> {
    const webhookConfig = config.config;

    if (config.operation === "send") {
        // Send HTTP request to webhook URL
        const url = interpolateVariables(webhookConfig.url as string || "", context);
        const method = webhookConfig.method || "POST";
        const headers = webhookConfig.headers || {};
        const body = interpolateObject(webhookConfig.body || {}, context);

        // Interpolate headers
        const interpolatedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            interpolatedHeaders[key] = interpolateVariables(value as string, context);
        }

        console.log(`[Integration/Webhook] Sending ${method} request to: ${url}`);

        const response = await axios({
            method: (method as string).toLowerCase(),
            url,
            headers: interpolatedHeaders,
            data: body,
            timeout: (webhookConfig.timeout as number) || 30000,
            validateStatus: () => true // Don't throw on any status code
        });

        const success = response.status >= 200 && response.status < 300;

        console.log(`[Integration/Webhook] Response: ${response.status} ${response.statusText}`);

        return {
            service: "webhook",
            operation: "send",
            success,
            data: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                body: response.data
            }
        } as unknown as JsonObject;
    } else {
        throw new Error(`Unsupported webhook operation: ${config.operation}`);
    }
}

/**
 * Interpolate variables in an object recursively
 */
function interpolateObject(obj: unknown, context: JsonObject): unknown {
    if (typeof obj === "string") {
        return interpolateVariables(obj, context);
    } else if (Array.isArray(obj)) {
        return obj.map((item) => interpolateObject(item, context));
    } else if (obj && typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = interpolateObject(
                    (obj as Record<string, unknown>)[key],
                    context
                );
            }
        }
        return result;
    }
    return obj;
}
