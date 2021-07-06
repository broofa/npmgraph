import React from 'react';
import { tagify } from './util';
import md5 from 'md5';
import ModulePane from './ModulePane';
import GraphPane from './GraphPane';
import InfoPane from './InfoPane';
import filterAlteredClicks from 'filter-altered-clicks';
import { selectTag } from './Graph';
import { useQuery, usePane, useModule, useGraph } from './App';
import { version as VERSION } from '/package.json';

import '/css/Inspector.scss';

export function Fix() {
  return <span style={{ fontWeight: 'bold', color: 'red' }}>FIX!</span>;
}

export function ExternalLink({ href, children, target = '_blank', className, ...props }) {
  return <a href={href} className={`bright-hover ${className ?? ''}`} target={target} {...props}>
  {children}
    <span className='material-icons'>open_in_new</span>
  </a>;
}

export function QueryLink({ query }) {
  const [, setQuery] = useQuery();
  if (!Array.isArray(query)) query = [query];

  function onClick(e) {
    e.preventDefault();
    setQuery(query);
    history.pushState(null, null, e.target.href);
  }

  const url = new URL(location);
  url.search = query.length ? `q=${query.join(',')}` : '';

  return <a href={url} onClick={filterAlteredClicks(onClick)}>{query.join(',')}</a>;
}

export function Section({ title, children, open = true, style, ...props }) {
  return <details open={open}>
    <summary>{title || 'Untitled'}</summary>
    {children}
  </details>;
}

export function Pane({ children, ...props }) {
  return <div className='pane' {...props}>{children}</div>;
}

export function Tags({ children, style, ...props }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', ...style }} {...props}>
    {children}
  </div>;
}

export function Tag({ type, name, title = name, count = 0, gravatar, className, ...props }) {
  if (count > 1) title += ` (${count})`;

  let img = null;
  if (gravatar) {
    const hash = md5(gravatar);
    img = <img src={`https://www.gravatar.com/avatar/${hash}?s=32`} />;
  }

  return <div className={`tag ${type} bright-hover ${className ?? ''}`} title={title}
    onClick={() => selectTag(tagify(type, name), true, true)}>{img}{title}</div>;
}

function Tab({ active, children, ...props }) {
  return <div className={`tab bright-hover ${active ? 'active' : ''}`} {...props}>{children}</div>;
}

export default function Inspector(props) {
  const [query, setQuery] = useQuery();
  const [pane, setPane] = usePane();
  const [module] = useModule();
  const [graph] = useGraph();

  let paneComponent;
  switch (pane) {
    case 'module': paneComponent = <ModulePane id='pane-module' module={module} />; break;
    case 'graph': paneComponent = <GraphPane id='pane-graph' graph={graph} />; break;
    case 'info': paneComponent = <InfoPane id='pane-info' />; break;
  }

  function doSearch(e) {
    const names = e.currentTarget.value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    const query = [...new Set(names)]; // De-dupe

    // Update location
    const url = new URL(location);
    url.hash = '';
    query.length
      ? url.searchParams.set('q', query.join(','))
      : url.searchParams.delete('q');

    history.replaceState(null, window.title, url);

    setQuery(query);
  }

  return <div id='inspector' {...props} >
      <div id='tabs'>
        <Tab active={pane == 'module'} onClick={() => setPane('module')}>Module</Tab>
        <Tab active={pane == 'graph'} onClick={() => setPane('graph')}>Graph</Tab>
        <Tab active={pane == 'info'} onClick={() => setPane('info')}>{'\u{24d8}'}</Tab>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type='text'
            id='search-field'
            defaultValue={query}
            onKeyDown={e => {
              if (/^(?:Enter|Tab)$/.test(e.key)) doSearch(e);
            }}
            placeholder={'\u{1F50D} \xa0Enter module name'}
            autoFocus
          />
        </div>
      </div>

      {paneComponent}

      <footer>
        {'\xa9'} NPMGraph Contributors
        {' '}&mdash;{' '}
        <ExternalLink id='github' href='https://github.com/npmgraph/npmgraph'>GitHub</ExternalLink>
        {' '}&mdash;{' '}
        v{VERSION}
      </footer>
    </div>;
}
