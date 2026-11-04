import { useEffect, useRef, useState } from 'react';
import TABLES from '../data/wildsurge.json';
import { useLocal } from '../lib/store.js';
import { rand, parseTable, readFile } from '../lib/dnd.js';

function customTable(name, text) {
  const { headers, rows } = parseTable(text);
  const numeric = /^\d+$/.test(String(rows[0]?.[headers[0]] ?? ''));
  const cols = numeric ? headers.slice(1) : headers;
  return {
    id: 'custom', name, note: 'Your uploaded table.', columns: cols,
    rows: rows.map((r, i) => ({ n: numeric ? Number(r[headers[0]]) || i + 1 : i + 1, cells: cols.map((c) => r[c]) })),
  };
}

export default function WildSurge() {
  const [tid, setTid] = useLocal('surgeTable', 'phb');
  const [custom, setCustom] = useLocal('surgeCustom', null);
  const [result, setResult] = useState(null);
  const [find, setFind] = useState('');
  const [history, setHistory] = useState([]);
  const rowRefs = useRef({});
  const tables = custom ? [...TABLES, custom] : TABLES;
  const table = tables.find((t) => t.id === tid) || TABLES[0];
  const multi = table.columns.length > 1;

  const doRoll = () => {
    const max = Math.max(...table.rows.map((r) => r.n));
    const n = rand(max);
    const row = table.rows.find((r) => r.n === n) || table.rows[n - 1];
    let col = 0;
    let sev = null;
    if (table.id === 'threeway') {
      sev = rand(20);
      col = sev <= 3 ? 0 : sev <= 9 ? 1 : 2;
    }
    const r = { n, sev, col, text: row?.cells[col] || '—', table: table.name };
    setResult(r);
    setHistory((h) => [r, ...h].slice(0, 10));
  };

  useEffect(() => {
    const el = result && rowRefs.current[result.n];
    const box = el?.closest('.scroll');
    if (box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2, behavior: 'smooth' });
  }, [result]);

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCustom(customTable(f.name, await readFile(f)));
    setTid('custom');
    e.target.value = '';
  };

  const highlightN = Number(find) || result?.n;

  return (
    <div>
      <div className="page-head">
        <div><h1>Wild Magic Surge</h1><p>{table.note}</p></div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="panel stack">
          <div className="chips">
            {tables.map((t) => <button key={t.id} className={`tag chip ${t.id === table.id ? 'on' : ''}`} onClick={() => { setTid(t.id); setResult(null); }}>{t.name}</button>)}
            <label className="tag chip">⬆ Custom table<input type="file" accept=".csv,.tsv,.txt" hidden onChange={upload} /></label>
          </div>
          <button className="btn primary" style={{ fontSize: '1.1rem', padding: 14 }} onClick={doRoll}>🌀 Surge!</button>
          {result && (
            <div className="notice">
              <div className="row"><span className="surge-roll">{result.n}</span>{result.sev && <span className="tag gold">severity d20: {result.sev} → {table.columns[result.col]}</span>}</div>
              <p className="mt" style={{ fontSize: '1.05rem' }}>{result.text}</p>
            </div>
          )}
          <label className="field">Look up a number<input type="number" min="1" max="100" value={find} onChange={(e) => setFind(e.target.value)} /></label>
          {history.length > 1 && (
            <div><h3>Previous surges</h3>{history.slice(1).map((h, i) => <div key={i}><small><b>{h.n}</b> — {h.text}</small></div>)}</div>
          )}
          <small>Custom tables: header row, first column the roll number (optional), then one or more effect columns; separated by | , ; or tab.</small>
        </div>
        <div className="panel">
          <div className="scroll" style={{ maxHeight: 640 }}>
            <table>
              <thead><tr><th>#</th>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.n} ref={(el) => { rowRefs.current[r.n] = el; }} className={r.n === highlightN ? 'hl' : ''}>
                    <td><b>{r.n}</b></td>
                    {r.cells.map((c, i) => <td key={i} style={multi && result?.n === r.n && result.col === i ? { outline: '2px solid var(--gold)' } : undefined}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
