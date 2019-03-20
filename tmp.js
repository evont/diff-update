~(function() {
  function mergeDiff(oldString, diffInfo) {
      var newString = '';
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
        __fileDiff__ = JSON.parse(window.__fileDiff__ || '{}');
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
          var newScript = mergeDiff(itemCache.source, diff);
          window.eval(newScript);
          localStorage.setItem(item, JSON.stringify({
            hash: newHash,
            source: newScript,
          }));
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