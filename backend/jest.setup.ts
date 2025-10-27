/**
 * Jest Global Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Minimize noise in test output
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = ':memory:'; // SQLite in-memory

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
    ...console,
    // Suppress console logs during tests unless explicitly needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep error and warn for debugging
    error: console.error,
    warn: console.warn,
};

// Mock pdf-parse module to avoid dealing with its complex export pattern
jest.mock('pdf-parse', () => {
    // Return a function that extracts text from buffer
    return jest.fn().mockImplementation(async (buffer: Buffer) => {
        const text = buffer.toString('utf-8');
        return {
            numpages: 1,
            numrender: 1,
            info: {},
            metadata: null,
            text: text,
            version: '1.0.0'
        };
    });
});
