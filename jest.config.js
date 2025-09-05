// jest.config.js

export default {
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.tsx?$': ['babel-jest', { presets: ['@babel/preset-typescript'] }],
        '^.+\\.jsx?$': ['babel-jest', { presets: ['@babel/preset-env'] }],
    },
    testMatch: [
        '**/tests/**/*.test.{js,ts}',
        '**/?(*.)+(spec|test).{js,ts}'
    ]
};