/**
 * Analytics Aggregation Service
 * Aggregates execution span data into analytics tables
 */

import { db } from "../../storage/database";

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
                DATE_TRUNC('hour', s.start_time) as hour,
                s.user_id,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END as entity_type,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global') as entity_id,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE s.status = 'completed') as successful_executions,
                COUNT(*) FILTER (WHERE s.status = 'failed' OR s.status = 'error') as failed_executions,
                AVG(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as avg_duration_ms,
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
            WHERE s.start_time >= $1
                AND s.start_time < $2
                AND s.span_type IN ('WORKFLOW_RUN', 'AGENT_RUN')
                AND s.end_time IS NOT NULL
            GROUP BY DATE_TRUNC('hour', s.start_time), s.user_id, entity_type, entity_id
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
                DATE(s.start_time) as date,
                s.user_id,
                CASE
                    WHEN s.span_type = 'WORKFLOW_RUN' THEN 'workflow'
                    WHEN s.span_type = 'AGENT_RUN' THEN 'agent'
                    ELSE 'global'
                END as entity_type,
                COALESCE(s.attributes->>'workflowId', s.attributes->>'agentId', 'global') as entity_id,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE s.status = 'completed') as successful_executions,
                COUNT(*) FILTER (WHERE s.status = 'failed' OR s.status = 'error') as failed_executions,
                AVG(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as avg_duration_ms,
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
            WHERE s.start_time >= $1
                AND s.start_time < $2
                AND s.span_type IN ('WORKFLOW_RUN', 'AGENT_RUN')
                AND s.end_time IS NOT NULL
            GROUP BY DATE(s.start_time), s.user_id, entity_type, entity_id
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
                DATE(s.start_time) as date,
                s.user_id,
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
                AVG(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as avg_duration_ms,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as p50_duration_ms,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as p95_duration_ms,
                PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (s.end_time - s.start_time)) * 1000) as p99_duration_ms
            FROM flowmaestro.execution_spans s
            WHERE s.start_time >= $1
                AND s.start_time < $2
                AND s.span_type = 'MODEL_GENERATION'
                AND s.end_time IS NOT NULL
                AND s.attributes->>'provider' IS NOT NULL
                AND s.attributes->>'model' IS NOT NULL
            GROUP BY DATE(s.start_time), s.user_id, s.attributes->>'provider', s.attributes->>'model'
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
