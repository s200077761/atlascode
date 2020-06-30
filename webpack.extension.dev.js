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
