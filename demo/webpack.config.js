const DiffUpdate = require('../index');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
  mode: 'production',
  entry: {
    index: './src/index.js',
    main: './src/main.js'
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
    new DiffUpdate()
  ]
}