import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middleware";
import { testCredential } from "../../../services/CredentialTestService";
import type { CredentialWithData, ApiKeyData } from "../../../storage/models/Credential";

interface TestConnectionRequest {
    provider: string;
    type: string;
    data: {
        api_key?: string;
        api_secret?: string;
        [key: string]: any;
    };
}

export async function testConnectionRoute(fastify: FastifyInstance) {
    fastify.post(
        "/test-connection",
        {
            preHandler: [authMiddleware]
        },
        async (request, reply) => {
            const body = request.body as TestConnectionRequest;

            if (!body.provider || !body.type || !body.data) {
                return reply.status(400).send({
                    success: false,
                    error: "Missing required fields: provider, type, data"
                });
            }

            try {
                // Create a temporary credential object for testing (not saved to database)
                const tempCredential: CredentialWithData = {
                    id: 'temp-test-id',
                    user_id: request.user!.id,
                    name: 'Test Connection',
                    type: body.type as any,
                    provider: body.provider,
                    status: 'active',
                    metadata: {},
                    last_tested_at: null,
                    last_used_at: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                    data: body.data as ApiKeyData
                };

                // Test the credential
                const testResult = await testCredential(tempCredential);

                return reply.send({
                    success: true,
                    data: {
                        valid: testResult.success,
                        message: testResult.message,
                        details: testResult.details
                    }
                });
            } catch (error) {
                return reply.send({
                    success: false,
                    data: {
                        valid: false,
                        message: error instanceof Error ? error.message : 'Test failed',
                        details: null
                    }
                });
            }
        }
    );
}
