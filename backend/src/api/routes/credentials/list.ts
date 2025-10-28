import { FastifyInstance } from "fastify";
import { CredentialRepository } from "../../../storage/repositories";
import { listCredentialsQuerySchema } from "../../schemas/credential-schemas";
import { authMiddleware, validateQuery } from "../../middleware";

export async function listCredentialsRoute(fastify: FastifyInstance) {
    fastify.get(
        "/",
        {
            preHandler: [authMiddleware, validateQuery(listCredentialsQuerySchema)]
        },
        async (request, reply) => {
            const credentialRepository = new CredentialRepository();
            const query = request.query as any;

            const { credentials, total } = await credentialRepository.findByUserId(
                request.user!.id,
                {
                    provider: query.provider,
                    type: query.type,
                    status: query.status,
                    limit: query.limit || 50,
                    offset: query.offset || 0
                }
            );

            const limit = query.limit || 50;
            const offset = query.offset || 0;
            const page = Math.floor(offset / limit) + 1;
            const pageSize = limit;
            const hasMore = offset + credentials.length < total;

            return reply.send({
                success: true,
                data: {
                    items: credentials,
                    total,
                    page,
                    pageSize,
                    hasMore
                }
            });
        }
    );
}
