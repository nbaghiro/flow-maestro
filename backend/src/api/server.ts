import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import { config } from "../shared/config";
import { errorHandler } from "./middleware";
import { workflowRoutes } from "./routes/workflows";
import { authRoutes } from "./routes/auth";
import { executionRoutes } from "./routes/executions";
import { integrationRoutes } from "./routes/integrations";
import { credentialRoutes } from "./routes/credentials";
import { nodeRoutes } from "./routes/nodes";
import { websocketRoutes } from "./routes/websocket";
import { triggerRoutes } from "./routes/triggers";
import { oauthRoutes } from "./routes/oauth";
import { knowledgeBaseRoutes } from "./routes/knowledge-bases";
import { db } from "../storage/database";
import { eventBridge } from "../shared/websocket/EventBridge";

export async function buildServer() {
    const fastify = Fastify({
        logger: {
            level: config.logLevel,
            transport:
                config.env === "development"
                    ? {
                          target: "pino-pretty",
                          options: {
                              translateTime: "HH:MM:ss Z",
                              ignore: "pid,hostname"
                          }
                      }
                    : undefined
        }
    });

    // Register CORS
    await fastify.register(cors, {
        origin: config.cors.origin,
        credentials: config.cors.credentials
    });

    // Register JWT
    await fastify.register(jwt, {
        secret: config.jwt.secret,
        sign: {
            expiresIn: config.jwt.expiresIn
        }
    });

    // Register WebSocket
    await fastify.register(websocket);

    // Register multipart for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit
        }
    });

    // Initialize event bridge (connect orchestrator events to WebSocket)
    eventBridge.initialize();

    // Health check route
    fastify.get("/health", async (_request, reply) => {
        const dbHealthy = await db.healthCheck();

        if (!dbHealthy) {
            return reply.status(503).send({
                success: false,
                error: "Database connection failed"
            });
        }

        return reply.send({
            success: true,
            data: {
                status: "healthy",
                timestamp: new Date().toISOString()
            }
        });
    });

    // Register routes
    await fastify.register(authRoutes, { prefix: "/api/auth" });
    await fastify.register(workflowRoutes, { prefix: "/api/workflows" });
    await fastify.register(executionRoutes, { prefix: "/api/executions" });
    await fastify.register(integrationRoutes, { prefix: "/api/integrations" });
    await fastify.register(credentialRoutes, { prefix: "/api/credentials" });
    await fastify.register(oauthRoutes, { prefix: "/api/oauth" });
    await fastify.register(nodeRoutes, { prefix: "/api/nodes" });
    await fastify.register(knowledgeBaseRoutes, { prefix: "/api/knowledge-bases" });
    await fastify.register(triggerRoutes, { prefix: "/api" });
    await fastify.register(websocketRoutes);

    // Error handler (must be last)
    fastify.setErrorHandler(errorHandler);

    return fastify;
}

export async function startServer() {
    const fastify = await buildServer();

    try {
        await fastify.listen({
            port: config.server.port,
            host: config.server.host
        });

        fastify.log.info(`Server listening on http://${config.server.host}:${config.server.port}`);
    } catch (error) {
        fastify.log.error(error);
        process.exit(1);
    }

    // Graceful shutdown
    const signals = ["SIGINT", "SIGTERM"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            fastify.log.info(`Received ${signal}, closing server...`);
            await fastify.close();
            await db.close();
            process.exit(0);
        });
    });

    return fastify;
}
