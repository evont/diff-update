~(function() {
  function mergeDiff(oldString, diffInfo) {
      var p = 0;
      for (var i = 0; i < diffInfo.length; i++) {
        var info = diffInfo[i];
        if (typeof(info) == 'string') {
          info = info.replace(/\\"/g, '"').replace(/\\'/g, "'");
          oldString = oldString.slice(0, p) + info + oldString.slice(p);
          p += info.length;
        }
        if (typeof(info) == 'number') {
          if (info < 0) {
            oldString = oldString.slice(0, p) + oldString.slice(p + Math.abs(info));
          } else {
            p += info;
          }
          continue;
        }
      }
      return oldString;
  }
  function ajaxLoad(resource, callback) {
    if (resource) {
      var ajax = new XMLHttpRequest();
      ajax.open('GET', resource);
      ajax.onload = function() {
        var result = this.responseText;
        callback && callback(result);
      }
      ajax.send();
    }
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
        __fileDiff__ = typeof(__fileDiff__) === 'string' ? JSON.parse(__fileDiff__ || '{}') : __fileDiff__;
        var fileInfo = __fileDiff__[item] || [];
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
          var newScript = mergeDiff(itemCache.source || '', diff);
          window.eval(newScript);
          // localStorage.setItem(item, JSON.stringify({
          //   hash: newHash,
          //   source: newScript,
          // }));
        } else {
          loadFullSource(item);
        }
      } else {
        loadFullSource(item);
      }
    }
  }
  window.loadScript = loadScript;
})();