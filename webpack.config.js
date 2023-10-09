const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './index.ts',
    output: {
        filename: 'threadpool.min.js',
        path: path.resolve(__dirname, 'dist'),
        libraryExport: "default",
        libraryTarget: 'umd'
    },
    target: 'web',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};