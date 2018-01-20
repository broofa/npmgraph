<html lang="en" xml:lang="en" xmlns= "http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Language" content="en" />
    <meta http-equiv="Content-Security-Policy" content="
      default-src
      'unsafe-eval' 'unsafe-inline' 'self'
      https://registry.npmjs.org
      https://registry.npmjs.cf
      https://api.npmjs.org
      https://cdnjs.cloudflare.com
      https://fonts.gstatic.com https://fonts.googleapis.com" />

    <meta name="description" content="Graph / visualize of npm dependencies" />
    <meta name="keywords" content="visualize, visualization, graph, npm, npm modules, npm graph, npm licenses" />

    <title>NPMGraph - Visualize NPM Module Dependencies</title>

    <link href="https://fonts.googleapis.com/css?family=Roboto|Roboto+Condensed|Material+Icons" rel="stylesheet" />
    <link href="./index.css" rel="stylesheet" />

    <script src="https://cdnjs.cloudflare.com/ajax/libs/viz.js/1.8.0/viz-lite.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.4.18/c3.js"></script>
    <script type="module" src="js/index.js"></script>
    <script>
    // Very basic errlog window for surfacing issues to the user.  We're writing
    // ES5 code here so it'll work on unsupported platforms

    var Errlog = {
      el: function() {
        return document.querySelector('#errlog');
      },
      open: function() {
        return this.el().style.display = 'block';
      },
      close: function() {
        return this.el().style.display = 'none';
      },
      append: function(o) {
        var el = document.createElement('div');

        el.classList.add('entry');
        if (o instanceof Error) {
          el.classList.add('error');
          el.innerText = JSON.stringify({
            message: o.message,
            stack: o.stack
          }, null, 2);
        } else if (o instanceof Document) {
          el = o.documentElement;
          el.remove();
        } else if (o instanceof Element || o instanceof DocumentFragment) {
          el = o;
        } else if (typeof(o) == 'string') {
          el.innerText = o;
        } else {
          el.innerText = JSON.stringify(o, null, 2);
        }

        this.el().appendChild(el);
        this.open();
      }
    };

    // If ES6 modules are working, indexLoaded will be set in index.js above, otherwise display a warning
    window.addEventListener('load', function() {
      if (!window.indexLoaded) {
        throw Error('');
        errlog.append('UserAgent: ' + navigator.userAgent);
      }
    });

    window.onerror = function(msg, source, line, col, err) {
      Errlog.append(err);
    };
    </script>
  </head>

  <body class="open">
    <div id="graph"></div>
    <div id="load" style="display:none">
      <h2>Loading module dependencies</h2>
    </div>

    <div id="graph-controls" style="cursor: default">
      <button id="zoomWidthButton" title="fit width" class="material-icons">swap_horiz</button>
      <button id="zoomDefaultButton" title="1x" class="material-icons">search</button>
      <button id="zoomHeightButton" title="fit height" class="material-icons">swap_vert</button>
    </div>

    <div id="inspector">
      <div id="tabs">
        <div class="arrow" id="toggleInspectorButton">&#x25c0</div>
        <div class="button" data-pane="pane-module">Module</div>
        <div class="button" data-pane="pane-graph">Graph</div>
        <div class="button active" data-pane="pane-info">&#9432;</div>
        <input type="text" id="searchText" placeholder="&#x1F50D; &nbsp;Enter module name" />
      </div>

      <div class="pane" id="pane-graph">
        <h2>Module + Dependencies</h2>
        <div class="dependencies"></div>
        <div><h2>Maintainers</h2><div class="maintainers"></div></div>
        <div><h2>Licenses</h2><div class="licenses"></div></div>
        <div id="chart"></div>
      </div>

      <div class="pane" id="pane-module">
        <h2>Module</h2>
        <div class="description"></div>
        <div class="stats"></div>
        <h2>package.json</h2>
        <pre class="json"></pre>
      </div>

      <div class="pane open" id="pane-info">
        <p>
        Enter an NPM module name here <i class="material-icons">arrow_upward</i> to see its dependency graph
        </p>
        <div id="drop_target" style="text-align: center">
					Or drop a <code>package.json</code> file here
				</div>
        <div id="info-footer">
          <div id="copyright">
            &copy; Robert Kieffer, 2017  MIT License
            <a id="github" target="_blank" href="https://github.com/broofa/npmgraph">GitHub</a>
          </div>
          <div id="dev-controls">
            LocalStorage: <span id="storage"></span> <button id="clearButton">Clear</button>
          </div>
        </div>
      </div>
    </div>

    <div id="errlog" style="display:none">
      <script>
        function errlogClose() {
          document.querySelector('#errlog').style.display = 'none';
        }
      </script>
      <button id="errlogClose" onclick="errlogClose()">X</button>
      <h1>Sorry, NPMGraph is unable to run</h1>
      <dl>
      <dt>Firefox users</dt>
      <dd>
      Please make sure you have <code>dom.moduleScripts.enabled = true</code> in
      <a
                          href="https://support.mozilla.org/en-US/kb/about-config-editor-firefox#w_opening-aboutconfig"
                          target="_blank">the Advanced Settings</a>
      </dd>

      <dt>Edge users</dt>
      <dd>
      Please enable <a target="_blank"
        href="https://blogs.windows.com/msedgedev/2016/05/17/es6-modules-and-beyond/">Experimental
        Javascript Features</a>
      </dd>

      <dt>Everyone else</dt>
      <dd>
      Please make sure you're using the latest version of Edge, Safari, Chrome,
      or Firefox.  If you already are, and you're still seeing this, please <a
        target="_blank" href="https://github.com/broofa/NPMGraph/issues">open an
        Issue</a>.  (Be sure to provide your browser and user agent string).
      </dd>
      </dl>
    </div>
  </body>
</html>