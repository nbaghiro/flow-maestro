import { FastifyInstance } from "fastify";
import { googleAuthRoutes } from "./google";
import { loginRoute } from "./login";
import { meRoute } from "./me";
import { microsoftAuthRoutes } from "./microsoft";
import { registerRoute } from "./register";

export async function authRoutes(fastify: FastifyInstance) {
    await registerRoute(fastify);
    await loginRoute(fastify);
    await meRoute(fastify);
    await googleAuthRoutes(fastify);
    await microsoftAuthRoutes(fastify);
}
