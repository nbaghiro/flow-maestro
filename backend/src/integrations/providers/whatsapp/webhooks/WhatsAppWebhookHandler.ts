import type {
    WhatsAppWebhookPayload,
    WhatsAppWebhookMessagesValue,
    WhatsAppWebhookMessage,
    WhatsAppWebhookTemplateStatusValue
} from "../types";
import type { FastifyBaseLogger } from "fastify";

/**
 * WhatsApp Webhook Event Types
 */
export type WhatsAppWebhookEvent =
    | { type: "message"; data: WhatsAppMessageEvent }
    | { type: "status"; data: WhatsAppStatusEvent }
    | { type: "template_status"; data: WhatsAppTemplateStatusEvent };

export interface WhatsAppMessageEvent {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    from: string;
    fromName?: string;
    message: WhatsAppWebhookMessage;
    timestamp: Date;
}

export interface WhatsAppStatusEvent {
    wabaId: string;
    phoneNumberId: string;
    messageId: string;
    status: "sent" | "delivered" | "read" | "failed";
    recipientId: string;
    timestamp: Date;
    errors?: Array<{
        code: number;
        title: string;
        message: string;
    }>;
}

export interface WhatsAppTemplateStatusEvent {
    wabaId: string;
    templateId: string;
    templateName: string;
    language: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED";
    reason?: string;
}

/**
 * WhatsApp Webhook Handler
 *
 * Processes incoming WhatsApp webhook events and routes them to appropriate handlers.
 * This is the central place for handling all WhatsApp Business API webhooks.
 */
export class WhatsAppWebhookHandler {
    /**
     * Handle incoming WhatsApp webhook
     */
    async handleWebhook(payload: WhatsAppWebhookPayload, logger: FastifyBaseLogger): Promise<void> {
        logger.info(`[WhatsAppWebhook] Processing webhook with ${payload.entry.length} entries`);

        for (const entry of payload.entry) {
            const wabaId = entry.id;

            for (const change of entry.changes) {
                try {
                    if (change.field === "messages") {
                        await this.handleMessagesChange(
                            wabaId,
                            change.value as WhatsAppWebhookMessagesValue,
                            logger
                        );
                    } else if (change.field === "message_template_status_update") {
                        await this.handleTemplateStatusChange(
                            wabaId,
                            change.value as WhatsAppWebhookTemplateStatusValue,
                            logger
                        );
                    } else {
                        logger.warn(`[WhatsAppWebhook] Unknown change field: ${change.field}`);
                    }
                } catch (error) {
                    logger.error(`[WhatsAppWebhook] Error processing change: ${error}`);
                    // Continue processing other changes
                }
            }
        }
    }

    /**
     * Handle messages field changes (incoming messages and status updates)
     */
    private async handleMessagesChange(
        wabaId: string,
        value: WhatsAppWebhookMessagesValue,
        logger: FastifyBaseLogger
    ): Promise<void> {
        const { metadata, contacts, messages, statuses, errors } = value;

        // Log any errors
        if (errors && errors.length > 0) {
            for (const error of errors) {
                logger.error(
                    `[WhatsAppWebhook] Error from Meta: code=${error.code}, title=${error.title}, message=${error.message}`
                );
            }
        }

        // Process incoming messages
        if (messages && messages.length > 0) {
            for (const message of messages) {
                const contact = contacts?.find((c) => c.wa_id === message.from);

                const event: WhatsAppMessageEvent = {
                    wabaId,
                    phoneNumberId: metadata.phone_number_id,
                    displayPhoneNumber: metadata.display_phone_number,
                    from: message.from,
                    fromName: contact?.profile?.name,
                    message,
                    timestamp: new Date(parseInt(message.timestamp) * 1000)
                };

                logger.info(
                    `[WhatsAppWebhook] Received message: type=${message.type}, from=${message.from}, phoneNumberId=${metadata.phone_number_id}`
                );

                await this.processMessageEvent(event, logger);
            }
        }

        // Process status updates
        if (statuses && statuses.length > 0) {
            for (const status of statuses) {
                const event: WhatsAppStatusEvent = {
                    wabaId,
                    phoneNumberId: metadata.phone_number_id,
                    messageId: status.id,
                    status: status.status,
                    recipientId: status.recipient_id,
                    timestamp: new Date(parseInt(status.timestamp) * 1000),
                    errors: status.errors
                };

                logger.info(
                    `[WhatsAppWebhook] Status update: messageId=${status.id}, status=${status.status}`
                );

                await this.processStatusEvent(event, logger);
            }
        }
    }

    /**
     * Handle template status changes
     */
    private async handleTemplateStatusChange(
        wabaId: string,
        value: WhatsAppWebhookTemplateStatusValue,
        logger: FastifyBaseLogger
    ): Promise<void> {
        const event: WhatsAppTemplateStatusEvent = {
            wabaId,
            templateId: value.message_template_id,
            templateName: value.message_template_name,
            language: value.message_template_language,
            status: value.event,
            reason: value.reason
        };

        logger.info(
            `[WhatsAppWebhook] Template status update: name=${value.message_template_name}, status=${value.event}`
        );

        await this.processTemplateStatusEvent(event, logger);
    }

    /**
     * Process incoming message event
     *
     * This is where we can:
     * - Trigger workflows based on message content
     * - Store message in conversation history
     * - Forward to AI agents for processing
     */
    private async processMessageEvent(
        event: WhatsAppMessageEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement message processing
        // 1. Look up connections/triggers by phoneNumberId
        // 2. Check if there are any workflows configured for this phone number
        // 3. If found, trigger the workflow with the message data
        // 4. Optionally store in a messages table for history

        logger.info(
            `[WhatsAppWebhook] Processing message event: type=${event.message.type}, from=${event.from}`
        );

        // For now, just log the event
        // Future implementation will:
        // - Query WebhookSubscription table to find matching triggers
        // - Execute associated workflows via Temporal
        // - Update conversation state if needed
    }

    /**
     * Process message status event
     */
    private async processStatusEvent(
        event: WhatsAppStatusEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement status processing
        // 1. Update message status in database
        // 2. Emit event for real-time UI updates
        // 3. Handle failures (retry logic, notifications)

        logger.info(
            `[WhatsAppWebhook] Processing status event: messageId=${event.messageId}, status=${event.status}`
        );
    }

    /**
     * Process template status event
     */
    private async processTemplateStatusEvent(
        event: WhatsAppTemplateStatusEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement template status processing
        // 1. Update template status in cache/database
        // 2. Notify users if template was rejected
        // 3. Update workflow configurations if needed

        logger.info(
            `[WhatsAppWebhook] Processing template status: name=${event.templateName}, status=${event.status}`
        );
    }
}
