module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
    ],
    collectCoverageFrom: [
        '../utils/**/*.js',
        '../controllers/**/*.js',
        '../services/**/*.js',
        '../middleware/**/*.js',
        '!../node_modules/**',
        '!../tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    verbose: true
};
