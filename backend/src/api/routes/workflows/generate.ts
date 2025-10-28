import { FastifyInstance } from "fastify";
import { generateWorkflowSchema } from "../../schemas/workflow-schemas";
import { authMiddleware, validateRequest } from "../../middleware";
import { generateWorkflow } from "../../../services/workflow-generator";

export async function generateWorkflowRoute(fastify: FastifyInstance) {
    fastify.post(
        "/generate",
        {
            preHandler: [authMiddleware, validateRequest(generateWorkflowSchema)]
        },
        async (request, reply) => {
            const body = request.body as any;

            try {
                console.log('[Generate Route] Received generation request from user:', request.user!.id);

                const workflow = await generateWorkflow({
                    userPrompt: body.prompt,
                    credentialId: body.credentialId,
                    userId: request.user!.id
                });

                return reply.status(200).send({
                    success: true,
                    data: workflow
                });
            } catch (error) {
                console.error('[Generate Route] Error generating workflow:', error);

                // Return user-friendly error message
                const message = error instanceof Error ? error.message : 'Failed to generate workflow';

                return reply.status(500).send({
                    success: false,
                    error: {
                        message,
                        code: 'WORKFLOW_GENERATION_FAILED'
                    }
                });
            }
        }
    );
}
