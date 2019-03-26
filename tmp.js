~(function() {
  var isSupportStorage = window.Storage && window.localStorage && window.localStorage instanceof Storage;
  function mergeDiff(str, diffInfo) {
    var p = 0;
    for (var i = 0; i < diffInfo.length; i++) {
      var info = diffInfo[i];
      if (typeof(info) === 'string') {
        info = info.replace(/\\"/g, '"').replace(/\\'/g, "'");
        str = str.slice(0, p) + info + str.slice(p);
        p += info.length;
      }
      if (typeof(info) === 'number') {
        if (info < 0) {
          str = str.slice(0, p) + str.slice(p + Math.abs(info));
        } else {
          p += info;
        }
        continue;
      }
    }
    return str;
  }
  function ajaxLoad(resource, callback) {
    if (resource) {
      var xmlhttp;
      if (window.XMLHttpRequest) {
        xmlhttp = new XMLHttpRequest();
      } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
      }
      if (xmlhttp) {
        xmlhttp.open('GET', resource);
        xmlhttp.onload = function() {
          var result = this.responseText;
          callback && callback(result);
        }
        xmlhttp.send();
      }
    }
  }
  function execScript(file, key, type) {
    if (window.Blob) {
      var blob = new Blob([ file ], { type: 'text/javascript' });
      var url = URL.createObjectURL(blob);
      var scriptTag = document.createElement('script');
      scriptTag.src = url;
      document.body.appendChild(scriptTag);
    } else {
      window.eval(file);
    }

    localStorage.setItem(key, JSON.stringify({
      hash:  window.__fileHash__,
      source: file,
    }));
  }
  function loadFullSource(item) {
    ajaxLoad(item, function(result) {
      execScript(result, item)
    });
  }
  function loadScript(scripts) {
    for (var i = 0, len = scripts.length; i < len; i ++) {
      var item = scripts[i];
      var needFullSource = !(isSupportStorage && localStorage.getItem(item));

      if (!needFullSource) {
        var itemCache = JSON.parse(localStorage.getItem(item));
        var _hash = itemCache.hash;
        __fileDiff__ = typeof(__fileDiff__) === 'string' ? JSON.parse(__fileDiff__ || '{}') : __fileDiff__;
        var fileInfo = __fileDiff__[item] || [];
        var diff;
        for(var j = 0, len = fileInfo.length; j < len; j ++ ) {
          var _file = fileInfo[j];
          if (_file.hash === _hash) {
            diff = _file.diff;
          }
        }
        if (diff && _hash && itemCache.source) {
          var newScript = mergeDiff(itemCache.source, diff);
          try {
            execScript(newScript, item)
          } catch(e) {
            console.error(e);
            needFullSource = true;
          }
        } else {
          needFullSource = true;
        }
      }
      if (needFullSource) {
        loadFullSource(item);
      }
    }
  }
  window.loadScript = loadScript;
})();