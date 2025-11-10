/**
 * Analytics Routes
 * Endpoints for analytics and usage statistics
 */

import { FastifyInstance } from "fastify";
import { getDailyAnalyticsRoute } from "./daily";
import { getModelAnalyticsRoute } from "./models";
import { getAnalyticsOverviewRoute } from "./overview";

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
    // Register all analytics routes
    await getAnalyticsOverviewRoute(fastify);
    await getDailyAnalyticsRoute(fastify);
    await getModelAnalyticsRoute(fastify);
}
