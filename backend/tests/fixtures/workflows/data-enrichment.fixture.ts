/**
 * Phase 2: Data Enrichment Workflow Fixture
 *
 * Purpose: Test HTTP requests, data transformation, and error handling
 *
 * Flow:
 * 1. Input node - accepts user ID
 * 2. HTTP node - fetches user data from JSONPlaceholder API
 * 3. HTTP node - fetches user's posts
 * 4. Transform node - merges user data with post count
 * 5. Output node - returns enriched user profile
 *
 * Test scenarios:
 * - Valid user ID
 * - Invalid user ID (404 handling)
 * - Network timeout simulation
 * - Webhook trigger with JSON payload
 */

export const dataEnrichmentWorkflow = {
    nodes: [
        {
            id: 'input-1',
            type: 'input',
            data: {
                label: 'User ID Input',
                inputName: 'userId',
                inputType: 'number',
                required: true,
                description: 'Enter a user ID (1-10 for JSONPlaceholder)',
                defaultValue: 1
            },
            position: { x: 100, y: 100 }
        },
        {
            id: 'http-1',
            type: 'http',
            data: {
                label: 'Fetch User Data',
                url: 'https://jsonplaceholder.typicode.com/users/${userId}',
                method: 'GET',
                headers: [],
                timeout: 5000,
                retries: 2,
                outputVariable: 'userData'
            },
            position: { x: 100, y: 250 }
        },
        {
            id: 'http-2',
            type: 'http',
            data: {
                label: 'Fetch User Posts',
                url: 'https://jsonplaceholder.typicode.com/posts?userId=${userId}',
                method: 'GET',
                headers: [],
                timeout: 5000,
                retries: 2,
                outputVariable: 'userPosts'
            },
            position: { x: 300, y: 250 }
        },
        {
            id: 'transform-1',
            type: 'transform',
            data: {
                label: 'Count Posts',
                operation: 'custom',
                inputData: '${userPosts.data}',
                expression: '$count(data)',
                outputVariable: 'postCount'
            },
            position: { x: 200, y: 400 }
        },
        {
            id: 'transform-2',
            type: 'transform',
            data: {
                label: 'Enrich User Profile',
                operation: 'merge',
                inputData: '${userData.data}',
                mergeData: '{"postCount": ${postCount}, "fetchedAt": "${$now()}"}',
                outputVariable: 'enrichedProfile'
            },
            position: { x: 200, y: 550 }
        },
        {
            id: 'output-1',
            type: 'output',
            data: {
                label: 'Enriched Profile',
                outputName: 'profile',
                value: '${enrichedProfile}',
                format: 'json'
            },
            position: { x: 200, y: 700 }
        }
    ],
    edges: [
        { id: 'e1', source: 'input-1', target: 'http-1' },
        { id: 'e2', source: 'input-1', target: 'http-2' },
        { id: 'e3', source: 'http-2', target: 'transform-1' },
        { id: 'e4', source: 'http-1', target: 'transform-2' },
        { id: 'e5', source: 'transform-1', target: 'transform-2' },
        { id: 'e6', source: 'transform-2', target: 'output-1' }
    ]
};

export const dataEnrichmentTestScenarios = {
    validUserId: {
        name: 'Valid User ID',
        triggerType: 'manual',
        inputs: {
            userId: 1
        },
        expectedOutputKeys: ['profile.id', 'profile.name', 'profile.email', 'profile.postCount', 'profile.fetchedAt'],
        assertions: {
            'profile.id': 1,
            'profile.postCount': (val: number) => val > 0
        }
    },
    webhookTrigger: {
        name: 'Webhook Trigger',
        triggerType: 'webhook',
        config: {
            method: 'POST',
            headers: [
                { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
                userId: 2
            }
        },
        expectedOutputKeys: ['profile.id', 'profile.name', 'profile.email', 'profile.postCount']
    },
    invalidUserId: {
        name: 'Invalid User ID (404)',
        triggerType: 'manual',
        inputs: {
            userId: 999999
        },
        expectedError: true,
        errorNode: 'http-1'
    },
    parallelHttpRequests: {
        name: 'Parallel HTTP Execution',
        description: 'Tests that http-1 and http-2 execute in parallel',
        triggerType: 'manual',
        inputs: {
            userId: 3
        },
        performanceCheck: {
            maxDuration: 3000, // Should complete in under 3s if parallel
            minDuration: 500   // But not instant
        }
    }
};

export const dataEnrichmentMockData = {
    userData: {
        id: 1,
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        address: {
            street: 'Kulas Light',
            suite: 'Apt. 556',
            city: 'Gwenborough',
            zipcode: '92998-3874'
        },
        phone: '1-770-736-8031 x56442',
        website: 'hildegard.org',
        company: {
            name: 'Romaguera-Crona',
            catchPhrase: 'Multi-layered client-server neural-net',
            bs: 'harness real-time e-markets'
        }
    },
    userPosts: [
        { id: 1, userId: 1, title: 'Post 1', body: 'Content 1' },
        { id: 2, userId: 1, title: 'Post 2', body: 'Content 2' },
        { id: 3, userId: 1, title: 'Post 3', body: 'Content 3' }
    ]
};
