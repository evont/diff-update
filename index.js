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
    const defaultOptions = {
      exclude: false, // 需要排除的文件，与include 互斥
      include: false, // 只需要差分的部分，与exclude 互斥
      limit: 3, // 限定历史版本
    };
    this.options = Object.assign(defaultOptions, options);
    if (this.options.exclude !== false && this.options.include !== false) {
      throw new Error('Diffupdate-webpack-plugin only accept either exclude or include');
    }
    this.fileCache = {};
    this.diffJson = {};
    this.diffJSONName = 'diff.json';
    this.fileCachName = 'fileCache.json';
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
  isNeeded(filename) {
    const { options } = this;
    const { exclude, include } = options;
    if (exclude !== false) {
      if (exclude instanceof Array) {
        return exclude.indexOf(filename) === -1; // 不在排除范围
      } else {
        return exclude === filename;
      }
    }
    if (include !== false) {
      if (include instanceof Array) {
        return include.indexOf(filename) !== -1; 
      } else {
        return include === filename;
      }
    }
  }
  apply(compiler) {
    const _self = this;
    const result = UglifyJS.minify(insertScript);
    const jsList = [];
    function filterJs(tags) {
      const result = [];
      for (let i = 0, len = tags.length; i < len; i ++) {
        const item = tags[i];
        if (item.tagName === 'script') {
          jsList.push(item.attributes.src);
        } else {
          result.push(item);
        }
      }
      return result;
    }
    function onBeforeRun(compiler) {
      const output = compiler.options.output.path;
      if (fs.existsSync(output)) {
        const files = fs.readdirSync(output);
        files.forEach(item => {
          const data = fs.readFileSync(`${output}/${item}`, 'utf-8');
          if (item === _self.diffJSONName) {
            _self.diffJson = JSON.parse(data);
          } else if (item === _self.fileCachName) {
            _self.fileCache = JSON.parse(data);
          }
        })
      }
    }
    
    function onCompilation(compilation) {
      let oriHtml = '';
      function onBeforeHtmlGeneration(htmlPluginData, callback) {
        oriHtml = htmlPluginData.html;
        if (callback) {
          return callback(null, htmlPluginData);
        } else {
          return Promise.resolve(htmlPluginData);
        }
      }
      function onAlterAssetTag(htmlPluginData, callback) {
        if (htmlPluginData.head) {
          htmlPluginData.head = filterJs(htmlPluginData.head);
          htmlPluginData.body = filterJs(htmlPluginData.body).concat();
        } else {
          htmlPluginData.headTags = filterJs(htmlPluginData.headTags);
          htmlPluginData.bodyTags = filterJs(htmlPluginData.bodyTags);
        }
        let newFileCache = [];
        const { diffJson, options, fileCache } = _self;
        compilation.chunks.forEach(chunk => {
          const { hash } = chunk;
          chunk.files.forEach(filename => {
            if (filename.indexOf('.js') !== -1) {
              if (_self.isNeeded(filename.replace(/\.js/, ''))) {
                let newFile = compilation.assets[filename].source();
                newFile = `${newFile}\nwindow.__fileHash__='${hash}'`;
                fileCache[filename] = fileCache[filename] || [];
                diffJson[filename] = diffJson[filename] || [];
                const matchIndex = fileCache[filename].findIndex(ele => ele.hash === hash);
                if (matchIndex === -1) {
                  fileCache[filename].push({ hash, source: newFile });
                  diffJson[filename].push({ hash, diff: '' });
                }
                diffJson[filename].forEach((ele, index) => {
                  const item = fileCache[filename][index];
                  const diff = _self.minimizeDiffInfo(fastDiff(item.source, newFile));
                  ele.diff = diff;
                });
                diffJson[filename] = _self.spliceOverflow(diffJson[filename], options.limit);
                fileCache[filename] = _self.spliceOverflow(fileCache[filename], options.limit);
                newFileCache.push({
                  filename,
                  content: newFile,
                })
              } else {
                if (diffJson[filename]) delete diffJson[filename];
                if (fileCache[filename]) delete fileCache[filename];
              }
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
            compilation.assets[_self.diffJSONName] = {
              source() { return JSON.stringify(diffJson); },
              size() { return JSON.stringify(diffJson).length; }
            }
            compilation.assets[_self.fileCachName] = {
              source() { return JSON.stringify(fileCache); },
              size() { return JSON.stringify(fileCache).length;}
            }
          });
          const insertJson = deepCopy(diffJson);
          for (const i in insertJson) {
            if (jsList.indexOf(i) === -1) delete insertJson[i]
          }
          
          const newScript = [
            {
              tagName: 'script',
              closeTag: true,
              attributes: {
                type: 'text/javascript'
              },
              innerHTML: result.code,
            },
            {
              tagName: 'script',
              closeTag: true,
              attributes: {
                type: 'text/javascript'
              },
              innerHTML: `window.__fileDiff__='${JSON.stringify(insertJson)}';loadScript(${JSON.stringify(jsList)});`
            },
          ]
          if (htmlPluginData.body) {
            htmlPluginData.body = htmlPluginData.body.concat(newScript)
          } else {
            htmlPluginData.bodyTags = htmlPluginData.bodyTags.concat(newScript)
          }
        }
        if (callback) {
          return callback(null, htmlPluginData);
        } else {
          return Promise.resolve(htmlPluginData);
        }
      }

      // Webpack 4+
      if (compilation.hooks) {
        // HtmlWebPackPlugin 3.x
        if (compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration) {
          compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration.tapAsync('diffUpdateWebpackPlugin', onBeforeHtmlGeneration);
          compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync('diffUpdateWebpackPlugin', onAlterAssetTag);
        } else {
          var HtmlWebpackPlugin = require('html-webpack-plugin');
          // HtmlWebPackPlugin 4.x
          if (HtmlWebpackPlugin.getHooks) {
            var hooks = HtmlWebpackPlugin.getHooks(compilation);
            hooks.beforeAssetTagGeneration.tapAsync('diffUpdateWebpackPlugin', onBeforeHtmlGeneration);
            hooks.alterAssetTagGroups.tapAsync('diffUpdateWebpackPlugin', onAlterAssetTag);
          } else {
            // var message = "Error running html-webpack-include-assets-plugin, are you sure you have html-webpack-plugin before it in your webpack config's plugins?";
            // throw new Error(message);
          }
        }
      } else {
        // Webpack 3
        compilation.plugin('html-webpack-plugin-before-html-generation', onBeforeHtmlGeneration);
        compilation.plugin('html-webpack-plugin-alter-asset-tags', onAlterAssetTag);
      }
    }

    // Webpack 4+
    if (compiler.hooks) {
      compiler.hooks.compilation.tap('diffUpdateWebpackPlugin', onCompilation);
      compiler.hooks.beforeRun.tap('diffUpdateWebpackPlugin', onBeforeRun);
    } else {
      // Webpack 3
      compiler.plugin('compilation', onCompilation);
      compiler.plugin('beforeRun', onBeforeRun);
    }
  }
}