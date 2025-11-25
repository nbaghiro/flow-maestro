import type { InstagramWebhookPayload, InstagramWebhookMessagingEvent } from "../types";
import type { FastifyBaseLogger } from "fastify";

/**
 * Instagram Webhook Event Types
 */
export type InstagramWebhookEvent =
    | { type: "message"; data: InstagramMessageEvent }
    | { type: "read"; data: InstagramReadEvent }
    | { type: "reaction"; data: InstagramReactionEvent }
    | { type: "postback"; data: InstagramPostbackEvent };

export interface InstagramMessageEvent {
    igAccountId: string;
    senderId: string; // IGSID
    recipientId: string;
    timestamp: Date;
    messageId: string;
    text?: string;
    attachments?: Array<{
        type: string;
        url?: string;
    }>;
    quickReplyPayload?: string;
    isEcho?: boolean;
    replyTo?: string;
}

export interface InstagramReadEvent {
    igAccountId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    messageId: string;
}

export interface InstagramReactionEvent {
    igAccountId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    messageId: string;
    action: "react" | "unreact";
    emoji?: string;
}

export interface InstagramPostbackEvent {
    igAccountId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    messageId: string;
    title: string;
    payload: string;
}

/**
 * Instagram Webhook Handler
 *
 * Processes incoming Instagram webhook events and routes them to appropriate handlers.
 * This is the central place for handling all Instagram DM webhooks.
 */
export class InstagramWebhookHandler {
    /**
     * Handle incoming Instagram webhook
     */
    async handleWebhook(
        payload: InstagramWebhookPayload,
        logger: FastifyBaseLogger
    ): Promise<void> {
        logger.info(`[InstagramWebhook] Processing webhook with ${payload.entry.length} entries`);

        for (const entry of payload.entry) {
            const igAccountId = entry.id;

            if (entry.messaging) {
                for (const event of entry.messaging) {
                    try {
                        await this.handleMessagingEvent(igAccountId, event, logger);
                    } catch (error) {
                        logger.error(`[InstagramWebhook] Error processing event: ${error}`);
                        // Continue processing other events
                    }
                }
            }
        }
    }

    /**
     * Handle a single messaging event
     */
    private async handleMessagingEvent(
        igAccountId: string,
        event: InstagramWebhookMessagingEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        const timestamp = new Date(event.timestamp);

        if (event.message) {
            // Skip echo messages (messages sent by us)
            if (event.message.is_echo) {
                logger.debug(`[InstagramWebhook] Skipping echo message: ${event.message.mid}`);
                return;
            }

            // Skip deleted messages
            if (event.message.is_deleted) {
                logger.debug(`[InstagramWebhook] Skipping deleted message: ${event.message.mid}`);
                return;
            }

            const messageEvent: InstagramMessageEvent = {
                igAccountId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageId: event.message.mid,
                text: event.message.text,
                attachments: event.message.attachments?.map((att) => ({
                    type: att.type,
                    url: att.payload.url
                })),
                quickReplyPayload: event.message.quick_reply?.payload,
                replyTo: event.message.reply_to?.mid
            };

            logger.info(
                `[InstagramWebhook] Received message: from=${event.sender.id}, type=${event.message.text ? "text" : "attachment"}`
            );

            await this.processMessageEvent(messageEvent, logger);
        }

        if (event.read) {
            const readEvent: InstagramReadEvent = {
                igAccountId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageId: event.read.mid
            };

            logger.info(`[InstagramWebhook] Message read: ${event.read.mid}`);

            await this.processReadEvent(readEvent, logger);
        }

        if (event.reaction) {
            const reactionEvent: InstagramReactionEvent = {
                igAccountId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageId: event.reaction.mid,
                action: event.reaction.action,
                emoji: event.reaction.emoji || event.reaction.reaction
            };

            logger.info(
                `[InstagramWebhook] Reaction: ${event.reaction.action} on ${event.reaction.mid}`
            );

            await this.processReactionEvent(reactionEvent, logger);
        }

        if (event.postback) {
            const postbackEvent: InstagramPostbackEvent = {
                igAccountId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageId: event.postback.mid,
                title: event.postback.title,
                payload: event.postback.payload
            };

            logger.info(`[InstagramWebhook] Postback: ${event.postback.title}`);

            await this.processPostbackEvent(postbackEvent, logger);
        }
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
        event: InstagramMessageEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement message processing
        // 1. Look up connections/triggers by igAccountId
        // 2. Check if there are any workflows configured for this account
        // 3. If found, trigger the workflow with the message data
        // 4. Optionally store in a messages table for history

        logger.info(
            `[InstagramWebhook] Processing message event: from=${event.senderId}, hasText=${!!event.text}`
        );

        // Future implementation will:
        // - Query WebhookSubscription table to find matching triggers
        // - Execute associated workflows via Temporal
        // - Update conversation state if needed
    }

    /**
     * Process message read event
     */
    private async processReadEvent(
        event: InstagramReadEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement read receipt processing
        // 1. Update message status in database
        // 2. Emit event for real-time UI updates

        logger.info(`[InstagramWebhook] Processing read event: messageId=${event.messageId}`);
    }

    /**
     * Process reaction event
     */
    private async processReactionEvent(
        event: InstagramReactionEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement reaction processing
        // 1. Store reaction in database
        // 2. Trigger workflow if configured

        logger.info(
            `[InstagramWebhook] Processing reaction: ${event.action} ${event.emoji || ""} on ${event.messageId}`
        );
    }

    /**
     * Process postback event (button click)
     */
    private async processPostbackEvent(
        event: InstagramPostbackEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement postback processing
        // 1. Parse payload to determine action
        // 2. Trigger appropriate workflow

        logger.info(
            `[InstagramWebhook] Processing postback: ${event.title}, payload=${event.payload}`
        );
    }
}
