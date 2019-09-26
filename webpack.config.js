const path = require('path')

module.exports = {
  entry: './src/index.js',
  target: 'node',
  mode: 'production',
  externals: [
    /^[a-z\-0-9]+$/ // Ignore node_modules folder
  ],
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: "commonjs"
  }
}