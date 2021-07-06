import React, { useState, useEffect } from 'react';
import { QueryLink, Pane, Section, Tags, Tag, ExternalLink } from './Inspector';
import { human, fetchJSON, simplur, $ } from './util';
import * as d3 from 'd3';
import '/css/ModulePane.scss';

function ScoreBar({ title, score, style }) {
  const perc = (score * 100).toFixed(0) + '%';
  const inner = <div style={{
    width: perc,
    textAlign: 'right',
    backgroundColor: `hsl(${(score * 120)}, 75%, 50%)`,
    ...style
  }}>{perc}</div>;

  return <>
    <span style={{ marginRight: '1em', ...style }}>{title}</span>
    <div style={{ border: 'solid 1px var(--fg)', width: '200px' }} >{inner}</div>
  </>;
}

function TreeMap({ data, style, ...props }) {
  const [leaves, setLeaves] = useState([]);

  // Effect: Render requires pixel dimensions of the div
  useEffect(() => {
    const { clientWidth: w, clientHeight: h } = $('#treemap')[0], m = 1;

    const { size } = data;

    // eslint-disable-next-line no-undef
    const root = d3.hierarchy(data, ({ dependencySizes: nodes }) => {
      if (!nodes) return;

      const sum = nodes?.reduce((sum, n) => sum + n.approximateSize, 0);

      // Normalize sizes to match total package size
      // See https://github.com/pastelsky/bundlephobia/issues/417
      nodes.forEach(node => node.approximateSize *= size / sum);

      // Combine dependencies that are < 1% of bundle size
      const MIN_SIZE = sum * 0.01;
      const misc = nodes.filter(n => n.approximateSize < MIN_SIZE);
      nodes = nodes.filter(n => n.approximateSize >= MIN_SIZE);
      if (misc.length == 1) {
        nodes.push(misc[0]);
      } else if (misc.length > 1) {
        nodes.push({
          name: `${misc.length} small modules`,
          approximateSize: misc.reduce((sum, n) => sum + n.approximateSize, 0)
        });
      }

      nodes.sort((a, b) => b.approximateSize - a.approximateSize);

      return nodes;
    })
      .sum(v => v.approximateSize)
      .sort((a, b) => b.value - a.value);

    // eslint-disable-next-line no-undef
    d3.treemap()
      .size([w, h])
      .padding(0)(root);

    setLeaves(
      root.leaves().map((d, i, a) => {
        const size = human(d.value, 'B');
        const frac = (d.x1 - d.x0) * (d.y1 - d.y0) / (w * h);
        return <div key={i} title={`${d.data.name} (${size})`} className='bundle-item' style={{
          left: `${d.x0 + m / 2}px`,
          top: `${d.y0 + m / 2}px`,
          width: `${d.x1 - d.x0 - m}px`,
          height: `${d.y1 - d.y0 - m}px`,
          fontSize: `${65 + 70 * Math.sqrt(frac)}%`,
          backgroundColor: `hsl(${(75 + (i / a.length) * 360) % 360}, 50%, 50%)`
        }}>{d.data.name} <span>{size}</span></div>;
      })
    );
  }, [data]);

  return <div id='treemap' style={{ position: 'relative', ...style }} {...props}>
    {leaves}
  </div>;
}

export default function ModulePane({ module, ...props }) {
  const pkg = module?.package;

  if (!pkg) return <Pane>No module selected.  Click a module in the graph to see details.</Pane>;

  const [bundleInfo, setBundleInfo] = useState(null);
  const [npmsInfo, setNpmsInfo] = useState(null);

  if (pkg.stub) {
    return <Pane>
        <h2>{module.name}</h2>
        <p>Information and dependencies for this module cannot be displayed due to the following error:</p>
        <p style={{ color: 'red', fontWeight: 'bold' }}>{pkg.error?.message}</p>
      </Pane>;
  }

  const pn = pkg ? encodeURIComponent(`${pkg.name}@${pkg.version}`) : null;

  useEffect(async() => {
    setBundleInfo(pkg ? null : Error('No package selected'));
    setNpmsInfo(pkg ? null : Error('No package selected'));
    setNpmsInfo(null);

    if (!pkg) return;

    fetchJSON(`https://bundlephobia.com/api/size?package=${pn}`)
      .then(setBundleInfo)
      .catch(setBundleInfo);

    fetchJSON(`https://api.npms.io/v2/package/${pkg.name}`)
      .then(search => setNpmsInfo(search.score))
      .catch(setNpmsInfo);
  }, [pkg]);

  const bpUrl = `https://bundlephobia.com/result?p=${pn}`;

  const scores = npmsInfo?.detail || {};
  if (npmsInfo) scores.final = npmsInfo.final;

  function BundleStats({ bundleInfo, ...props }) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '.3em 1em' }}>
      <span>Minified:</span><strong>{human(bundleInfo.size, 'B')}</strong>
      <span>Gzipped:</span><strong>{human(bundleInfo.gzip, 'B')}</strong>
      </div>;
  }

  return <Pane {...props}>
    <h2><QueryLink query={module.key} /></h2>

    {
      pkg.deprecated
        ? <div className='warning' style={{ padding: '.5em', borderRadius: '.5em' }}>
            <h2 style={{ color: 'darkred', marginTop: 0 }}>Deprecated Module</h2>
            {pkg.deprecated}
          </div>
        : null
    }

    <p>{pkg?.description}</p>

    <ExternalLink href={module.npmLink} style={{ marginRight: '1em' }}>NPM</ExternalLink>
    {module.repoLink ? <ExternalLink href={module.repoLink} style={{ marginRight: '1em' }}>GitHub</ExternalLink> : null}
    {
      // Displaying dropped package contents is a bit problematic, but we give it a shot here.
      module.package?._dropped
        ? <ExternalLink href={`data:text/json;base64,${btoa(JSON.stringify(module.package))}`}>package.json</ExternalLink>
        : <ExternalLink href={module.apiLink}>package.json</ExternalLink>
    }

    <Section title='Bundle Size'>
      {bundleInfo ? <BundleStats bundleInfo={bundleInfo} /> : null}
      {
        (!bundleInfo) ? <span>Loading ...</span>
          : (bundleInfo instanceof Error) ? <span>Unavailable</span>
              : <TreeMap style={{ height: '150px', margin: '1em' }} data={bundleInfo} />
      }
      {
        (bundleInfo && !(bundleInfo instanceof Error)) ? <>Data source: <ExternalLink href={bpUrl}>BundlePhobia</ExternalLink></> : null
      }
    </Section>

    <Section title='NPMS.io Score'>
      {
        !npmsInfo ? 'Loading'
          : (npmsInfo instanceof Error)
              ? 'Unavailable'
              : <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', marginTop: '1em', rowGap: '1px' }}>
            <ScoreBar style={{ fontWeight: 'bold' }} title='Overall' score={scores.final} />
            <ScoreBar style={{ fontSize: '.85em' }} title='Quality' score={scores.quality} />
            <ScoreBar style={{ fontSize: '.85em' }} title='Popularity' score={scores.popularity} />
            <ScoreBar style={{ fontSize: '.85em' }} title='Maintenance' score={scores.maintenance} />
          </div>
      }
    </Section>

    <Section title={simplur`${Object.entries(pkg?.maintainers).length} Maintainer[|s]`}>
      <Tags>
        {pkg.maintainers.map(({ name, email }) => <Tag key={name + email} name={name} type='maintainer' gravatar={email} />)}
      </Tags>
    </Section>
  </Pane>;
}
