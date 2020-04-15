const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const HtmlWebPackPlugin = require('html-webpack-plugin');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);

const pageTsx = process.env.PAGETSX ? process.env.PAGETSX : 'ConfigPage.tsx';
const view = process.env.VIEW ? process.env.VIEW : 'atlascodeSettings';
const theme = process.env.THEME ? process.env.THEME : 'dark';

module.exports = {
    mode: 'development',
    context: path.resolve(__dirname, 'src'),
    entry: [`./webviews/components/${pageTsx}`, './webviews/components/index-dev.tsx'],
    devtool: 'cheap-module-source-map',
    output: {
        pathinfo: true,
        path: path.resolve(__dirname, 'build'),
        chunkFilename: 'static/js/[name].chunk.js',
        filename: 'static/js/bundle.js',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]',
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.json') })],
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new ManifestPlugin({
            fileName: 'asset-manifest.json',
        }),
        new webpack.IgnorePlugin(/iconv-loader\.js/),
        new webpack.WatchIgnorePlugin([/\.js$/, /\.d\.ts$/]),
        new ForkTsCheckerWebpackPlugin({
            watch: resolveApp('src'),
            tsconfig: resolveApp('tsconfig.json'),
            eslint: true,
        }),
        new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),
        new HtmlWebPackPlugin({
            template: '../devhtml/devindex.html',
            templateParameters: {
                view: view,
                theme: theme,
            },
        }),
    ],
    module: {
        rules: [
            {
                // Include ts, tsx, js, and jsx files.
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: [{ loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } }],
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            // you can specify a publicPath here
                            // by default it uses publicPath in webpackOptions.output
                            publicPath: '../',
                            hmr: process.env.NODE_ENV === 'development',
                        },
                    },
                    'css-loader',
                ],
            },
        ],
    },
};
