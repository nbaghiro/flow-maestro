import { FastifyInstance } from "fastify";
import { metaWebhookRoutes } from "./meta";

export async function webhookRoutes(fastify: FastifyInstance) {
    // Register Meta webhook routes (WhatsApp, Instagram, Messenger, Facebook)
    await fastify.register(metaWebhookRoutes);
}
