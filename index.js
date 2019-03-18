const fs = require('fs');
const jsdiff = require('diff');
require('colors');

function minimizeDiffInfo(originalInfo) {
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


module.exports = class DiffUpdate {
  constructor() {
    this.fileCache = {};
    this.output = '';
  }
  apply(compiler) {
    compiler.plugin('beforeRun', (compiler) => {
      const output = compiler.options.output.path;
      this.output = output;
      if (fs.existsSync(output)) {
        const files = fs.readdirSync(output);
        files.forEach(item => {
          const data = fs.readFileSync(`${output}/${item}`, 'utf-8');
          if (item.indexOf('.js') !== -1) {
            this.fileCache['js'] = this.fileCache['js'] || {};
            this.fileCache['js'][item] = data;
          }
        })
      }
    })
    compiler.plugin('emit', (compilation, callback) => {
      const diffJson = {
        js: {},
      };
      compilation.chunks.forEach(chunk => {
        chunk.files.forEach(filename => {
          const newFile = compilation.assets[filename].source();
          if (filename.indexOf('.js') !== -1 && fs.existsSync(this.output)) {
            const originFile = this.fileCache['js'][filename];
            const diff = jsdiff.diffChars(originFile, newFile);
            diffJson['js'][filename] = minimizeDiffInfo(diff);
          }
        });
      });
      compilation.assets['diff.json'] = {
        source() { return JSON.stringify(diffJson); },
        size() { return JSON.stringify(diffJson).length;}
      }
      callback();
    })
  }
}