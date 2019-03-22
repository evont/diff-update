# diffupdate-webpack-plugin

[中文文档](./README-zh.md)

A Webpack Plugin that diff update javascript via differencing file change & creating a `diff.json`, when front end request a javascript, if there has already had a cache, it will patch update, or it will download the javascript file & cache it;

## Why I should use it?
In most cases, when we change a javascript file, even it is just few change, the chunk hash will change, and the client side needs to download the new file, What a waste!

But if we update the file by patching diff, what we need is get a diff infomation and merge it with the local cache

**see below:**

If client side has no cache or the cache is out of limited count, it will load the full javascript file & cache it.

if there has a cache, it wil load the `__fileDiff__` value (which was injected into document by this plugin) to diff file, then patch change & merge it;

## Installation
```
npm install --save-dev diffupdate-webpack-plugin
```

in you webpack config (use it in production mode)
```javascript
const DiffUpdate = require('diffupdate-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin'); // need to work with html-webpack-plugin
module.exports = {
  mode: 'production',
  entry: [
    './src/index.js',
    './src/main.js'
  ],
  output: {
    filename:'[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin(),
    new DiffUpdate({
      limit: 4, // default 3
    })
  ]
}
```
### options 
`limit` version cache limit

## known issue
* Error when require inline css
