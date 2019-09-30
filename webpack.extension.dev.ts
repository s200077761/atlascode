import path from 'path';
import webpack from 'webpack';
import fs from 'fs';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);
delete process.env.TS_NODE_PROJECT;

const main: webpack.Configuration = {
    bail: true,
    name: 'extension',
    mode: 'development',
    target: 'node',
    devtool: 'cheap-module-source-map',
    entry: {
        extension: './src/extension.ts'
    },
    module: {
        exprContextCritical: false,
        rules: [
            {
                test: /\.(ts|js)x?$/,
                use: [
                    { loader: 'ts-loader' }
                ],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp("./tsconfig.json") })],
        alias: {
            "axios": path.resolve(__dirname, 'node_modules/axios/lib/axios.js'),
            "handlebars": path.resolve(__dirname, 'node_modules/handlebars/dist/handlebars.js')
        }
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'build', 'extension'),
        libraryTarget: "commonjs",
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    },
    externals: ['vscode'],
    plugins: [
        new webpack.IgnorePlugin(/iconv-loader\.js/),
        new webpack.WatchIgnorePlugin([
            /\.js$/,
            /\.d\.ts$/
        ])
    ]
};
const uninstall: webpack.Configuration = {
    name: 'uninstall',
    mode: 'production',
    target: 'node',
    entry: {
        extension: './src/uninstall/uninstall.ts'
    },
    module: {
        exprContextCritical: false,
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    { loader: 'ts-loader' }
                ],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },

    output: {
        filename: 'uninstall.js',
        path: path.resolve(__dirname, 'build', 'extension'),
        libraryTarget: "commonjs",
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    },
    externals: ['vscode']
};

export default [main, uninstall];