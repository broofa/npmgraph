import { html, useContext, useState } from '../vendor/preact.js';
import { Pane, QueryLink } from './Inspector.js';
import { AppContext, store } from './App.js';

// Get names of uploaded modules in session storage
function getFileEntries() {
  return Object.keys(window.sessionStorage)
    .map(k => k.replace('/', '@').replace(/%2f/ig, '/'));
}

export default function InfoPane() {
  const { query: [, setQuery] } = useContext(AppContext);

  const [recents, setRecents] = useState(getFileEntries());

  // Handle file drops
  const onDrop = async ev => {
    ev.target.classList.remove('drag');
    ev.preventDefault();

    // If dropped items aren't files, reject them
    const dt = ev.dataTransfer;
    if (!dt.items) return alert('Sorry, file dropping is not supported by this browser');
    if (dt.items.length != 1) return alert('You must drop exactly one file');

    const item = dt.items[0];
    if (item.type && item.type != 'application/json') return alert('File must have a ".json" extension');

    const file = item.getAsFile();
    if (!file) return alert('Please drop a file, not... well... whatever else it was you dropped');

    const reader = new FileReader();

    const content = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsText(file);
    });

    const pkg = JSON.parse(content);

    if (!pkg?.name) pkg.name = '(upload)';
    if (!pkg?.version) {
      const d = new Date();
      // Make semver string of form YYYY.MM.DD-HH:MM:SS.ddd
      pkg.version = d.toISOString().replace(/-/g, '.').replace('T', '-');
    }

    // Mark package as having been supplied by the user
    pkg._dropped = true;

    // Stash upload in
    const cacheKey = store.cachePackage(pkg);
    window.sessionStorage.setItem(cacheKey, JSON.stringify(pkg));
    const key = cacheKey.replace(/\//, '@');
    setQuery([key]);
    setRecents(getFileEntries());
    history.pushState(null, null, `${location.pathname}?q=${key}`);
  };

  const onDragOver = ev => {
    ev.target.classList.add('drag');
    ev.preventDefault();
  };

  const onDragLeave = ev => {
    ev.currentTarget.classList.remove('drag');
    ev.preventDefault();
  };

  return html`
    <${Pane} style=${{ display: 'flex', flexDirection: 'column' }}>
      <p>
      Enter NPM module name here <i class="material-icons">arrow_upward</i> to see the dependency graph.  Separate multiple module names with commas (e.g. <a href="?q=mocha, chalk, rimraf">"mocha, chalk, rimraf"</a>).
      </p>
      <div id="drop_target" style="text-align: center"
        onDrop=${onDrop}
        onDragOver=${onDragOver}
        onDragLeave=${onDragLeave}
      >
        ... or drop a <code>package.json</code> file here
        </div>
        ${
          recents.length ? html`<div  style=${{ textAlign: 'start' }}>
            <p style=${{ marginTop: '1em' }}>Recent files:</p>
            <ul>
              ${recents.map(name => html`<li><${QueryLink} query=${name} /></li>`)}
            </ul>
          </div>
          <div style=${{ fontSize: '85%', color: 'gray' }}>
            (Dropped files do not leave your computer and are cleared when browser closes.)
          </div>
          ` : null
        }
    </${Pane}>`;
}
