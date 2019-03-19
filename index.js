const fs = require('fs');
const UglifyJS = require('uglify-js');
const jsdiff = require('diff');

const insertScript = `~(function() {
  function mergeDiff(oldString, diffInfo) {
      var newString = '';
      diffInfo = JSON.parse(diffInfo);
      var p = 0;
      for (var i = 0; i < diffInfo.length; i++) {
          var info = diffInfo[i];
          if (typeof(info) == 'number') {
              newString += oldString.slice(p, p + info);
              p += info;
              continue;
          }
          if (typeof(info) == 'string') {
              if (info[0] === '+') {
                  var addedString = info.slice(1, info.length);
                  newString += addedString;
                  oldString = oldString.slice(0, p) + addedString + oldString.slice(p + addedString.length);
                  p += addedString.length;
              }
              if (info[0] === '-') {
                  var removedCount = parseInt(info.slice(1, info.length));
                  p += removedCount;
              }
          }
      }
      return newString;
  }
  function ajaxLoad(resource, callback) {
    var ajax = new XMLHttpRequest();
    ajax.open('GET', resource);
    ajax.onload = function() {
      var result = this.responseText;
      callback && callback(result);
    }
    ajax.send();
  }
  function loadFullSource(item) {
    ajaxLoad(item, function(result) {
      window.eval(result);
      localStorage.setItem(item, JSON.stringify({
        hash: window.__fileHash,
        source: result,
      }));
    });
  }
  function loadScript(scripts) {
    for (var i = 0, len = scripts.length; i < len; i ++) {
      var item = scripts[i];
      if (localStorage.getItem(item)) {
        var itemCache = JSON.parse(localStorage.getItem(item));
        var _hash = itemCache.hash;
        ajaxLoad('diff.json', function(result) {
          result = JSON.parse(result)
          var fileInfo = result[item];
          
          var diff;
          var newHash;
          for(var j = 0, len = fileInfo.length; j < len; j ++ ) {
            var _file = fileInfo[j];
            if (_file.hash === _hash) {
              diff = _file.diff;
              newHash = _file.hash;
            }
          }
          if (diff) {
            var newScript = mergeDiff(itemCache.source, diff);
            console.log(newScript);
            window.eval(newScript);
            localStorage.setItem(item, JSON.stringify({
              hash: newHash,
              source: newScript,
            }));
          } else {
            loadFullSource(item);
          }
        });
      } else {
        loadFullSource(item);
      }
    }
  }
  window.loadScript = loadScript;
})();`;

module.exports = class DiffUpdate {
  constructor() {
    /**
     * 文件缓存
    */
    this.fileCache = {}; // { 'main.js' : { 'v1': 'dsfafad', 'v2': 'sdafsdfadsf   }  }
    /**
     * 增量差分数据
    */
    this.diffJson = {}; // { 'main.js' : { 'v1': 'dsfafad', 'v2': 'sdafsdfadsf   }  }
    this.output = '';
    this.diffJSONName = 'diff.json';
    this.fileCachName = 'fileCache.json';
    this.cacheLimit = 3;
  }
  minimizeDiffInfo(originalInfo) {
    const result = originalInfo.map(info => {
      if (info.added) {
        return '+' + info.value;
      }
      if (info.removed) {
        return '-' + info.count;
      }
      return info.count;
    });
    return JSON.stringify(result);
  }
  spliceOverflow(arr, limit) {
    const len = arr.length;
    if (len > limit) {
      arr.splice(0, len - limit);
    }
    return arr;
  }
  apply(compiler) {
    const result = UglifyJS.minify(insertScript);
    compiler.plugin('compilation', (compilation) => {
      let oriHtml = '';
      compilation.plugin('html-webpack-plugin-before-html-processing', function(data) {
        // console.log(data);
        oriHtml = data.html;
        // const result = UglifyJS.minify(insertScript);
      });
      compilation.plugin('html-webpack-plugin-after-html-processing', function(data) {
        const diff = jsdiff.diffWords(oriHtml, data.html);
        let newHtml = '';
        let count = 0;

        for (let i = 0, len = diff.length; i < len; i += 1) {
          const item = diff[i];
          if (item.added) {
            let { value } = item;
            const jsList = value.match(/(?<=src=")(.*?\.js)/g);
            value = value.replace(/<script type="text\/javascript" src=".*?"><\/script>/g, '');
            newHtml += `<script>${result.code}</script>\n<script>loadScript(${JSON.stringify(jsList)})</script>\n${value}`;
          } else if (item.removed) {

          } else {
            newHtml += item.value;
          }
        }
        data.html = newHtml;
      });
    })
    compiler.plugin('beforeRun', (compiler) => {
      const output = compiler.options.output.path;
      const publicPath = compiler.options.output.publicPath || '/';

      this.output = output;
      if (fs.existsSync(output)) {
        const files = fs.readdirSync(output);
        files.forEach(item => {
          const data = fs.readFileSync(`${output}/${item}`, 'utf-8');
          if (item === this.diffJSONName) {
            this.diffJson = JSON.parse(data);
          } else if (item === this.fileCachName) {
            this.fileCache = JSON.parse(data);
          }
        })
      }
    })
    compiler.plugin('emit', (compilation, callback) => {
      const { fileCache, diffJson, cacheLimit } = this;
      compilation.chunks.forEach(chunk => {
        const { hash } = chunk;
        chunk.files.forEach(filename => {
          const newFile = compilation.assets[filename].source();
          fileCache[filename] = fileCache[filename] || [];
          diffJson[filename] = diffJson[filename] || [];
          if (filename.indexOf('.js') !== -1) {
            const matchIndex = fileCache[filename].findIndex(ele => ele.hash === hash);
            if (matchIndex === -1) {
              fileCache[filename].push({ hash, source: newFile });
              diffJson[filename].push({ hash, diff: '' });
            }
            diffJson[filename].forEach((ele, index) => {
              const item = fileCache[filename][index];
              const diff = this.minimizeDiffInfo(jsdiff.diffChars(item.source, newFile));
              ele.diff = diff;
            });
            diffJson[filename] = this.spliceOverflow(diffJson[filename], cacheLimit);
            fileCache[filename] = this.spliceOverflow(fileCache[filename], cacheLimit);
          }
          const newContent = `${newFile}\nwindow.__fileHash = '${hash}';`;
          compilation.assets[filename] = {
            source() { return newContent; },
            size() { return newContent.length; }
          }
        });
      });
      compilation.assets[this.fileCachName] = {
        source() { return JSON.stringify(fileCache); },
        size() { return JSON.stringify(fileCache).length;}
      }
      compilation.assets[this.diffJSONName] = {
        source() { return JSON.stringify(diffJson); },
        size() { return JSON.stringify(diffJson).length;}
      }
      callback();
    })
  }
}