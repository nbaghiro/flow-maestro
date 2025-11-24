import { FastifyInstance } from "fastify";
import { UserRepository } from "../../../storage/repositories";
import { authMiddleware } from "../../middleware";

export async function meRoute(fastify: FastifyInstance) {
    fastify.get(
        "/me",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();

            // User is authenticated, request.user is set by authMiddleware
            const userId = request.user.id;

            // Get fresh user data from database
            const user = await userRepository.findById(userId);

            if (!user) {
                return reply.status(404).send({
                    success: false,
                    error: "User not found"
                });
            }

            return reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        avatar_url: user.avatar_url,
                        google_id: user.google_id,
                        has_password: !!user.password_hash
                    }
                }
            });
        }
    );
}
