#!/usr/bin/env tsx
/**
 * Analytics Aggregation CLI
 * Manual script for running analytics aggregation
 *
 * Usage:
 *   npm run analytics:aggregate                    # Aggregate yesterday's data
 *   npm run analytics:aggregate -- --backfill 30   # Backfill last 30 days
 *   npm run analytics:aggregate -- --date 2024-01-15  # Aggregate specific date
 */

import { analyticsAggregator } from "../shared/analytics/analytics-aggregator";
import { db } from "../storage/database";

async function main() {
    const args = process.argv.slice(2);

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

// Show usage if --help flag is present
if (process.argv.includes("--help") || process.argv.includes("-h")) {
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
    process.exit(0);
}

main();
