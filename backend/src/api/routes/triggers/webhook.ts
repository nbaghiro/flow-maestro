import { FastifyInstance } from "fastify";
import { WebhookService } from "../../../temporal/services/WebhookService";

/**
 * Webhook receiver endpoint
 * PUBLIC endpoint - no auth required
 * Receives webhook requests and triggers workflow execution
 */
export async function webhookReceiverRoute(fastify: FastifyInstance) {
    // Handle all HTTP methods
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach(method => {
        (fastify as any)[method.toLowerCase()](
            "/:triggerId",
            async (request: any, reply: any) => {
                const webhookService = new WebhookService();
                const { triggerId } = request.params;

                // Extract request data
                const requestData = {
                    method: request.method,
                    headers: request.headers,
                    body: request.body || {},
                    query: request.query || {},
                    path: request.url,
                    ip: request.ip,
                    userAgent: request.headers['user-agent']
                };

                try {
                    const result = await webhookService.processWebhook(
                        triggerId,
                        requestData
                    );

                    return reply.status(result.statusCode).send({
                        success: result.success,
                        executionId: result.executionId,
                        message: result.message,
                        error: result.error
                    });
                } catch (error) {
                    console.error('Webhook processing error:', error);
                    return reply.status(500).send({
                        success: false,
                        error: "Internal server error"
                    });
                }
            }
        );
    });
}
