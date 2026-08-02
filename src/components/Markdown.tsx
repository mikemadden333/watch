/* Minimal, safe Markdown renderer (no external deps). Supports the subset
   used by Watch's authored content: h1–h3, paragraphs, **bold**, blockquote
   callouts, unordered lists, and pipe tables. Renders inside .v2prose. */

import React from "react";

function inline(text: string, keyBase: string): React.ReactNode[] {
  // split on **bold**
  const out: React.ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) out.push(<b key={`${keyBase}-b${i}`}>{p.slice(2, -2)}</b>);
    else if (p) out.push(<React.Fragment key={`${keyBase}-t${i}`}>{p}</React.Fragment>);
  });
  return out;
}

export default function Markdown({ content }: { content: string }) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const txt = inline(h[2], `h${k}`);
      if (lvl === 1) blocks.push(<h1 key={k++}>{txt}</h1>);
      else if (lvl === 2) blocks.push(<h2 key={k++}>{txt}</h2>);
      else blocks.push(<h3 key={k++}>{txt}</h3>);
      i++;
      continue;
    }
    // blockquote (callout)
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={k++} className="md-callout">
          {inline(buf.join(" "), `q${k}`)}
        </blockquote>
      );
      continue;
    }
    // table
    if (line.startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const cells = (r: string) => r.split("|").slice(1, -1).map((c) => c.trim());
      const header = cells(rows[0]);
      const body = rows.slice(2).map(cells); // skip the |---| separator
      blocks.push(
        <div key={k++} className="md-tablewrap">
          <table className="md-table">
            <thead>
              <tr>{header.map((c, ci) => <th key={ci}>{inline(c, `th${k}-${ci}`)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `td${k}-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={k++} className="md-list">
          {items.map((it, ii) => <li key={ii}>{inline(it, `li${k}-${ii}`)}</li>)}
        </ul>
      );
      continue;
    }
    // paragraph (gather until blank or a block starter)
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|>|\||[-*]\s)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={k++}>{inline(para.join(" "), `p${k}`)}</p>);
  }

  return <>{blocks}</>;
}
