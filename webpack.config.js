const path = require('path');

module.exports = env => [
    {
        name: 'extension',
        mode: env.production ? 'production' : 'development',
        target: 'node',
        entry: {
            extension: './src/extension.ts'
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            alias: {
                "node-fetch": path.resolve(__dirname, 'node_modules/node-fetch/lib/index.js'),
                "handlebars": path.resolve(__dirname, 'node_modules/handlebars/dist/handlebars.js')
            }
        },
        devtool: env.production ? undefined : 'source-map',
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: "commonjs",
            devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
        },
        externals: ['vscode']
    },
    {
        name: 'uninstall',
        mode: env.production ? 'production' : 'development',
        target: 'node',
        entry: {
            extension: './src/uninstall/uninstall.ts'
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: 'ts-loader',
                    exclude: /node_modules/
                }
            ]
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        devtool: env.production ? undefined : 'source-map',
        output: {
            filename: 'uninstall.js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: "commonjs",
            devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
        },
        externals: ['vscode']
    }
];