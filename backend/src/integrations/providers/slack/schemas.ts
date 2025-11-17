import { z } from "zod";

/**
 * Shared Zod schemas for Slack operations
 */

export const SlackChannelSchema = z
    .string()
    .describe("Channel ID (e.g., C1234567890) or name (e.g., #general)");

export const SlackTextSchema = z
    .string()
    .min(1)
    .max(3000)
    .describe("Message text in plain text or mrkdwn format");

export const SlackThreadTsSchema = z
    .string()
    .optional()
    .describe("Thread timestamp to reply to an existing thread");

export const SlackBlocksSchema = z
    .array(z.any())
    .optional()
    .describe("Array of Slack Block Kit blocks for rich formatting");
