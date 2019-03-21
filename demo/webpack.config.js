const DiffUpdate = require('../index');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
  mode: 'production',
  entry: {
    index: './src/index.js',
    main: './src/main.js',
    out: './src/out.js',
  },
  module: {
    rules: [
      {
        test: /\.css$/, // 针对CSS结尾的文件设置LOADER
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
        ]
      }
    ]
  },
  output: {
    filename:'[name].js',
    // path: path.resolve(__dirname, './build'),
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      chunks: ['index', 'main']
    }),
    new HtmlWebpackPlugin({
      filename:'b.html',
      template: './index.html',
      chunks: ['index', 'out']
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new DiffUpdate()
  ]
}