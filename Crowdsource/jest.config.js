/**
 * Jest Configuration for QoE Scoring Tests
 * 
 * Uses Node.js test environment to avoid React Native module issues.
 * Tests only pure JavaScript utilities (scoring, math functions).
 */

module.exports = {
    // Use Node environment for pure JS tests (avoids React Native module parsing)
    testEnvironment: 'node',

    // Test file patterns
    testMatch: [
        '<rootDir>/src/tests/**/*.test.js',
    ],

    // Transform our source files with Babel
    transform: {
        '^.+\\.js$': 'babel-jest',
    },

    // Transform source files but not node_modules
    transformIgnorePatterns: [
        '/node_modules/',
    ],

    // Module file extensions
    moduleFileExtensions: ['js', 'json'],

    // Mock modules that aren't needed for unit tests
    moduleNameMapper: {
        '^expo-device$': '<rootDir>/src/tests/__mocks__/expo-device.js',
        '^react-native$': '<rootDir>/src/tests/__mocks__/react-native.js',
    },

    // Ignore paths with duplicate modules
    modulePathIgnorePatterns: [
        '<rootDir>/json/',
        '<rootDir>/dist/',
        '<rootDir>/android/',
        '<rootDir>/ios/',
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/utils/**/*.js',
        'src/constants/**/*.js',
        '!src/**/*.d.ts',
        '!**/node_modules/**',
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/android/',
        '/ios/',
        '/json/',
    ],

    // Clear mocks between tests
    clearMocks: true,

    // Verbose output
    verbose: true,
};

