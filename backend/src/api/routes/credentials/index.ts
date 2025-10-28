import { FastifyInstance } from "fastify";
import { createCredentialRoute } from "./create";
import { listCredentialsRoute } from "./list";
import { getCredentialRoute } from "./get";
import { updateCredentialRoute } from "./update";
import { deleteCredentialRoute } from "./delete";
import { testCredentialRoute } from "./test";
import { testConnectionRoute } from "./test-connection";

export async function credentialRoutes(fastify: FastifyInstance) {
    await createCredentialRoute(fastify);
    await listCredentialsRoute(fastify);
    await getCredentialRoute(fastify);
    await updateCredentialRoute(fastify);
    await deleteCredentialRoute(fastify);
    await testCredentialRoute(fastify);
    await testConnectionRoute(fastify);
}
