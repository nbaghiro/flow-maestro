import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftTeamsClient } from "../client/MicrosoftTeamsClient";

export const sendChatMessageSchema = z.object({
    chatId: z.string().describe("ID of the chat"),
    content: z.string().describe("Message content"),
    contentType: z
        .enum(["text", "html"])
        .optional()
        .default("text")
        .describe("Content type: 'text' or 'html'")
});

export type SendChatMessageParams = z.infer<typeof sendChatMessageSchema>;

export const sendChatMessageOperation: OperationDefinition = {
    id: "sendChatMessage",
    name: "Send Chat Message",
    description: "Send a message to a Microsoft Teams chat",
    category: "messaging",
    inputSchema: sendChatMessageSchema,
    inputSchemaJSON: {
        type: "object",
        required: ["chatId", "content"],
        properties: {
            chatId: { type: "string", description: "ID of the chat" },
            content: { type: "string", description: "Message content" },
            contentType: {
                type: "string",
                enum: ["text", "html"],
                default: "text",
                description: "Content type"
            }
        }
    },
    retryable: true
};

export async function executeSendChatMessage(
    client: MicrosoftTeamsClient,
    params: SendChatMessageParams
): Promise<OperationResult> {
    try {
        const result = await client.sendChatMessage(
            params.chatId,
            params.content,
            params.contentType
        );
        return {
            success: true,
            data: {
                messageId: result.id,
                createdDateTime: result.createdDateTime
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to send chat message",
                retryable: true
            }
        };
    }
}
