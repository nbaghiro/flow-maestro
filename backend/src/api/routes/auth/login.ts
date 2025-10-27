import { FastifyInstance } from "fastify";
import { UserRepository } from "../../../storage/repositories";
import { loginSchema } from "../../schemas/auth-schemas";
import { validateRequest, UnauthorizedError } from "../../middleware";
import { PasswordUtils } from "../../../shared/utils/password";

export async function loginRoute(fastify: FastifyInstance) {
    fastify.post(
        "/login",
        {
            preHandler: [validateRequest(loginSchema)]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const body = request.body as any;

            // Find user by email
            const user = await userRepository.findByEmail(body.email);
            if (!user) {
                throw new UnauthorizedError("Invalid credentials");
            }

            // Verify password
            const isValidPassword = await PasswordUtils.verify(body.password, user.password_hash);
            if (!isValidPassword) {
                throw new UnauthorizedError("Invalid credentials");
            }

            // Update last login
            await userRepository.update(user.id, {
                last_login_at: new Date()
            });

            // Generate JWT token
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email
            });

            return reply.send({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name
                    },
                    token
                }
            });
        }
    );
}
