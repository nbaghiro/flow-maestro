/**
 * Webhook Service
 * Handles incoming webhook requests and triggers workflow executions
 */

import * as crypto from "crypto";
import { getTemporalClient } from "../client";
import { TriggerRepository } from "../../storage/repositories/TriggerRepository";
import { WebhookTriggerConfig } from "../../storage/models/Trigger";

export interface WebhookRequestData {
    method: string;
    headers: Record<string, string | string[]>;
    body: any;
    query: Record<string, any>;
    path: string;
    ip?: string;
    userAgent?: string;
}

export interface WebhookResponse {
    success: boolean;
    executionId?: string;
    message?: string;
    error?: string;
    statusCode: number;
}

export class WebhookService {
    private triggerRepo: TriggerRepository;

    constructor() {
        this.triggerRepo = new TriggerRepository();
    }

    /**
     * Process incoming webhook request
     */
    async processWebhook(
        triggerId: string,
        requestData: WebhookRequestData
    ): Promise<WebhookResponse> {
        const startTime = Date.now();

        try {
            // Find trigger
            const trigger = await this.triggerRepo.findById(triggerId);
            if (!trigger) {
                await this.logWebhookRequest(triggerId, requestData, 404, null, "Trigger not found");
                return {
                    success: false,
                    message: "Trigger not found",
                    error: "Trigger not found",
                    statusCode: 404
                };
            }

            // Check if trigger is enabled
            if (!trigger.enabled) {
                await this.logWebhookRequest(triggerId, requestData, 403, null, "Trigger is disabled");
                return {
                    success: false,
                    message: "Trigger is disabled",
                    error: "Trigger is disabled",
                    statusCode: 403
                };
            }

            // Validate webhook authentication
            const config = trigger.config as WebhookTriggerConfig;
            if (config.authType === 'hmac' && trigger.webhook_secret) {
                const isValid = this.verifyHmacSignature(
                    requestData,
                    trigger.webhook_secret
                );
                if (!isValid) {
                    await this.logWebhookRequest(triggerId, requestData, 401, null, "Invalid signature");
                    return {
                        success: false,
                        message: "Invalid webhook signature",
                        error: "Authentication failed",
                        statusCode: 401
                    };
                }
            }

            // Validate HTTP method if specified
            if (config.method && config.method !== 'ANY') {
                if (requestData.method.toUpperCase() !== config.method) {
                    await this.logWebhookRequest(
                        triggerId,
                        requestData,
                        405,
                        null,
                        `Method not allowed. Expected ${config.method}, got ${requestData.method}`
                    );
                    return {
                        success: false,
                        message: `Method not allowed. Expected ${config.method}`,
                        error: "Method not allowed",
                        statusCode: 405
                    };
                }
            }

            // Check allowed origins if specified
            if (config.allowedOrigins && config.allowedOrigins.length > 0) {
                const origin = requestData.headers['origin'] as string;
                if (origin && !config.allowedOrigins.includes(origin)) {
                    await this.logWebhookRequest(triggerId, requestData, 403, null, "Origin not allowed");
                    return {
                        success: false,
                        message: "Origin not allowed",
                        error: "Forbidden",
                        statusCode: 403
                    };
                }
            }

            // Prepare payload from request
            const payload = {
                headers: requestData.headers,
                body: requestData.body,
                query: requestData.query,
                method: requestData.method,
                timestamp: new Date().toISOString(),
                triggerId: triggerId
            };

            // Trigger workflow execution via Temporal
            const client = await getTemporalClient();
            const workflowId = `webhook-${triggerId}-${Date.now()}`;

            const handle = await client.workflow.start('triggeredWorkflow', {
                taskQueue: 'flowmaestro-orchestrator',
                workflowId,
                args: [{
                    triggerId: trigger.id,
                    workflowId: trigger.workflow_id,
                    payload
                }]
            });

            const executionId = handle.workflowId;

            console.log(`Started workflow execution ${executionId} from webhook trigger ${triggerId}`);

            // Log successful webhook
            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                triggerId,
                requestData,
                202,
                { executionId, message: "Workflow triggered" },
                null,
                executionId,
                processingTime
            );

            // Return response based on config
            const responseFormat = config.responseFormat || 'json';
            if (responseFormat === 'text') {
                return {
                    success: true,
                    executionId,
                    message: "OK",
                    statusCode: 202
                };
            }

            return {
                success: true,
                executionId,
                message: "Workflow execution started",
                statusCode: 202
            };
        } catch (error) {
            console.error(`Error processing webhook for trigger ${triggerId}:`, error);

            const processingTime = Date.now() - startTime;
            await this.logWebhookRequest(
                triggerId,
                requestData,
                500,
                null,
                `Internal error: ${error}`,
                undefined,
                processingTime
            );

            return {
                success: false,
                message: "Internal server error",
                error: String(error),
                statusCode: 500
            };
        }
    }

    /**
     * Verify HMAC signature for webhook authentication
     */
    private verifyHmacSignature(
        requestData: WebhookRequestData,
        secret: string
    ): boolean {
        try {
            // Get signature from headers (common patterns)
            const signature =
                requestData.headers['x-hub-signature-256'] ||
                requestData.headers['x-signature'] ||
                requestData.headers['x-webhook-signature'];

            if (!signature) {
                console.warn('No signature found in webhook request headers');
                return false;
            }

            // Extract signature value (remove algorithm prefix if present)
            let signatureValue = String(signature);
            if (signatureValue.includes('=')) {
                signatureValue = signatureValue.split('=')[1];
            }

            // Calculate expected signature
            const payload = JSON.stringify(requestData.body);
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            // Compare signatures (timing-safe comparison)
            return crypto.timingSafeEqual(
                Buffer.from(signatureValue),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            return false;
        }
    }

    /**
     * Log webhook request for debugging and auditing
     */
    private async logWebhookRequest(
        triggerId: string,
        requestData: WebhookRequestData,
        responseStatus: number,
        responseBody: any,
        error: string | null,
        executionId?: string,
        processingTimeMs?: number
    ): Promise<void> {
        try {
            const trigger = await this.triggerRepo.findById(triggerId);

            await this.triggerRepo.createWebhookLog({
                trigger_id: triggerId,
                workflow_id: trigger?.workflow_id,
                request_method: requestData.method,
                request_path: requestData.path,
                request_headers: requestData.headers,
                request_body: requestData.body,
                request_query: requestData.query,
                response_status: responseStatus,
                response_body: responseBody,
                error: error || undefined,
                execution_id: executionId,
                ip_address: requestData.ip,
                user_agent: requestData.userAgent,
                processing_time_ms: processingTimeMs
            });
        } catch (err) {
            console.error('Failed to log webhook request:', err);
            // Don't throw - logging failures shouldn't break webhook processing
        }
    }

    /**
     * Get webhook URL for a trigger
     */
    getWebhookUrl(triggerId: string, baseUrl: string): string {
        return `${baseUrl}/api/webhooks/${triggerId}`;
    }

    /**
     * Get webhook logs for a trigger
     */
    async getWebhookLogs(triggerId: string, options: { limit?: number; offset?: number } = {}) {
        return this.triggerRepo.findWebhookLogsByTriggerId(triggerId, options);
    }
}
