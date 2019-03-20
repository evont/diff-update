const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');
const jsdiff = require('fast-diff');

const insertScript = fs.readFileSync(path.resolve(__dirname, './tmp.js'), 'utf-8');

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
    return result;
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
    const _self = this;
    compiler.plugin('compilation', (compilation) => {
      let oriHtml = '';
      compilation.plugin('html-webpack-plugin-before-html-processing', function(data) {
        oriHtml = data.html;
      });
      compilation.plugin('html-webpack-plugin-after-html-processing', function(data) {
        const diff = jsdiff(oriHtml, data.html);
        let newHtml = '';
        const { fileCache, diffJson, cacheLimit } = _self;
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
                const diff = jsdiff(item.source, newFile);  
                ele.diff = diff;
              });
              diffJson[filename] = _self.spliceOverflow(diffJson[filename], cacheLimit);
              fileCache[filename] = _self.spliceOverflow(fileCache[filename], cacheLimit);
            }
            const newContent = `${newFile}`;
            compilation.assets[filename] = {
              source() { return newContent; },
              size() { return newContent.length; }
            }
            compilation.assets[_self.diffJSONName] = {
              source() { return JSON.stringify(diffJson); },
              size() { return JSON.stringify(diffJson).length; }
            }
          });
        });
        compilation.assets[_self.fileCachName] = {
          source() { return JSON.stringify(fileCache); },
          size() { return JSON.stringify(fileCache).length;}
        }
        for (let i = 0, len = diff.length; i < len; i += 1) {
          const item = diff[i];
          if (item.added) {
            let { value } = item;
            const jsList = value.match(/(?<=src=")(.*?\.js)/g);
            value = value.replace(/<script type="text\/javascript" src=".*?"><\/script>/g, '');
            newHtml += `<script>${result.code}</script>\n<script>window.__fileDiff__='${JSON.stringify(diffJson)}';loadScript(${JSON.stringify(jsList)})</script>\n${value}`;
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
  }
}