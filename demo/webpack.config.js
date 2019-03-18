const DiffUpdate = require('../index');
const path = require('path');
module.exports = {
  mode: 'production',
  entry: [
    './src/index.js',
    './src/main.js'
  ],
  output: {
    filename:'[name].js',
    // path: path.resolve(__dirname, './build'),
  },
  plugins: [
    new DiffUpdate()
  ]
}