import React, { useEffect, useState } from 'react';
import { Loader } from './Components';
import Graph from './Graph';
import Inspector from './Inspector';
import sharedStateHook from './sharedStateHook';
import Store from './Store';
import { LoadActivity } from './util';
import '/css/App.scss';

export const usePane = sharedStateHook('info', 'pane');
export const useInspectorOpen = sharedStateHook(true, 'inspectorOpen');
export const useQuery = sharedStateHook(queryFromLocation(), 'query');
export const useModule = sharedStateHook([], 'module');
export const useGraph = sharedStateHook([], 'graph');
export const useDepIncludes = sharedStateHook(['dependencies'], 'depIncludes');
export const useExcludes = sharedStateHook([], 'excludes');

function Splitter({ onClick, isOpen }) {
  return <div id='splitter' className='theme-dark bright-hover' onClick={onClick}>{isOpen ? '\u{25b6}' : '\u{25c0}'}</div>;
}

// Parse `q` query param from browser location
function queryFromLocation() {
  const q = new URL(location).searchParams.get('q');
  return (q ?? '').split(',').map(v => v.trim()).filter(Boolean);
}

export const activity = new LoadActivity();
export const store = new Store(activity);
export function useActivity() {
  const [bool, setBool] = useState(true);
  activity.onChange = () => setBool(!bool);
  return activity;
}

export default function App() {
  const activity = useActivity();
  const [, setQuery] = useQuery();

  useEffect(() => {
    function handlePopState() {
      setQuery(queryFromLocation());
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [inspectorOpen, setInspectorOpen] = useInspectorOpen();

  return <>
    {activity.total > 0 ? <Loader activity={activity} /> : null}
    <Graph />
    <Splitter isOpen={inspectorOpen} onClick={() => setInspectorOpen(!inspectorOpen)} />
    <Inspector className={inspectorOpen ? 'open' : ''} />
  </>;
}
