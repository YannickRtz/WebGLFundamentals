const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    mode: "development",
    entry: path.resolve(__dirname, './src/index.ts'),
    module: {
        rules: [
            {
                // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
                test: /\.tsx?$/,
                loader: "ts-loader"
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    "style-loader",
                    // Translates CSS into CommonJS
                    "css-loader",
                    // Compiles Sass to CSS
                    "sass-loader",
                ],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(frag|vert|glsl)$/i,
                type: 'asset/source'
            }
        ],
    },
    output: {
        filename: 'bundle.[hash].js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        /**
         * All files inside webpack's output.path directory will be removed once, but the
         * directory itself will not be. If using webpack 4+'s default configuration,
         * everything under <PROJECT_DIR>/dist/ will be removed.
         * Use cleanOnceBeforeBuildPatterns to override this behavior.
         *
         * During rebuilds, all webpack assets that are not used anymore
         * will be removed automatically.
         *
         * See `Options and Defaults` for information
         */
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            favicon: path.resolve(__dirname,"./src/favicon.ico"),
            template: path.resolve(__dirname,"./src/index.html"),
            minify: false
        })
    ],
    optimization: {
        minimize: false
    }
};
