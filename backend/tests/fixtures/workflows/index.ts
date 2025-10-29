/**
 * Workflow Test Fixtures
 *
 * This module exports all test workflow fixtures for use in:
 * - Integration tests
 * - Database seeding
 * - Manual testing via UI
 * - Documentation examples
 */

export * from './hello-world.fixture';
export * from './data-enrichment.fixture';
export * from './text-analysis.fixture';
export * from './smart-router.fixture';
export * from './arxiv-researcher.fixture';

import { helloWorldWorkflow, helloWorldTestScenarios } from './hello-world.fixture';
import { dataEnrichmentWorkflow, dataEnrichmentTestScenarios } from './data-enrichment.fixture';
import { textAnalysisWorkflow, textAnalysisTestScenarios } from './text-analysis.fixture';
import { smartRouterWorkflow, smartRouterTestScenarios } from './smart-router.fixture';
import { arxivResearcherWorkflow } from './arxiv-researcher.fixture';

/**
 * All test workflows in execution order
 */
export const TEST_WORKFLOWS = {
    phase1_helloWorld: {
        name: 'Phase 1: Hello World',
        description: 'Simple linear workflow to test basic execution',
        workflow: helloWorldWorkflow,
        testScenarios: helloWorldTestScenarios,
        complexity: 'basic',
        estimatedDuration: '< 1s'
    },
    phase2_dataEnrichment: {
        name: 'Phase 2: Data Enrichment',
        description: 'Tests HTTP requests, parallel execution, and data merging',
        workflow: dataEnrichmentWorkflow,
        testScenarios: dataEnrichmentTestScenarios,
        complexity: 'intermediate',
        estimatedDuration: '2-3s'
    },
    phase3_textAnalysis: {
        name: 'Phase 3: Text Analysis',
        description: 'Tests LLM integration and AI-powered transformations',
        workflow: textAnalysisWorkflow,
        testScenarios: textAnalysisTestScenarios,
        complexity: 'intermediate',
        estimatedDuration: '5-8s',
        requiresCredentials: ['anthropic']
    },
    phase4_smartRouter: {
        name: 'Phase 4: Smart Router',
        description: 'Tests conditional logic and branch execution',
        workflow: smartRouterWorkflow,
        testScenarios: smartRouterTestScenarios,
        complexity: 'advanced',
        estimatedDuration: '3-8s (varies by branch)',
        requiresCredentials: ['anthropic']
    },
    advanced_arxivResearcher: {
        name: 'Advanced: ArXiv Researcher',
        description: 'Complex workflow with API, file ops, and LLM',
        workflow: arxivResearcherWorkflow,
        testScenarios: {},
        complexity: 'advanced',
        estimatedDuration: '10-15s',
        requiresCredentials: ['anthropic']
    }
};

/**
 * Get workflows by complexity level
 */
export function getWorkflowsByComplexity(level: 'basic' | 'intermediate' | 'advanced') {
    return Object.entries(TEST_WORKFLOWS)
        .filter(([_, config]) => config.complexity === level)
        .map(([key, config]) => ({ key, ...config }));
}

/**
 * Get workflows that don't require credentials
 */
export function getWorkflowsWithoutCredentials() {
    return Object.entries(TEST_WORKFLOWS)
        .filter(([_, config]) => !config.requiresCredentials)
        .map(([key, config]) => ({ key, ...config }));
}

/**
 * Get recommended testing order
 */
export function getTestingOrder() {
    return [
        'phase1_helloWorld',
        'phase2_dataEnrichment',
        'phase3_textAnalysis',
        'phase4_smartRouter',
        'advanced_arxivResearcher'
    ];
}
