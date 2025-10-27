import Database from 'better-sqlite3';

/**
 * In-Memory Database Helper for Testing
 * Uses SQLite instead of PostgreSQL for fast, isolated tests
 */

let db: Database.Database | null = null;

export function setupTestDB(): Database.Database {
    if (!db) {
        db = new Database(':memory:');

        // Create tables (simplified schema for testing)
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                definition TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS workflow_executions (
                id TEXT PRIMARY KEY,
                workflow_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                status TEXT NOT NULL,
                inputs TEXT,
                outputs TEXT,
                error TEXT,
                started_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                FOREIGN KEY (workflow_id) REFERENCES workflows(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX idx_workflows_user_id ON workflows(user_id);
            CREATE INDEX idx_executions_workflow_id ON workflow_executions(workflow_id);
            CREATE INDEX idx_executions_user_id ON workflow_executions(user_id);
        `);
    }

    return db;
}

export function cleanupTestDB() {
    if (db) {
        db.close();
        db = null;
    }
}

export function clearTestData() {
    if (!db) return;

    db.exec(`
        DELETE FROM workflow_executions;
        DELETE FROM workflows;
        DELETE FROM users;
    `);
}

export interface TestUser {
    id: string;
    email: string;
    password: string;
    name: string;
}

export interface TestWorkflow {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    definition: any;
}

export function seedTestUser(user: Partial<TestUser> = {}): TestUser {
    const testUser: TestUser = {
        id: user.id || 'test-user-1',
        email: user.email || 'test@example.com',
        password: user.password || 'hashed-password',
        name: user.name || 'Test User'
    };

    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`
        INSERT OR REPLACE INTO users (id, email, password, name)
        VALUES (?, ?, ?, ?)
    `);

    stmt.run(testUser.id, testUser.email, testUser.password, testUser.name);

    return testUser;
}

export function seedTestWorkflow(workflow: Partial<TestWorkflow> = {}): TestWorkflow {
    const testWorkflow: TestWorkflow = {
        id: workflow.id || 'test-workflow-1',
        user_id: workflow.user_id || 'test-user-1',
        name: workflow.name || 'Test Workflow',
        description: workflow.description || 'A test workflow',
        definition: workflow.definition || { nodes: [], edges: [] }
    };

    if (!db) throw new Error('Database not initialized');

    const stmt = db.prepare(`
        INSERT OR REPLACE INTO workflows (id, user_id, name, description, definition)
        VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
        testWorkflow.id,
        testWorkflow.user_id,
        testWorkflow.name,
        testWorkflow.description,
        JSON.stringify(testWorkflow.definition)
    );

    return testWorkflow;
}

export function getTestDB() {
    if (!db) {
        throw new Error('Database not initialized. Call setupTestDB first.');
    }
    return db;
}

// Global test hooks
beforeEach(() => {
    setupTestDB();
    clearTestData();
});

afterAll(() => {
    cleanupTestDB();
});
