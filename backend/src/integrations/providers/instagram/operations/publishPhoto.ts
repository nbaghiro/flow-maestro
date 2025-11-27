import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { InstagramClient } from "../client/InstagramClient";
import type { InstagramPublishResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Publish Photo operation schema
 */
export const publishPhotoSchema = z.object({
    igAccountId: z.string().describe("The Instagram Business Account ID"),
    imageUrl: z.string().url().describe("Public URL of the image (JPG/PNG, max 8MB)"),
    caption: z.string().max(2200).optional().describe("Caption for the post (max 2200 characters)"),
    locationId: z.string().optional().describe("Location ID to tag in the post")
});

export type PublishPhotoParams = z.infer<typeof publishPhotoSchema>;

/**
 * Publish Photo operation definition
 */
export const publishPhotoOperation: OperationDefinition = (() => {
    try {
        return {
            id: "publishPhoto",
            name: "Publish Photo",
            description: "Publish a single photo to Instagram feed",
            category: "publishing",
            inputSchema: publishPhotoSchema,
            inputSchemaJSON: toJSONSchema(publishPhotoSchema),
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        console.error("[Instagram] Failed to create publishPhotoOperation:", error);
        throw new Error(
            `Failed to create publishPhoto operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute publish photo operation
 */
export async function executePublishPhoto(
    client: InstagramClient,
    params: PublishPhotoParams
): Promise<OperationResult> {
    try {
        const response = await client.publishPhoto(
            params.igAccountId,
            params.imageUrl,
            params.caption,
            params.locationId
        );

        // Get the permalink for the published post
        const media = await client.getMedia(response.id);

        const data: InstagramPublishResponse = {
            mediaId: response.id,
            permalink: media.permalink
        };

        return {
            success: true,
            data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to publish photo",
                retryable: true
            }
        };
    }
}
