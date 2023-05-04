module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 12,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'unused-imports', 'align-import'],
    rules: {
        'align-import/align-import': ['error'],
        'unused-imports/no-unused-imports-ts': 2,
        // 'no-multi-spaces': ['error', { 'exceptions': { 'ImportDeclaration': true } }],
        'object-curly-spacing': ['error', 'always'],
        'max-len': ['error', { code: 122, comments: 140 }],
        'indent': ['error', 4, { SwitchCase: 1 }],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': 'off',
        'jsx-quotes': ['error', 'prefer-single'],
        'comma-dangle': [
            'error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'always-multiline',
                exports: 'always-multiline',
                functions: 'always-multiline',
            },
        ],
        '@typescript-eslint/semi': ['warn', 'always'],
        '@typescript-eslint/member-delimiter-style': ['error'],
        '@typescript-eslint/no-inferrable-types': ['error'],
    },
};
