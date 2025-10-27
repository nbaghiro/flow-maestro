import { FastifyInstance } from 'fastify';
import { buildServer } from '../../src/api/server';

/**
 * Test Server Helper
 * Creates a Fastify server instance for testing
 */

let server: FastifyInstance | null = null;

export async function setupTestServer(): Promise<FastifyInstance> {
    if (!server) {
        server = await buildServer();
        await server.ready();
    }
    return server;
}

export async function cleanupTestServer() {
    if (server) {
        await server.close();
        server = null;
    }
}

export function getTestServer(): FastifyInstance {
    if (!server) {
        throw new Error('Test server not initialized. Call setupTestServer first.');
    }
    return server;
}

/**
 * Helper to generate JWT token for testing
 */
export function generateTestToken(server: FastifyInstance, payload: any = { id: 'test-user-1' }): string {
    return server.jwt.sign(payload);
}

// Global setup and teardown
beforeAll(async () => {
    await setupTestServer();
});

afterAll(async () => {
    await cleanupTestServer();
});
