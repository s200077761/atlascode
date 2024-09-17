const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const smp = new SpeedMeasurePlugin();

module.exports = [
    {
        bail: true,
        name: 'extension',
        mode: 'development',
        target: 'node',
        devtool: 'cheap-module-source-map',
        entry: {
            extension: './src/extension.ts',
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    include: [
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/analytics-node.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/http-client.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/event-queue.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/abort.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/plugins/segmentio/publisher.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/Element.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/CSSStyleDeclaration.js'),
                    ],
                },
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: /node_modules/,
                },
                {
                    test: /\.js$/,
                    use: [{ loader: 'source-map-loader' }],
                    enforce: 'pre',
                    include: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.json'],
            plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.json') })],
            alias: {
                'parse-url$': 'parse-url/dist/index.js',
                parse5$: 'parse5/dist/cjs/index.js',
                axios: path.resolve(__dirname, 'node_modules/axios/lib/axios.js'),
            },
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: 'commonjs',
            devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
        },
        externals: ['vscode', 'utf-8-validate', 'bufferutil'],
        plugins: [new webpack.IgnorePlugin(/iconv-loader\.js/), new webpack.WatchIgnorePlugin([/\.js$/, /\.d\.ts$/])],
    },
    {
        name: 'uninstall',
        mode: 'production',
        target: 'node',
        entry: {
            extension: './src/uninstall/uninstall.ts',
        },
        module: {
            exprContextCritical: false,
            rules: [
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    include: [
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/analytics-node.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/http-client.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/app/event-queue.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/lib/abort.js'),
                        path.resolve('./node_modules/@segment/analytics-node/dist/esm/plugins/segmentio/publisher.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/Element.js'),
                        path.resolve('./node_modules/@mixmark-io/domino/lib/CSSStyleDeclaration.js'),
                    ],
                },
                {
                    test: /\.tsx?$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },

        output: {
            filename: 'uninstall.js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: 'commonjs',
            devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
        },
        externals: ['vscode', 'utf-8-validate', 'bufferutil'],
    },
];
