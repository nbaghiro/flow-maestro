#!/usr/bin/env tsx
/**
 * Analytics Service
 * Aggregates execution span data into analytics tables and schedules periodic jobs
 *
 * CLI Usage:
 *   npm run analytics:aggregate                    # Aggregate yesterday's data
 *   npm run analytics:aggregate -- --backfill 30   # Backfill last 30 days
 *   npm run analytics:aggregate -- --date 2024-01-15  # Aggregate specific date
 */

import { db } from "../storage/database";

// ============================================================================
// Analytics Aggregator
// ============================================================================

export class AnalyticsAggregator {
    /**
     * Aggregate hourly analytics from execution spans
     * Processes spans from the last hour (or specified date)
     */
    async aggregateHourlyAnalytics(targetDate?: Date): Promise<void> {
        const date = targetDate || new Date();
        const hourStart = new Date(date);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hourEnd.getHours() + 1);

        console.log(
            `[AnalyticsAggregator] Aggregating hourly analytics for ${hourStart.toISOString()}`
        );

        await db.query(
            `
            INSERT INTO flowmaestro.hourly_analytics (
                hour,
                user_id,
                entity_type,
                entity_id,
                total_executions,
                successful_executions,
                failed_executions,
                avg_duration_ms,
                total_prompt_tokens,
                total_completion_tokens,
                total_tokens,
                total_input_cost,
                total_output_cost,
                total_cost
            )
            SELECT
                DATE_TRUNC('hour', s.started_at) as hour,
                (s.attributes->>'userId')::uuid,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END as entity_type,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global') as entity_id,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE s.status = 'completed') as successful_executions,
                COUNT(*) FILTER (WHERE s.status = 'failed' OR s.status = 'error') as failed_executions,
                AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as avg_duration_ms,
                SUM(COALESCE((s.attributes->>'promptTokens')::bigint, 0)) as total_prompt_tokens,
                SUM(COALESCE((s.attributes->>'completionTokens')::bigint, 0)) as total_completion_tokens,
                SUM(
                    COALESCE((s.attributes->>'promptTokens')::bigint, 0) +
                    COALESCE((s.attributes->>'completionTokens')::bigint, 0)
                ) as total_tokens,
                SUM(COALESCE((s.attributes->>'inputCost')::numeric, 0)) as total_input_cost,
                SUM(COALESCE((s.attributes->>'outputCost')::numeric, 0)) as total_output_cost,
                SUM(COALESCE((s.attributes->>'totalCost')::numeric, 0)) as total_cost
            FROM flowmaestro.execution_spans s
            WHERE s.started_at >= $1
                AND s.started_at < $2
                AND s.span_type IN ('WORKFLOW_RUN', 'AGENT_RUN')
                AND s.ended_at IS NOT NULL
            GROUP BY
                DATE_TRUNC('hour', s.started_at),
                (s.attributes->>'userId')::uuid,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global')
            ON CONFLICT (hour, user_id, entity_type, entity_id)
            DO UPDATE SET
                total_executions = EXCLUDED.total_executions,
                successful_executions = EXCLUDED.successful_executions,
                failed_executions = EXCLUDED.failed_executions,
                avg_duration_ms = EXCLUDED.avg_duration_ms,
                total_prompt_tokens = EXCLUDED.total_prompt_tokens,
                total_completion_tokens = EXCLUDED.total_completion_tokens,
                total_tokens = EXCLUDED.total_tokens,
                total_input_cost = EXCLUDED.total_input_cost,
                total_output_cost = EXCLUDED.total_output_cost,
                total_cost = EXCLUDED.total_cost,
                updated_at = NOW()
            `,
            [hourStart, hourEnd]
        );

        console.log("[AnalyticsAggregator] Hourly analytics aggregation completed");
    }

    /**
     * Aggregate daily analytics from execution spans
     * Processes spans from the last day (or specified date)
     */
    async aggregateDailyAnalytics(targetDate?: Date): Promise<void> {
        const date = targetDate || new Date();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        console.log(
            `[AnalyticsAggregator] Aggregating daily analytics for ${dayStart.toISOString()}`
        );

        await db.query(
            `
            INSERT INTO flowmaestro.daily_analytics (
                date,
                user_id,
                entity_type,
                entity_id,
                total_executions,
                successful_executions,
                failed_executions,
                avg_duration_ms,
                total_prompt_tokens,
                total_completion_tokens,
                total_tokens,
                total_input_cost,
                total_output_cost,
                total_cost
            )
            SELECT
                DATE(s.started_at) as date,
                (s.attributes->>'userId')::uuid,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END as entity_type,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global') as entity_id,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE s.status = 'completed') as successful_executions,
                COUNT(*) FILTER (WHERE s.status = 'failed' OR s.status = 'error') as failed_executions,
                AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as avg_duration_ms,
                SUM(COALESCE((s.attributes->>'promptTokens')::bigint, 0)) as total_prompt_tokens,
                SUM(COALESCE((s.attributes->>'completionTokens')::bigint, 0)) as total_completion_tokens,
                SUM(
                    COALESCE((s.attributes->>'promptTokens')::bigint, 0) +
                    COALESCE((s.attributes->>'completionTokens')::bigint, 0)
                ) as total_tokens,
                SUM(COALESCE((s.attributes->>'inputCost')::numeric, 0)) as total_input_cost,
                SUM(COALESCE((s.attributes->>'outputCost')::numeric, 0)) as total_output_cost,
                SUM(COALESCE((s.attributes->>'totalCost')::numeric, 0)) as total_cost
            FROM flowmaestro.execution_spans s
            WHERE s.started_at >= $1
                AND s.started_at < $2
                AND s.span_type IN ('WORKFLOW_RUN', 'AGENT_RUN')
                AND s.ended_at IS NOT NULL
            GROUP BY
                DATE(s.started_at),
                (s.attributes->>'userId')::uuid,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global')
            ON CONFLICT (date, user_id, entity_type, entity_id)
            DO UPDATE SET
                total_executions = EXCLUDED.total_executions,
                successful_executions = EXCLUDED.successful_executions,
                failed_executions = EXCLUDED.failed_executions,
                avg_duration_ms = EXCLUDED.avg_duration_ms,
                total_prompt_tokens = EXCLUDED.total_prompt_tokens,
                total_completion_tokens = EXCLUDED.total_completion_tokens,
                total_tokens = EXCLUDED.total_tokens,
                total_input_cost = EXCLUDED.total_input_cost,
                total_output_cost = EXCLUDED.total_output_cost,
                total_cost = EXCLUDED.total_cost,
                updated_at = NOW()
            `,
            [dayStart, dayEnd]
        );

        console.log("[AnalyticsAggregator] Daily analytics aggregation completed");
    }

    /**
     * Aggregate model usage statistics
     * Processes MODEL_GENERATION spans from the last day (or specified date)
     */
    async aggregateModelUsageStats(targetDate?: Date): Promise<void> {
        const date = targetDate || new Date();
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        console.log(
            `[AnalyticsAggregator] Aggregating model usage stats for ${dayStart.toISOString()}`
        );

        await db.query(
            `
            INSERT INTO flowmaestro.model_usage_stats (
                date,
                user_id,
                provider,
                model,
                total_calls,
                successful_calls,
                failed_calls,
                total_prompt_tokens,
                total_completion_tokens,
                total_tokens,
                total_input_cost,
                total_output_cost,
                total_cost,
                avg_cost_per_call,
                avg_duration_ms,
                p50_duration_ms,
                p95_duration_ms,
                p99_duration_ms
            )
            SELECT
                DATE(s.started_at) as date,
                (s.attributes->>'userId')::uuid,
                s.attributes->>'provider' as provider,
                s.attributes->>'model' as model,
                COUNT(*) as total_calls,
                COUNT(*) FILTER (WHERE s.status = 'completed') as successful_calls,
                COUNT(*) FILTER (WHERE s.status = 'failed' OR s.status = 'error') as failed_calls,
                SUM(COALESCE((s.attributes->>'promptTokens')::bigint, 0)) as total_prompt_tokens,
                SUM(COALESCE((s.attributes->>'completionTokens')::bigint, 0)) as total_completion_tokens,
                SUM(
                    COALESCE((s.attributes->>'promptTokens')::bigint, 0) +
                    COALESCE((s.attributes->>'completionTokens')::bigint, 0)
                ) as total_tokens,
                SUM(COALESCE((s.attributes->>'inputCost')::numeric, 0)) as total_input_cost,
                SUM(COALESCE((s.attributes->>'outputCost')::numeric, 0)) as total_output_cost,
                SUM(COALESCE((s.attributes->>'totalCost')::numeric, 0)) as total_cost,
                AVG(COALESCE((s.attributes->>'totalCost')::numeric, 0)) as avg_cost_per_call,
                AVG(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as avg_duration_ms,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as p50_duration_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as p95_duration_ms,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.ended_at - s.started_at)) * 1000) as p99_duration_ms
            FROM flowmaestro.execution_spans s
            WHERE s.started_at >= $1
                AND s.started_at < $2
                AND s.span_type = 'MODEL_GENERATION'
                AND s.ended_at IS NOT NULL
                AND s.attributes->>'provider' IS NOT NULL
                AND s.attributes->>'model' IS NOT NULL
            GROUP BY DATE(s.started_at), (s.attributes->>'userId')::uuid, s.attributes->>'provider', s.attributes->>'model'
            ON CONFLICT (date, user_id, provider, model)
            DO UPDATE SET
                total_calls = EXCLUDED.total_calls,
                successful_calls = EXCLUDED.successful_calls,
                failed_calls = EXCLUDED.failed_calls,
                total_prompt_tokens = EXCLUDED.total_prompt_tokens,
                total_completion_tokens = EXCLUDED.total_completion_tokens,
                total_tokens = EXCLUDED.total_tokens,
                total_input_cost = EXCLUDED.total_input_cost,
                total_output_cost = EXCLUDED.total_output_cost,
                total_cost = EXCLUDED.total_cost,
                avg_cost_per_call = EXCLUDED.avg_cost_per_call,
                avg_duration_ms = EXCLUDED.avg_duration_ms,
                p50_duration_ms = EXCLUDED.p50_duration_ms,
                p95_duration_ms = EXCLUDED.p95_duration_ms,
                p99_duration_ms = EXCLUDED.p99_duration_ms,
                updated_at = NOW()
            `,
            [dayStart, dayEnd]
        );

        console.log("[AnalyticsAggregator] Model usage stats aggregation completed");
    }

    /**
     * Refresh the materialized view for recent activity summary
     */
    async refreshRecentActivitySummary(): Promise<void> {
        console.log("[AnalyticsAggregator] Refreshing recent activity summary view");

        await db.query(`
            REFRESH MATERIALIZED VIEW CONCURRENTLY flowmaestro.recent_activity_summary
        `);

        console.log("[AnalyticsAggregator] Recent activity summary refreshed");
    }

    /**
     * Run full aggregation for a specific date
     * Useful for backfilling historical data
     */
    async aggregateForDate(date: Date): Promise<void> {
        console.log(`[AnalyticsAggregator] Running full aggregation for ${date.toISOString()}`);

        await this.aggregateHourlyAnalytics(date);
        await this.aggregateDailyAnalytics(date);
        await this.aggregateModelUsageStats(date);

        console.log(`[AnalyticsAggregator] Full aggregation completed for ${date.toISOString()}`);
    }

    /**
     * Run hourly aggregation (called every hour)
     * Aggregates the previous hour's data
     */
    async runHourlyAggregation(): Promise<void> {
        const now = new Date();
        const previousHour = new Date(now);
        previousHour.setHours(previousHour.getHours() - 1);

        console.log("[AnalyticsAggregator] Running hourly aggregation");

        await this.aggregateHourlyAnalytics(previousHour);

        console.log("[AnalyticsAggregator] Hourly aggregation completed");
    }

    /**
     * Run daily aggregation (called once per day)
     * Aggregates the previous day's data
     */
    async runDailyAggregation(): Promise<void> {
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        console.log("[AnalyticsAggregator] Running daily aggregation");

        await this.aggregateDailyAnalytics(yesterday);
        await this.aggregateModelUsageStats(yesterday);
        await this.refreshRecentActivitySummary();

        console.log("[AnalyticsAggregator] Daily aggregation completed");
    }

    /**
     * Backfill analytics for a date range
     * Useful for populating historical data
     */
    async backfillDateRange(startDate: Date, endDate: Date): Promise<void> {
        console.log(
            `[AnalyticsAggregator] Backfilling analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`
        );

        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            await this.aggregateForDate(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        await this.refreshRecentActivitySummary();

        console.log("[AnalyticsAggregator] Backfill completed");
    }
}

export const analyticsAggregator = new AnalyticsAggregator();

// ============================================================================
// Analytics Scheduler
// ============================================================================

export class AnalyticsScheduler {
    private hourlyInterval: NodeJS.Timeout | null = null;
    private dailyInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the analytics scheduler
     * - Runs hourly aggregation every hour
     * - Runs daily aggregation every day at midnight
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log("[AnalyticsScheduler] Already running");
            return;
        }

        console.log("[AnalyticsScheduler] Starting analytics scheduler");

        // Run hourly aggregation every hour (at the top of the hour)
        this.scheduleHourlyAggregation();

        // Run daily aggregation every day at midnight
        this.scheduleDailyAggregation();

        // Run initial aggregation on startup (for the previous hour and day)
        try {
            console.log("[AnalyticsScheduler] Running initial aggregation on startup");
            await analyticsAggregator.runHourlyAggregation();
            await analyticsAggregator.runDailyAggregation();
        } catch (error) {
            console.error("[AnalyticsScheduler] Error during initial aggregation:", error);
        }

        this.isRunning = true;
        console.log("[AnalyticsScheduler] Analytics scheduler started");
    }

    /**
     * Stop the analytics scheduler
     */
    stop(): void {
        if (!this.isRunning) {
            console.log("[AnalyticsScheduler] Not running");
            return;
        }

        console.log("[AnalyticsScheduler] Stopping analytics scheduler");

        if (this.hourlyInterval) {
            clearInterval(this.hourlyInterval);
            this.hourlyInterval = null;
        }

        if (this.dailyInterval) {
            clearInterval(this.dailyInterval);
            this.dailyInterval = null;
        }

        this.isRunning = false;
        console.log("[AnalyticsScheduler] Analytics scheduler stopped");
    }

    /**
     * Schedule hourly aggregation to run every hour
     */
    private scheduleHourlyAggregation(): void {
        // Calculate time until next hour
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1);
        nextHour.setMinutes(0, 0, 0);
        const msUntilNextHour = nextHour.getTime() - now.getTime();

        console.log(
            `[AnalyticsScheduler] Scheduling hourly aggregation (next run in ${Math.round(msUntilNextHour / 1000 / 60)} minutes)`
        );

        // Schedule first run at the next hour
        setTimeout(() => {
            this.runHourlyAggregation();

            // Then run every hour
            this.hourlyInterval = setInterval(
                () => {
                    this.runHourlyAggregation();
                },
                60 * 60 * 1000
            ); // 1 hour
        }, msUntilNextHour);
    }

    /**
     * Schedule daily aggregation to run every day at midnight
     */
    private scheduleDailyAggregation(): void {
        // Calculate time until midnight
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const msUntilMidnight = midnight.getTime() - now.getTime();

        console.log(
            `[AnalyticsScheduler] Scheduling daily aggregation (next run in ${Math.round(msUntilMidnight / 1000 / 60 / 60)} hours)`
        );

        // Schedule first run at midnight
        setTimeout(() => {
            this.runDailyAggregation();

            // Then run every day
            this.dailyInterval = setInterval(
                () => {
                    this.runDailyAggregation();
                },
                24 * 60 * 60 * 1000
            ); // 24 hours
        }, msUntilMidnight);
    }

    /**
     * Run hourly aggregation task
     */
    private async runHourlyAggregation(): Promise<void> {
        try {
            console.log("[AnalyticsScheduler] Running scheduled hourly aggregation");
            await analyticsAggregator.runHourlyAggregation();
        } catch (error) {
            console.error("[AnalyticsScheduler] Error during hourly aggregation:", error);
        }
    }

    /**
     * Run daily aggregation task
     */
    private async runDailyAggregation(): Promise<void> {
        try {
            console.log("[AnalyticsScheduler] Running scheduled daily aggregation");
            await analyticsAggregator.runDailyAggregation();
        } catch (error) {
            console.error("[AnalyticsScheduler] Error during daily aggregation:", error);
        }
    }
}

export const analyticsScheduler = new AnalyticsScheduler();

// ============================================================================
// CLI Execution
// ============================================================================

function showHelp(): void {
    console.log(`
Analytics Aggregation CLI

Usage:
  npm run analytics:aggregate                         # Aggregate yesterday's data
  npm run analytics:aggregate -- --backfill <days>    # Backfill last N days
  npm run analytics:aggregate -- --date YYYY-MM-DD    # Aggregate specific date

Examples:
  npm run analytics:aggregate                    # Aggregate yesterday
  npm run analytics:aggregate -- --backfill 30   # Backfill last 30 days
  npm run analytics:aggregate -- --date 2024-11-09  # Aggregate Nov 9, 2024

Options:
  --backfill <days>   Backfill analytics for the last N days
  --date <YYYY-MM-DD> Aggregate analytics for a specific date
  -h, --help          Show this help message
    `);
}

async function runCLI(): Promise<void> {
    const args = process.argv.slice(2);

    // Show help if requested
    if (args.includes("--help") || args.includes("-h")) {
        showHelp();
        process.exit(0);
    }

    try {
        if (args.includes("--backfill")) {
            // Backfill mode
            const daysIndex = args.indexOf("--backfill") + 1;
            const days = parseInt(args[daysIndex] || "30", 10);

            const endDate = new Date();
            endDate.setHours(0, 0, 0, 0);

            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - days);

            console.log(`Backfilling analytics for the last ${days} days`);
            console.log(`Start: ${startDate.toISOString()}`);
            console.log(`End: ${endDate.toISOString()}`);

            await analyticsAggregator.backfillDateRange(startDate, endDate);

            console.log("✓ Backfill completed successfully");
        } else if (args.includes("--date")) {
            // Specific date mode
            const dateIndex = args.indexOf("--date") + 1;
            const dateStr = args[dateIndex];

            if (!dateStr) {
                throw new Error("Date argument is required. Format: YYYY-MM-DD");
            }

            const targetDate = new Date(dateStr);
            if (Number.isNaN(targetDate.getTime())) {
                throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD`);
            }

            console.log(`Aggregating analytics for ${targetDate.toISOString()}`);

            await analyticsAggregator.aggregateForDate(targetDate);

            console.log("✓ Aggregation completed successfully");
        } else {
            // Default mode: aggregate yesterday's data
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            console.log(`Aggregating analytics for yesterday (${yesterday.toISOString()})`);

            await analyticsAggregator.aggregateForDate(yesterday);

            console.log("✓ Aggregation completed successfully");
        }
    } catch (error) {
        console.error("✗ Analytics aggregation failed:", error);
        process.exit(1);
    } finally {
        // Close database connection
        await db.close();
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    runCLI();
}
