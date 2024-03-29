/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    // preset: 'ts-jest',
    // testEnvironment: 'node',
    transform: { '^.+\\.ts?$': 'ts-jest' },
    testEnvironment: 'node',
    testRegex: '/__tests__/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
