import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import { useColorize, useDepIncludes, useExcludes } from './App';
import { Toggle } from './Components';
import { hslFor } from './Graph';
import { Pane, Section, Tag, Tags } from './Inspector';
import { simplur } from './util';
import '/css/GraphPane.scss';

function DepInclude({ type, ...props }) {
  const [depIncludes, setDepIncludes] = useDepIncludes();

  let arrow = null;
  switch (type) {
    case 'devDependencies': arrow = <>(<span style={{ color: 'red' }}>{'\u{2794}'}</span>)</>; break;
    case 'peerDependencies': arrow = <>(<span style={{ color: 'green' }}>{'\u{2794}'}</span>)</>; break;
  }

  function toggle(checked) {
    setDepIncludes(checked ? [type, ...depIncludes] : depIncludes.filter(t => type != t));
  }

  return <Toggle checked={depIncludes.includes(type)} onChange={toggle}>
      <span>{type} {arrow}</span>
      </Toggle>
  ;
}

function PieGraph({ entries, ...props }) {
  const svgEl = useRef();
  useEffect(() => {
    // Chart code from https://observablehq.com/@d3/pie-chart

    const svg = d3.select(svgEl.current);

    // Align SVG view box to actual element dimensions
    const { width, height } = svg.node().getBoundingClientRect();
    const w2 = width / 2, h2 = height / 2;
    const radius = Math.min(w2, h2);
    svg.attr('viewBox', `${-w2} ${-h2} ${width} ${height}`);

    // Create arcs
    const arcs = d3.pie()
      .value(e => e[1])
      .sort(null)(entries);

    // Create colors
    const color = d3.scaleOrdinal()
      .domain(entries.map(e => e[0]))
      .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), entries.length).reverse());

    // Render arcs
    svg.append('g')
      .attr('stroke', 'white')
      .selectAll('path')
      .data(arcs)
      .join('path')
      .attr('fill', e => color(e.data[0]))
      .attr('d',
        d3.arc()
          .innerRadius(radius / 2)
          .outerRadius(radius)
      )
      .append('title')
      .text(d => `${d.data[0]}: ${d.data[1].toLocaleString()}`)
    ;

    // Render labels
    const arcLabel = d3.arc().innerRadius(radius * 0.8).outerRadius(radius * 0.8);
    svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('text-anchor', 'middle')
      .attr('fill', 'black')
      .selectAll('text')
      .data(arcs)
      .join('text')
      .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
      .attr('font-size', d => `${0.75 + (d.endAngle - d.startAngle) / Math.PI / 2}em`)
      .call(text => text.append('tspan')
        .attr('y', '-0.4em')
        .text(d => d.data[0]))
      .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append('tspan')
        .attr('x', 0)
        .attr('y', '0.7em')
        .attr('fill-opacity', 0.5)
        .text(d => d.data[1].toLocaleString()));
  });

  return <svg ref={svgEl} {...props}/>;
}

export default function GraphPane({ graph, ...props }) {
  const compareEntryKey = ([a], [b]) => a < b ? -1 : a > b ? 1 : 0;
  const compareEntryValue = ([, a], [, b]) => a < b ? -1 : a > b ? 1 : 0;
  const [colorize, setColorize] = useColorize();
  const [excludes] = useExcludes();

  const occurances = {};
  const maintainers = {};
  let licenses = {};
  for (const [, { module: { package: pkg, licenseString: license } }] of graph) {
    // Tally module occurances
    occurances[pkg.name] = (occurances[pkg.name] || 0) + 1;

    // Tally maintainers
    for (const { name, email } of pkg.maintainers) {
      if (!maintainers[name]) {
        maintainers[name] = { name, email, count: 1 };
      } else {
        maintainers[name].count++;
      }
    }

    // Tally licenses
    licenses[license] = (licenses[license] || 0) + 1;
  }

  licenses = Object.entries(licenses)
    .sort(compareEntryValue)
    .reverse();

  return <Pane {...props}>
    <DepInclude type='dependencies' />
    <DepInclude type='devDependencies' />
    <DepInclude type='peerDependencies' />

    <label>
      <select value={colorize ?? ''} onChange={e => setColorize(e.target.value)} style={{ borderRadius: '0.5em', padding: 4, marginTop: '0.5em' }}>
        <option value=''>Colorize By ...</option>
        <option value=''>Nothing (uncolored)</option>
        <option value='overall'> NPMS.io overall score</option>
        <option value='quality'> NPMS.io quality score</option>
        <option value='popularity'> NPMS.io popularity score</option>
        <option value='maintenance'>NPMS.io maintenance score</option>
        <option value='bus'># of maintainers</option>
      </select>
    </label>

    {
      colorize == 'bus' ? <div>
      <span style={{ color: hslFor(0) }}>{'\u2B24'}</span> = 1 maintainer,
      <span style={{ color: hslFor(1 / 3) }}>{'\u2B24'}</span> = 2,
      <span style={{ color: hslFor(2 / 3) }}>{'\u2B24'}</span> = 3,
      <span style={{ color: hslFor(3 / 3) }}>{'\u2B24'}</span> = 4+
      </div>
        : colorize ? <div>
      <span style={{ color: hslFor(0) }}>{'\u2B24'}</span> = 0%,
      <span style={{ color: hslFor(1 / 2) }}>{'\u2B24'}</span> = 50%,
      <span style={{ color: hslFor(2 / 2) }}>{'\u2B24'}</span> = 100%
      </div> : null
    }

    <Section title={simplur`${graph.size} Module[|s]`}>
      <Tags>
        {
          Object.entries(occurances)
            .sort(compareEntryKey)
            .map(([name, count]) => <Tag key={name + count} name={name} type='module' count={count}
          className={excludes.includes(name) ? 'collapsed' : null}
          />)
        }
      </Tags>

      <div style={{ fontSize: '90%', color: 'var(fg-dim)', marginTop: '1em' }}>
        (Shift-click modules in graph to expand/collapse)
      </div>
    </Section>

    <Section title={simplur`${Object.entries(maintainers).length} Maintainer[|s]`}>
      <Tags>
        {
          Object.entries(maintainers)
            .sort(compareEntryKey)
            .map(([, { name, email, count }]) => <Tag key={name + count} name={name} type='maintainer' count={count} gravatar={email} />)
        }
      </Tags>
    </Section>

    <Section title={simplur`${licenses.length} License[|s]`}>
      <Tags>
        {
          licenses.map(([name, count]) => <Tag key={name + count} name={name} type='license' count={count} />)
        }
      </Tags>

      {licenses.length > 1 ? <PieGraph style={{ width: '100%', height: '200px', padding: '1em 0' }} entries={licenses} /> : null}
    </Section>

  </Pane>;
}
