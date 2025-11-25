import type { MessengerWebhookPayload, MessengerWebhookMessagingEvent } from "../types";
import type { FastifyBaseLogger } from "fastify";

/**
 * Facebook Webhook Event Types (for Messenger)
 */
export type FacebookWebhookEvent =
    | { type: "message"; data: FacebookMessageEvent }
    | { type: "postback"; data: FacebookPostbackEvent }
    | { type: "read"; data: FacebookReadEvent }
    | { type: "delivery"; data: FacebookDeliveryEvent }
    | { type: "reaction"; data: FacebookReactionEvent }
    | { type: "referral"; data: FacebookReferralEvent };

export interface FacebookMessageEvent {
    pageId: string;
    senderId: string; // PSID
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
    appId?: string;
    metadata?: string;
    replyTo?: string;
}

export interface FacebookPostbackEvent {
    pageId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    title: string;
    payload: string;
    referral?: {
        ref?: string;
        source?: string;
        type?: string;
    };
}

export interface FacebookReadEvent {
    pageId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    watermark: number;
}

export interface FacebookDeliveryEvent {
    pageId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    messageIds?: string[];
    watermark: number;
}

export interface FacebookReactionEvent {
    pageId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    messageId: string;
    action: "react" | "unreact";
    emoji?: string;
}

export interface FacebookReferralEvent {
    pageId: string;
    senderId: string;
    recipientId: string;
    timestamp: Date;
    ref?: string;
    source?: string;
    type?: string;
    adId?: string;
}

/**
 * Facebook Webhook Handler
 *
 * Processes incoming Facebook Messenger webhook events and routes them to appropriate handlers.
 * This is the central place for handling all Facebook page webhooks.
 */
export class FacebookWebhookHandler {
    /**
     * Handle incoming Facebook webhook
     */
    async handleWebhook(
        payload: MessengerWebhookPayload,
        logger: FastifyBaseLogger
    ): Promise<void> {
        logger.info(`[FacebookWebhook] Processing webhook with ${payload.entry.length} entries`);

        for (const entry of payload.entry) {
            const pageId = entry.id;

            // Handle messaging events
            if (entry.messaging) {
                for (const event of entry.messaging) {
                    try {
                        await this.handleMessagingEvent(pageId, event, logger);
                    } catch (error) {
                        logger.error(`[FacebookWebhook] Error processing event: ${error}`);
                        // Continue processing other events
                    }
                }
            }

            // Handle standby events (when app is not primary receiver)
            if (entry.standby) {
                for (const _event of entry.standby) {
                    logger.debug("[FacebookWebhook] Standby event received (not primary receiver)");
                    // Optionally process standby events
                }
            }
        }
    }

    /**
     * Handle a single messaging event
     */
    private async handleMessagingEvent(
        pageId: string,
        event: MessengerWebhookMessagingEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        const timestamp = new Date(event.timestamp);

        if (event.message) {
            // Skip echo messages (messages sent by us)
            if (event.message.is_echo) {
                logger.debug(`[FacebookWebhook] Skipping echo message: ${event.message.mid}`);
                return;
            }

            const messageEvent: FacebookMessageEvent = {
                pageId,
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
                appId: event.message.app_id,
                metadata: event.message.metadata,
                replyTo: event.message.reply_to?.mid
            };

            logger.info(
                `[FacebookWebhook] Received message: from=${event.sender.id}, type=${event.message.text ? "text" : "attachment"}`
            );

            await this.processMessageEvent(messageEvent, logger);
        }

        if (event.postback) {
            const postbackEvent: FacebookPostbackEvent = {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                title: event.postback.title,
                payload: event.postback.payload,
                referral: event.postback.referral
            };

            logger.info(`[FacebookWebhook] Postback: ${event.postback.title}`);

            await this.processPostbackEvent(postbackEvent, logger);
        }

        if (event.read) {
            const readEvent: FacebookReadEvent = {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                watermark: event.read.watermark
            };

            logger.debug(`[FacebookWebhook] Message read: watermark=${event.read.watermark}`);

            await this.processReadEvent(readEvent, logger);
        }

        if (event.delivery) {
            const deliveryEvent: FacebookDeliveryEvent = {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageIds: event.delivery.mids,
                watermark: event.delivery.watermark
            };

            logger.debug(`[FacebookWebhook] Delivery: watermark=${event.delivery.watermark}`);

            await this.processDeliveryEvent(deliveryEvent, logger);
        }

        if (event.referral) {
            const referralEvent: FacebookReferralEvent = {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                ref: event.referral.ref,
                source: event.referral.source,
                type: event.referral.type,
                adId: event.referral.ad_id
            };

            logger.info(`[FacebookWebhook] Referral: source=${event.referral.source}`);

            await this.processReferralEvent(referralEvent, logger);
        }

        if (event.reaction) {
            const reactionEvent: FacebookReactionEvent = {
                pageId,
                senderId: event.sender.id,
                recipientId: event.recipient.id,
                timestamp,
                messageId: event.reaction.mid,
                action: event.reaction.action,
                emoji: event.reaction.emoji || event.reaction.reaction
            };

            logger.info(
                `[FacebookWebhook] Reaction: ${event.reaction.action} on ${event.reaction.mid}`
            );

            await this.processReactionEvent(reactionEvent, logger);
        }
    }

    /**
     * Process incoming message event
     */
    private async processMessageEvent(
        event: FacebookMessageEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement message processing
        // 1. Look up connections/triggers by pageId
        // 2. Check if there are any workflows configured for this page
        // 3. If found, trigger the workflow with the message data
        // 4. Optionally store in a messages table for history

        logger.info(
            `[FacebookWebhook] Processing message event: from=${event.senderId}, hasText=${!!event.text}`
        );
    }

    /**
     * Process postback event (button click)
     */
    private async processPostbackEvent(
        event: FacebookPostbackEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement postback processing
        // 1. Parse payload to determine action
        // 2. Trigger appropriate workflow

        logger.info(
            `[FacebookWebhook] Processing postback: ${event.title}, payload=${event.payload}`
        );
    }

    /**
     * Process message read event
     */
    private async processReadEvent(
        event: FacebookReadEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement read receipt processing
        // 1. Update message status in database
        // 2. Emit event for real-time UI updates

        logger.debug(`[FacebookWebhook] Processing read event: watermark=${event.watermark}`);
    }

    /**
     * Process message delivery event
     */
    private async processDeliveryEvent(
        event: FacebookDeliveryEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement delivery processing
        // 1. Update message status in database

        logger.debug(`[FacebookWebhook] Processing delivery event: watermark=${event.watermark}`);
    }

    /**
     * Process referral event (ad click, m.me link, etc.)
     */
    private async processReferralEvent(
        event: FacebookReferralEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement referral processing
        // 1. Track the referral source
        // 2. Trigger welcome workflow if configured

        logger.info(
            `[FacebookWebhook] Processing referral: source=${event.source}, ref=${event.ref}`
        );
    }

    /**
     * Process reaction event
     */
    private async processReactionEvent(
        event: FacebookReactionEvent,
        logger: FastifyBaseLogger
    ): Promise<void> {
        // TODO: Implement reaction processing

        logger.info(
            `[FacebookWebhook] Processing reaction: ${event.action} ${event.emoji || ""} on ${event.messageId}`
        );
    }
}
