import { FastifyInstance } from "fastify";
import { authorizeRoute } from "./authorize";
import { callbackRoute } from "./callback";
import { listProvidersRoute } from "./list-providers";
import { refreshRoute } from "./refresh";
import { revokeRoute } from "./revoke";

/**
 * OAuth Routes
 *
 * Generic OAuth 2.0 integration system.
 * Works with ANY OAuth provider configured in the registry.
 *
 * Routes:
 * - GET  /oauth/providers                      - List available providers
 * - GET  /oauth/:provider/authorize            - Get authorization URL
 * - GET  /oauth/:provider/callback             - OAuth callback handler (generic!)
 * - POST /oauth/:provider/refresh/:credentialId - Manually refresh token
 * - POST /oauth/:provider/revoke/:credentialId  - Revoke token and delete credential
 */
export async function oauthRoutes(fastify: FastifyInstance) {
    await listProvidersRoute(fastify);
    await authorizeRoute(fastify);
    await callbackRoute(fastify);
    await refreshRoute(fastify);
    await revokeRoute(fastify);
}
