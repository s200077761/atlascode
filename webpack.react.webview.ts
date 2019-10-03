import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import ForkTsCheckerNotifierWebpackPlugin from 'fork-ts-checker-notifier-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import ManifestPlugin from 'webpack-manifest-plugin';
import HtmlWebPackPlugin from "html-webpack-plugin";

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);
delete process.env.TS_NODE_PROJECT;

const pageTsx: string = (process.env.PAGETSX) ? process.env.PAGETSX : "config/ConfigPage.tsx";
const view: string = (process.env.VIEW) ? process.env.VIEW : "atlascodeSettings";
const theme: string = (process.env.THEME) ? process.env.THEME : "dark";

const config: webpack.Configuration = {
    mode: "development",
    context: path.resolve(__dirname, 'src'),
    entry: [
        resolveApp(`./src/webviews/components/${pageTsx}`),
        resolveApp("./src/webviews/components/index-dev.tsx"),

    ],
    devtool: 'cheap-module-source-map',
    output: {
        pathinfo: true,
        path: path.resolve(__dirname, 'build'),
        chunkFilename: 'static/js/[name].chunk.js',
        filename: 'static/js/bundle.js',
        devtoolModuleFilenameTemplate: 'file:///[absolute-resource-path]'
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp("./tsconfig.json") })],
    },
    plugins: [
        new MiniCssExtractPlugin(),
        new ManifestPlugin({
            fileName: 'asset-manifest.json',
        }),
        new webpack.IgnorePlugin(/iconv-loader\.js/),
        new webpack.WatchIgnorePlugin([
            /\.js$/,
            /\.d\.ts$/
        ]),
        new ForkTsCheckerWebpackPlugin({
            watch: resolveApp('src'),
            tsconfig: resolveApp('tsconfig.json'),
            tslint: resolveApp('tslint.json'),
        }),
        new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }),
        new HtmlWebPackPlugin({
            template: "./devhtml/devindex.html",
            templateParameters: {
                view: view,
                theme: theme
            },
        }),

    ],
    module: {
        rules: [
            {
                // Include ts, tsx, js, and jsx files.
                test: /\.(ts|js)x?$/,
                exclude: /node_modules/,
                use: [
                    { loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } }
                ],
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
            }
        ]
    },
};

export default config;