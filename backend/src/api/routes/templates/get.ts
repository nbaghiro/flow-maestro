import { FastifyInstance } from "fastify";
import { TemplateRepository } from "../../../storage/repositories";
import { validateParams } from "../../middleware";
import { NotFoundError } from "../../middleware/error-handler";
import { templateIdParamSchema, TemplateIdParam } from "../../schemas/template-schemas";

export async function getTemplateRoute(fastify: FastifyInstance) {
    fastify.get(
        "/:id",
        {
            preHandler: [validateParams(templateIdParamSchema)]
        },
        async (request, reply) => {
            const templateRepository = new TemplateRepository();
            const { id } = request.params as TemplateIdParam;

            const template = await templateRepository.findById(id);

            if (!template) {
                throw new NotFoundError("Template not found");
            }

            // Increment view count in background (don't wait for it)
            templateRepository.incrementViewCount(id).catch(() => {
                // Silently ignore view count increment failures
            });

            return reply.send({
                success: true,
                data: template
            });
        }
    );
}
