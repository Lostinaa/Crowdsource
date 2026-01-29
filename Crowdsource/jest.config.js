/**
 * Jest Configuration for QoE Scoring Tests
 */

module.exports = {
    // Use react-native preset for proper JSX and ES6 module support
    preset: 'react-native',

    // Test file patterns
    testMatch: [
        '<rootDir>/src/tests/**/*.test.js',
        '<rootDir>/src/tests/**/*.test.ts',
        '<rootDir>/src/**/*.spec.js',
        '<rootDir>/src/**/*.spec.ts',
    ],

    // Transform files with babel
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    },

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

    // Setup files to run before tests
    setupFilesAfterEnv: [],

    // Coverage configuration
    collectCoverageFrom: [
        'src/utils/**/*.js',
        'src/constants/**/*.js',
        '!src/**/*.d.ts',
        '!**/node_modules/**',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/android/',
        '/ios/',
    ],

    // Transform ignore patterns - don't transform node_modules except for specific packages
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|expo|@expo|expo-device|expo-file-system)/)',
    ],

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,
};
