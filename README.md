# diffupdate-webpack-plugin

A Webpack Plugin for diff update javascript via differencing file change & creating a `diff.json`, when front end request a javascript, if there has already had a cache, it will request `diff.json` to patch update, or it will download the javascript file & cache it;

## Why I should use it?
In most cases, when we change a javascript file, even it is just few change, the chunk hash will change, and the client side needs to download the new file, What a waste!

But if we update the file by patching diff, what we need is downloading a file that describe difference infomation, and merge it with the local cache, we will save many request data & get things faster.

**see below:**

if client side has no cache or the cache is out of limited count, it will load the full javascript file & cache it.
![](./blob/WX20190318-173536@2x.png)
if it has a cache, it will request `diff.json` to get the diff info, then patch change & merge it.
![](./blob/WX20190318-173449@2x.png)

1.5K vs 400B, we made it! 

## Installation
```
npm install --save-dev diffupdate-webpack-plugin
```

in you webpack config (use it in production mode)
```javascript
const DiffUpdate = require('diffupdate-webpack-plugin');
// const path = require('path');
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
```

insert the code below in your template html, then execute `loadScript(['main.js'])` to load file;
```javascript
~(function(){function mergeDiff(a,b){var c='';b=JSON.parse(b);var p=0;for(var i=0;i<b.length;i++){var d=b[i];if(typeof(d)=='number'){c+=a.slice(p,p+d);p+=d;continue}if(typeof(d)=='string'){if(d[0]==='+'){var e=d.slice(1,d.length);c+=e}if(d[0]==='-'){var f=parseInt(d.slice(1,d.length));p+=f}}}return c}function ajaxLoad(b,c){var d=new XMLHttpRequest();d.open('GET',b);d.onload=function(){var a=this.responseText;c&&c(a)}d.send()}function loadFullSource(b){ajaxLoad(b,function(a){window.eval(a);localStorage.setItem(b,JSON.stringify({hash:window.__fileHash,source:a,}))})}function loadScript(g){for(var i=0,len=g.length;i<len;i++){var h=g[i];if(localStorage.getItem(h)){var k=JSON.parse(localStorage.getItem(h));var l=k.hash;ajaxLoad('diff.json',function(a){a=JSON.parse(a)var b=a[h];var c;var d;for(var j=0,len=b.length;j<len;j++){var e=b[j];if(e.hash===l){c=e.diff;d=e.hash}}if(c){var f=mergeDiff(k.source,c);window.eval(f);localStorage.setItem(h,JSON.stringify({hash:d,source:f,}))}else{loadFullSource(h)}})}else{loadFullSource(h)}}}window.loadScript=loadScript})();
```