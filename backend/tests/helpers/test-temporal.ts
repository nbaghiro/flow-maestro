import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import * as activities from '../../src/temporal/activities';

/**
 * Test Temporal Environment Helper
 * Provides in-memory Temporal for testing without external server
 */

let testEnv: TestWorkflowEnvironment | null = null;

export async function setupTestTemporal() {
    if (!testEnv) {
        testEnv = await TestWorkflowEnvironment.createLocal();
    }
    return testEnv;
}

export async function createTestWorker(workflowsPath: string) {
    if (!testEnv) {
        throw new Error('Test environment not initialized. Call setupTestTemporal first.');
    }

    const worker = await Worker.create({
        connection: testEnv.nativeConnection,
        taskQueue: 'test-queue',
        workflowsPath,
        activities,
    });

    return worker;
}

export async function cleanupTestTemporal() {
    if (testEnv) {
        await testEnv.teardown();
        testEnv = null;
    }
}

export function getTestClient() {
    if (!testEnv) {
        throw new Error('Test environment not initialized. Call setupTestTemporal first.');
    }
    return testEnv.client;
}

// Global setup and teardown
beforeAll(async () => {
    await setupTestTemporal();
});

afterAll(async () => {
    await cleanupTestTemporal();
});
