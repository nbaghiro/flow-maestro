import { z } from "zod";

/**
 * Common GitHub schema definitions for reuse across operations
 */

// Repository name (e.g., "flowmaestro" or "owner/repo")
export const GitHubRepoNameSchema = z
    .string()
    .min(1, "Repository name is required")
    .describe("Repository name or owner/repo format");

// Repository owner (username or organization)
export const GitHubOwnerSchema = z
    .string()
    .min(1, "Owner is required")
    .describe("Repository owner (username or organization)");

// Issue or PR number
export const GitHubIssueNumberSchema = z
    .number()
    .int()
    .positive()
    .describe("Issue or pull request number");

// Branch name
export const GitHubBranchSchema = z
    .string()
    .min(1, "Branch name is required")
    .describe("Git branch name");

// Commit SHA
export const GitHubShaSchema = z
    .string()
    .regex(/^[a-f0-9]{40}$/, "Must be a valid SHA-1 hash")
    .optional()
    .describe("Commit SHA (40 character hex string)");

// Title (for issues, PRs, etc.)
export const GitHubTitleSchema = z
    .string()
    .min(1, "Title is required")
    .max(256, "Title must be 256 characters or less")
    .describe("Title");

// Body/description (markdown)
export const GitHubBodySchema = z.string().optional().describe("Markdown body/description");

// Label
export const GitHubLabelSchema = z.string().min(1).describe("Label name");

// Array of labels
export const GitHubLabelsSchema = z
    .array(GitHubLabelSchema)
    .optional()
    .describe("Array of label names");

// Assignee username
export const GitHubAssigneeSchema = z.string().optional().describe("Assignee username");

// Array of assignees
export const GitHubAssigneesSchema = z
    .array(z.string())
    .optional()
    .describe("Array of assignee usernames");

// Issue/PR state
export const GitHubStateSchema = z
    .enum(["open", "closed", "all"])
    .optional()
    .default("open")
    .describe("Filter by state");

// Sort field
export const GitHubSortSchema = z
    .enum(["created", "updated", "comments"])
    .optional()
    .default("created")
    .describe("Sort field");

// Sort direction
export const GitHubDirectionSchema = z
    .enum(["asc", "desc"])
    .optional()
    .default("desc")
    .describe("Sort direction");

// Repository visibility
export const GitHubVisibilitySchema = z
    .enum(["public", "private"])
    .optional()
    .default("public")
    .describe("Repository visibility");

// Repository description
export const GitHubDescriptionSchema = z
    .string()
    .max(350, "Description must be 350 characters or less")
    .optional()
    .describe("Repository description");

// Homepage URL
export const GitHubHomepageSchema = z.string().url().optional().describe("Project homepage URL");

// Merge method for PRs
export const GitHubMergeMethodSchema = z
    .enum(["merge", "squash", "rebase"])
    .optional()
    .default("merge")
    .describe("Merge method");

// Workflow ID (can be number or filename)
export const GitHubWorkflowIdSchema = z
    .union([z.number().int().positive(), z.string().min(1)])
    .describe("Workflow ID or filename (e.g., 'main.yml')");

// Workflow run status
export const GitHubWorkflowStatusSchema = z
    .enum(["queued", "in_progress", "completed"])
    .optional()
    .describe("Workflow run status filter");

// Workflow run conclusion
export const GitHubWorkflowConclusionSchema = z
    .enum(["success", "failure", "neutral", "cancelled", "skipped", "timed_out", "action_required"])
    .optional()
    .describe("Workflow run conclusion filter");

// Review state for PR reviews
export const GitHubReviewStateSchema = z
    .enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"])
    .describe("Review state");

// Per page pagination
export const GitHubPerPageSchema = z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(30)
    .describe("Results per page (max 100)");

// Page number
export const GitHubPageSchema = z
    .number()
    .int()
    .min(1)
    .optional()
    .default(1)
    .describe("Page number");

// Boolean flags
export const GitHubBooleanSchema = z.boolean().optional().describe("Boolean flag");

// Inputs for workflow dispatch (freeform JSON)
export const GitHubWorkflowInputsSchema = z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Workflow inputs (key-value pairs)");
