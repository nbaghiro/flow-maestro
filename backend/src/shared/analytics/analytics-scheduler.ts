/**
 * Analytics Scheduler
 * Schedules periodic analytics aggregation jobs
 */

import { analyticsAggregator } from "./analytics-aggregator";

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
