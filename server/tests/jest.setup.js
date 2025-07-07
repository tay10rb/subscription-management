// Jest setup file for common test configurations

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
