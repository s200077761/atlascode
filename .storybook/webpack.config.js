const path = require('path');
const fs = require('fs');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const basePath = path.resolve(__dirname, '../', 'src');
const packages = fs.readdirSync(basePath).filter(name => fs.lstatSync(path.join(basePath, name)).isDirectory());
const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

module.exports = async ({ config }) => {
    config.module.rules.push({
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: [{ loader: 'ts-loader', options: { transpileOnly: true, onlyCompileBundledFiles: true } }]
    });
    Object.assign(config.resolve, {
        extensions: ['.ts', '.tsx', '.js', '.json'],
        plugins: [new TsconfigPathsPlugin({ configFile: resolveApp('./tsconfig.json') })]
    });

    // Object.assign(config.resolve.alias, {
    //     ...packages.reduce(
    //         (acc, name) => ({
    //             ...acc,
    //             [`@atlassianlabs/${name}`]: path.join(basePath, name, 'src')
    //         }),
    //         {}
    //     )
    // });

    return config;
};
