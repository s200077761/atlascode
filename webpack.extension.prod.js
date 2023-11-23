const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

module.exports = [
    {
        bail: true,
        name: 'extension',
        mode: 'production',
        target: 'node',
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
                    ],
                },
                {
                    test: /\.(ts|js)x?$/,
                    use: [{ loader: 'ts-loader' }],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.json'],
            plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.notest.json') })],
            alias: {
                'parse-url$': 'parse-url/dist/index.js',
                axios: path.resolve(__dirname, 'node_modules/axios/lib/axios.js'),
            },
        },
        output: {
            filename: '[name].js',
            path: path.resolve(__dirname, 'build', 'extension'),
            libraryTarget: 'commonjs',
        },
        optimization: {
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                    terserOptions: {
                        compress: {
                            comparisons: false,
                        },
                        output: {
                            comments: false,
                            ascii_only: true,
                        },
                    },
                }),
            ],
            splitChunks: {
                cacheGroups: {
                    styles: {
                        name: 'main',
                        test: /\.css$/,
                        chunks: 'all',
                        enforce: true,
                    },
                },
            },
        },
        externals: ['vscode'],
        plugins: [new webpack.IgnorePlugin(/iconv-loader\.js/), new webpack.WatchIgnorePlugin([/\.js$/, /\.d\.ts$/])],
    },
    {
        bail: true,
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
        externals: ['vscode'],
    },
];
