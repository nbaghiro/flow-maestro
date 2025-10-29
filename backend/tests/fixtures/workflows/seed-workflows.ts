/**
 * Seed Test Workflows into Database
 *
 * This script seeds the test workflows into the database for manual testing
 * via the UI's test strategies feature.
 *
 * Usage:
 *   npm run seed:test-workflows -- --user-id=<uuid>
 *   node dist/tests/fixtures/workflows/seed-workflows.js --user-id=<uuid>
 */

import { WorkflowRepository } from '../../../src/storage/repositories/WorkflowRepository';
import { WorkflowDefinition } from '@flowmaestro/shared';
import { TEST_WORKFLOWS, getTestingOrder } from './index';
import { convertFrontendToBackend } from '../../../src/shared/utils/workflow-converter';

/**
 * Seed all test workflows
 */
export async function seedTestWorkflows(userId: string): Promise<void> {
    const workflowRepo = new WorkflowRepository();
    const order = getTestingOrder();
    const seededWorkflows: any[] = [];

    console.log('\n🌱 Seeding Test Workflows...\n');
    console.log(`User ID: ${userId}\n`);

    for (const key of order) {
        const config = TEST_WORKFLOWS[key as keyof typeof TEST_WORKFLOWS];

        try {
            console.log(`📝 Creating: ${config.name}`);
            console.log(`   Description: ${config.description}`);
            console.log(`   Complexity: ${config.complexity}`);
            console.log(`   Duration: ${config.estimatedDuration}`);

            if (config.requiresCredentials) {
                console.log(`   ⚠️  Requires credentials: ${config.requiresCredentials.join(', ')}`);
            }

            const definition = convertFrontendToBackend(config.workflow, config.name);

            const workflow = await workflowRepo.create({
                name: config.name,
                description: config.description,
                definition,
                user_id: userId,
                ai_generated: false
            });

            seededWorkflows.push({
                key,
                id: workflow.id,
                name: workflow.name,
                testScenarios: Object.keys(config.testScenarios).length
            });

            console.log(`   ✅ Created with ID: ${workflow.id}`);
            console.log(`   📊 Test scenarios: ${Object.keys(config.testScenarios).length}\n`);

        } catch (error) {
            console.error(`   ❌ Failed to create workflow: ${error}\n`);
        }
    }

    console.log('\n✨ Seeding Complete!\n');
    console.log('📋 Summary:');
    console.log('─────────────────────────────────────────');

    seededWorkflows.forEach((wf, idx) => {
        console.log(`${idx + 1}. ${wf.name}`);
        console.log(`   ID: ${wf.id}`);
        console.log(`   Test Scenarios: ${wf.testScenarios}`);
    });

    console.log('\n📖 Next Steps:');
    console.log('1. Open FlowMaestro UI');
    console.log('2. Navigate to Workflows');
    console.log('3. Open the Canvas for any test workflow');
    console.log('4. Click the "Test" button to open test panel');
    console.log('5. Select or create a test scenario');
    console.log('6. Execute and monitor results\n');
}

/**
 * CLI execution
 */
if (require.main === module) {
    // Parse command line args
    const args = process.argv.slice(2);
    const userIdArg = args.find(arg => arg.startsWith('--user-id='));

    if (!userIdArg) {
        console.error('❌ Error: --user-id parameter is required');
        console.error('Usage: npm run seed:test-workflows -- --user-id=<uuid>');
        process.exit(1);
    }

    const userId = userIdArg.split('=')[1];

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
        console.error('❌ Error: Invalid UUID format for user-id');
        process.exit(1);
    }

    seedTestWorkflows(userId)
        .then(() => {
            console.log('✅ Done!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Seeding failed:', error);
            process.exit(1);
        });
}
