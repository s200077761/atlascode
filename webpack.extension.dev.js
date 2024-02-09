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
                        path.resolve('./node_modules/jsdom/lib/jsdom/level3/xpath.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/custom-elements/ElementInternals-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/http-proxy-agent/dist/index.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/nodes/HTMLTextAreaElement-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/https-proxy-agent/dist/index.js'),
                        path.resolve('./node_modules/jsdom/lib/api.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/browser/parser/html.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/helpers/http-request.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/nodes/HTMLInputElement-impl.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/xhr/FormData-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/agent-base/dist/index.js'),
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
                        path.resolve('./node_modules/jsdom/lib/jsdom/level3/xpath.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/custom-elements/ElementInternals-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/http-proxy-agent/dist/index.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/nodes/HTMLTextAreaElement-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/https-proxy-agent/dist/index.js'),
                        path.resolve('./node_modules/jsdom/lib/api.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/browser/parser/html.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/helpers/http-request.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/nodes/HTMLInputElement-impl.js'),
                        path.resolve('./node_modules/jsdom/lib/jsdom/living/xhr/FormData-impl.js'),
                        path.resolve('./node_modules/jsdom/node_modules/agent-base/dist/index.js'),
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
