import { FastifyInstance } from "fastify";
import { registerRoute } from "./register";
import { loginRoute } from "./login";
import { meRoute } from "./me";

export async function authRoutes(fastify: FastifyInstance) {
    await registerRoute(fastify);
    await loginRoute(fastify);
    await meRoute(fastify);
}
