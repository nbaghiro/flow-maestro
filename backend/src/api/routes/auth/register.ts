import { FastifyInstance } from "fastify";
import { PasswordUtils } from "../../../shared/utils/password";
import { UserRepository } from "../../../storage/repositories";
import { validateRequest, ValidationError } from "../../middleware";
import { registerSchema, RegisterRequest } from "../../schemas/auth-schemas";

export async function registerRoute(fastify: FastifyInstance) {
    fastify.post(
        "/register",
        {
            preHandler: [validateRequest(registerSchema)]
        },
        async (request, reply) => {
            const userRepository = new UserRepository();
            const body = request.body as RegisterRequest;

            // Check if user already exists
            const existingUser = await userRepository.findByEmail(body.email);
            if (existingUser) {
                throw new ValidationError("Email already registered");
            }

            // Hash password
            const passwordHash = await PasswordUtils.hash(body.password);

            // Create user
            const user = await userRepository.create({
                email: body.email,
                password_hash: passwordHash,
                name: body.name
            });

            // Generate JWT token
            const token = fastify.jwt.sign({
                id: user.id,
                email: user.email
            });

            return reply.status(201).send({
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
