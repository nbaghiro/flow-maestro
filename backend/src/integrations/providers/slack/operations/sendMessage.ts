import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SlackClient } from "../client/SlackClient";
import {
    SlackChannelSchema,
    SlackTextSchema,
    SlackThreadTsSchema,
    SlackBlocksSchema
} from "../schemas";
import type { SlackMessageResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Send Message operation schema
 */
export const sendMessageSchema = z.object({
    channel: SlackChannelSchema,
    text: SlackTextSchema,
    thread_ts: SlackThreadTsSchema,
    blocks: SlackBlocksSchema
});

export type SendMessageParams = z.infer<typeof sendMessageSchema>;

/**
 * Send Message operation definition
 */
export const sendMessageOperation: OperationDefinition = {
    id: "sendMessage",
    name: "Send Message",
    description: "Send a message to a Slack channel or direct message",
    category: "messaging",
    inputSchema: sendMessageSchema,
    inputSchemaJSON: toJSONSchema(sendMessageSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute send message operation
 */
export async function executeSendMessage(
    client: SlackClient,
    params: SendMessageParams
): Promise<OperationResult> {
    try {
        const response = await client.postMessage({
            channel: params.channel,
            text: params.text,
            thread_ts: params.thread_ts,
            blocks: params.blocks
        });

        const data = response as SlackMessageResponse;

        return {
            success: true,
            data: {
                messageId: data.ts,
                channel: data.channel,
                threadTimestamp: data.ts
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send message",
                retryable: true
            }
        };
    }
}
