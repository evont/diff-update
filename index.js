const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');
const fastDiff = require('fast-diff');
const diff = require('diff');

const insertScript = fs.readFileSync(path.resolve(__dirname, './tmp.js'), 'utf-8');

function deepCopy(obj) {
  const target = {};
  for (const i in obj) {
    if (typeof obj[i] === 'object') {
      deepCopy(obj[i]);
    }
    target[i] = obj[i];
  }
  return target;
}
module.exports = class DiffUpdate {
  constructor(options = {}) {
    this.fileCache = {};
    this.diffJson = {};
    this.diffJSONName = 'diff.json';
    this.fileCachName = 'fileCache.json';
    this.cacheLimit = options.limit || 3;
  }
  minimizeDiffInfo(originalInfo) {
    const result = originalInfo.map(info => {
      if (info[0] === 0) {
        return info[1].length;
      } else if (info[0] === -1) {
        return -1 * info[1].length;
      } else {
        const str = info[1].replace(/"/g, '\\"').replace(/'/g, `\\"`);
        return str;
      }
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
    compiler.plugin('beforeRun', (compiler) => {
      const output = compiler.options.output.path;
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
    compiler.plugin('compilation', (compilation) => {
      let oriHtml = '';
      compilation.plugin('html-webpack-plugin-before-html-processing', (data) => {
        oriHtml = data.html;
      });
      compilation.plugin('html-webpack-plugin-after-html-processing', (data) => {
        const htmlDiff = diff.diffLines(oriHtml, data.html);
        let newHtml = '';
        let newFileCache = [];
        const { fileCache, diffJson, cacheLimit } = this;
        compilation.chunks.forEach(chunk => {
          const { hash } = chunk;
          chunk.files.forEach(filename => {
            if (filename.indexOf('.js') !== -1) {
              let newFile = compilation.assets[filename].source();
              newFile = `${newFile}\nwindow.__fileHash='${hash}'`;
              fileCache[filename] = fileCache[filename] || [];
              diffJson[filename] = diffJson[filename] || [];
              const matchIndex = fileCache[filename].findIndex(ele => ele.hash === hash);
              if (matchIndex === -1) {
                fileCache[filename].push({ hash, source: newFile });
                diffJson[filename].push({ hash, diff: '' });
              }
              diffJson[filename].forEach((ele, index) => {
                const item = fileCache[filename][index];
                const diff = this.minimizeDiffInfo(fastDiff(item.source, newFile));
                ele.diff = diff;
              });
              diffJson[filename] = this.spliceOverflow(diffJson[filename], cacheLimit);
              fileCache[filename] = this.spliceOverflow(fileCache[filename], cacheLimit);
              newFileCache.push({
                filename,
                content: newFile,
              })
            }
          });
        });
        if (Object.keys(diffJson).length) {
          setTimeout(() => {
            newFileCache.forEach(ele => {
              compilation.assets[ele.filename] = {
                source() { return ele.content; },
                size() { return ele.content.length; }
              }
            })
            compilation.assets[this.diffJSONName] = {
              source() { return JSON.stringify(diffJson); },
              size() { return JSON.stringify(diffJson).length; }
            }
            compilation.assets[this.fileCachName] = {
              source() { return JSON.stringify(fileCache); },
              size() { return JSON.stringify(fileCache).length;}
            }
          });
          for (let i = 0, len = htmlDiff.length; i < len; i += 1) {
            const item = htmlDiff[i];
            const { added, value } = item;
            if (added && /<script type="text\/javascript" src=".*?"><\/script>/.test(value)) {
              let { value } = item;
              const jsList = value.match(/(?<=src=")(.*?\.js)/g);
              value = value.replace(/<script type="text\/javascript" src=".*?"><\/script>/g, '');
              const insertJson = deepCopy(diffJson);
              for (const i in insertJson) {
                if (jsList.indexOf(i) === -1) delete insertJson[i]
              }
              newHtml += `<script>${result.code}</script>\n<script>window.__fileDiff__='${JSON.stringify(insertJson)}';</script><script>loadScript(${JSON.stringify(jsList)});</script>\n${value}`;
            } else if (item.removed) {
  
            } else {
              newHtml += value;
            }
          }
          data.html = newHtml;
        }
      });
    });
  }
}