/**
 * Example Workflow State Schemas
 *
 * This file demonstrates how to define stateSchema validation for workflows.
 * Schemas are defined using Zod and attached to workflow definitions at runtime.
 */

import { z } from "zod";
import type { WorkflowDefinition } from "@flowmaestro/shared";
import {
    createValidatedWorkflow,
    CommonWorkflowSchemas,
    CommonWorkflowOutputSchemas
} from "./workflow-state-validation";

/**
 * Example 1: Text Processing Workflow
 *
 * Input: text to process
 * Output: processed text result
 */
export function createTextProcessingWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            text: z.string().min(1, "Input text cannot be empty").max(10000, "Text too long")
        }),
        outputs: z.object({
            processedText: z.string(),
            wordCount: z.number().int().positive(),
            language: z.string().optional()
        })
    });
}

/**
 * Example 2: Data Enrichment Workflow
 *
 * Input: user data to enrich
 * Output: enriched user data
 */
export function createDataEnrichmentWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            userId: z.string().uuid(),
            email: z.string().email(),
            name: z.string().min(1)
        }),
        outputs: z.object({
            userId: z.string().uuid(),
            email: z.string().email(),
            name: z.string(),
            enrichedData: z.object({
                company: z.string().optional(),
                jobTitle: z.string().optional(),
                location: z.string().optional(),
                linkedInUrl: z.string().url().optional()
            })
        })
    });
}

/**
 * Example 3: Webhook-Triggered Workflow
 *
 * Uses pre-defined webhook schema for inputs
 */
export function createWebhookWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: CommonWorkflowSchemas.webhookInput,
        outputs: CommonWorkflowOutputSchemas.statusOutput
    });
}

/**
 * Example 4: File Processing Workflow
 *
 * Processes uploaded files with strict validation
 */
export function createFileProcessingWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            fileUrl: z.string().url("Invalid file URL"),
            fileName: z.string().min(1, "File name required"),
            mimeType: z
                .enum(["application/pdf", "image/jpeg", "image/png", "text/plain"])
                .optional(),
            maxSizeBytes: z.number().int().positive().optional()
        }),
        outputs: z.object({
            success: z.boolean(),
            extractedText: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
            error: z.string().optional()
        })
    });
}

/**
 * Example 5: Multi-Step LLM Workflow
 *
 * Complex workflow with multiple LLM calls
 */
export function createLLMChainWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            prompt: z.string().min(1, "Prompt cannot be empty"),
            model: z.enum(["gpt-4", "gpt-3.5-turbo", "claude-3-sonnet", "claude-3-opus"]),
            temperature: z.number().min(0).max(2).optional().default(0.7),
            maxTokens: z.number().int().positive().optional()
        }),
        outputs: z.object({
            finalResponse: z.string(),
            intermediateResults: z.array(
                z.object({
                    step: z.string(),
                    result: z.string(),
                    tokensUsed: z.number().int().optional()
                })
            ),
            totalTokensUsed: z.number().int().optional(),
            totalCost: z.number().optional()
        }),
        // Optional: validate execution context at checkpoints
        context: z
            .object({
                // Execution state should always have these fields
                currentStep: z.number().int().min(0).optional(),
                completedSteps: z.array(z.string()).optional()
            })
            .passthrough() // Allow additional context fields
    });
}

/**
 * Example 6: Scheduled Report Workflow
 *
 * Generates reports on a schedule
 */
export function createScheduledReportWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            reportType: z.enum(["daily", "weekly", "monthly"]),
            startDate: z.string().datetime(),
            endDate: z.string().datetime(),
            recipients: z.array(z.string().email()).min(1, "At least one recipient required"),
            includeCharts: z.boolean().default(true)
        }),
        outputs: z.object({
            reportUrl: z.string().url(),
            generatedAt: z.string().datetime(),
            rowCount: z.number().int().nonnegative(),
            emailsSent: z.number().int().nonnegative()
        })
    });
}

/**
 * Example 7: API Integration Workflow
 *
 * Fetches data from external API and processes it
 */
export function createAPIIntegrationWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            apiEndpoint: z.string().url(),
            method: z.enum(["GET", "POST", "PUT", "DELETE"]),
            headers: z.record(z.string()).optional(),
            body: z.record(z.unknown()).optional(),
            timeout: z.number().int().positive().optional().default(30000)
        }),
        outputs: z.object({
            success: z.boolean(),
            statusCode: z.number().int().min(100).max(599),
            data: z.unknown(),
            error: z.string().optional(),
            responseTime: z.number().int().nonnegative()
        })
    });
}

/**
 * Example 8: Conditional Branching Workflow
 *
 * Workflow with conditional logic and different output shapes
 */
export function createConditionalWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: z.object({
            condition: z.enum(["pathA", "pathB", "pathC"]),
            data: z.record(z.unknown())
        }),
        outputs: z.discriminatedUnion("path", [
            z.object({
                path: z.literal("pathA"),
                resultA: z.string()
            }),
            z.object({
                path: z.literal("pathB"),
                resultB: z.number()
            }),
            z.object({
                path: z.literal("pathC"),
                resultC: z.boolean()
            })
        ])
    });
}

/**
 * Helper function to create a basic workflow with text I/O
 */
export function createSimpleTextWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition, {
        inputs: CommonWorkflowSchemas.textInput,
        outputs: CommonWorkflowOutputSchemas.textOutput
    });
}

/**
 * Helper function to create a workflow with no validation
 */
export function createUnvalidatedWorkflow(definition: WorkflowDefinition) {
    return createValidatedWorkflow(definition);
}
