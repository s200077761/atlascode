module.exports = {
    parserOptions: {
        extraFileExtensions: ['.json'],
        ecmaFeatures: {
            jsx: true, // Allows for the parsing of JSX
        },
    },
    plugins: ['react', 'react-hooks'],
    rules: {
        'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    '@material-ui',
                    '@atlassianlabs/jira-metaui-client/*',
                    '@atlassianlabs/jira-metaui-transformer/*',
                    '@atlassianlabs/jira-pi-client/*',
                    '@atlassianlabs/jira-pi-common-models/*',
                    '@atlassianlabs/pi-client-common/*',
                ],
            },
        ],
    },
    settings: {
        react: {
            version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
        },
    },
};
