const DiffUpdate = require('../index');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename:'[name].js'
  },
  plugins: [
    new DiffUpdate({

    })
  ]
}