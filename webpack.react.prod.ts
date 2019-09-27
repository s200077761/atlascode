import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import ForkTsCheckerNotifierWebpackPlugin from 'fork-ts-checker-notifier-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import ManifestPlugin from 'webpack-manifest-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import autoprefixer from 'autoprefixer';

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath: string) => path.resolve(appDirectory, relativePath);
delete process.env.TS_NODE_PROJECT;

const config: webpack.Configuration = {
    bail: true,
    mode: "production",
    entry: resolveApp("./src/index.tsx"),
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'static/js/[name].[chunkhash:8].js',
        chunkFilename: 'static/js/[name].[chunkhash:8].chunk.js',
    },
    optimization: {
        minimizer: [new OptimizeCSSAssetsPlugin({}),
        new TerserPlugin({
            extractComments: false,
            terserOptions: {
                compress: {
                    comparisons: false,
                },
                output: {
                    comments: false,
                    ascii_only: true
                }
            }
        })
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
        }
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp("./tsconfig.json") })],
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
        }),
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

        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
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
                            hmr: false,
                        },
                    },
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            // Necessary for external CSS imports to work
                            // https://github.com/facebookincubator/create-react-app/issues/2677
                            ident: 'postcss',
                            plugins: () => [
                                require('postcss-flexbugs-fixes'),
                                autoprefixer({
                                    overrideBrowserslist: [
                                        'last 4 Chrome versions'
                                    ],
                                    flexbox: 'no-2009',
                                }),
                            ],
                        }

                    }
                ],
            }
        ]
    },
};

export default config;