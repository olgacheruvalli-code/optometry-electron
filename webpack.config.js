const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  target: 'web', // Use 'electron-renderer' if you are using Electron
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      global: require.resolve('global'),
      process: require.resolve('process/browser'),
      stream: require.resolve('stream-browserify'),
      events: require.resolve('events/'),
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: true, // ENABLED to allow loading of image URLs
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource', // Modern Webpack 5 way
        generator: {
          filename: 'images/[name][hash][ext]', // Save images to 'dist/images/'
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'public', 'index.html'),
      inject: 'body',
    }),
    new webpack.ProvidePlugin({
      global: require.resolve('global'),
      process: 'process/browser',
    }),
  ],
  devServer: {
    port: 8080,
    hot: true,
    compress: true,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:5000',
        secure: false,
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
      },
    ],
  },
  devtool: 'eval-source-map',
};
