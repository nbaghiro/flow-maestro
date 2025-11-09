import { FastifyInstance } from "fastify";
import { loginRoute } from "./login";
import { meRoute } from "./me";
import { registerRoute } from "./register";

export async function authRoutes(fastify: FastifyInstance) {
    await registerRoute(fastify);
    await loginRoute(fastify);
    await meRoute(fastify);
}
