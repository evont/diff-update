const fs = require('fs');
const path = require('path');
const jsdiff = require('diff');
require('colors');


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