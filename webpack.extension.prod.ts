import path from 'path';
import webpack from "webpack";

const main: webpack.Configuration = {
    name: 'extension',
    mode: 'production',
    target: 'node',
    entry: {
        extension: './src/extension.ts'
    },
    module: {
        exprContextCritical: false,
        rules: [
            {
                test: /\.(ts|js)x?$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
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
    plugins: [new webpack.IgnorePlugin(/iconv-loader\.js/)]
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
                loader: 'babel-loader',
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