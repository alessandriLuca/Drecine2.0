import { useEffect, useState } from 'react';
import { useCharacters, useLocal } from '../lib/store.js';
import { BUILTIN, loadBuiltin, normalizeItems } from '../lib/datasets.js';
import { rarityLabel, readFile, uid, rand } from '../lib/dnd.js';
import { Field } from '../components/ui.jsx';

const PRESETS = [
  { label: 'Any', min: 1, max: 20 },
  { label: 'Common (15–20)', min: 15, max: 20 },
  { label: 'Uncommon (11–14)', min: 11, max: 14 },
  { label: 'Rare (7–10)', min: 7, max: 10 },
  { label: 'Very rare (4–6)', min: 4, max: 6 },
  { label: 'Legendary (1–3)', min: 1, max: 3 },
];

export default function Loot() {
  const { characters, save } = useCharacters();
  const [source, setSource] = useLocal('lootSource', 'magic');
  const [custom, setCustom] = useLocal('lootCustom', null); // { name, items }
  const [db, setDb] = useState({ items: [] });
  const [min, setMin] = useLocal('lootMin', 1);
  const [max, setMax] = useLocal('lootMax', 20);
  const [count, setCount] = useLocal('lootCount', 3);
  const [weighted, setWeighted] = useLocal('lootWeighted', true);
  const [unique, setUnique] = useLocal('lootUnique', true);
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (source === 'custom') { setDb(custom || { items: [] }); return; }
    loadBuiltin(source).then(setDb).catch((e) => setMsg({ t: 'err', m: e.message }));
  }, [source, custom]);

  const pool = db.items.filter((i) => i.rarity == null || (i.rarity >= min && i.rarity <= max));

  const doRoll = () => {
    if (!pool.length) { setMsg({ t: 'err', m: 'No items match these filters.' }); return; }
    const avail = [...pool];
    const out = [];
    for (let k = 0; k < Math.min(count, unique ? avail.length : 99); k++) {
      let idx;
      if (weighted && avail.some((i) => i.rarity)) {
        // higher rarity number = more common = more likely
        const total = avail.reduce((s, i) => s + (i.rarity || 10), 0);
        let r = Math.random() * total;
        idx = avail.findIndex((i) => (r -= i.rarity || 10) < 0);
        if (idx < 0) idx = avail.length - 1;
      } else idx = rand(avail.length) - 1;
      out.push({ ...avail[idx], key: uid() });
      if (unique) avail.splice(idx, 1);
    }
    setResults(out);
    setMsg(null);
  };

  const give = (item) => {
    const ch = characters.find((c) => c.id === target);
    if (!ch) { setMsg({ t: 'err', m: 'Choose who receives the item first.' }); return; }
    const notes = [item.price && `Price: ${item.price}`, item.rarity && `Rarity ${item.rarity} (${rarityLabel(item.rarity)})`, item.description].filter(Boolean).join(' · ');
    save({ ...ch, equipment: [...(ch.equipment || []), { id: uid(), name: item.name, qty: 1, notes, cursed: /curse/i.test(item.description), attuned: false }] });
    setMsg({ t: 'ok', m: `${item.name} given to ${ch.name || 'character'}.` });
  };

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = normalizeItems(await readFile(f));
    if (!parsed.items.length) { setMsg({ t: 'err', m: 'No rows found. The file needs a header row with at least a Name column.' }); return; }
    setCustom({ name: f.name, ...parsed });
    setSource('custom');
    setMsg({ t: 'ok', m: `Loaded ${parsed.items.length} items from ${f.name}${parsed.hasRarity ? '' : ' (no Rarity column: rarity filter ignored)'}.` });
    e.target.value = '';
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Loot &amp; Item Roller</h1>
          <p>Pick a database, filter by rarity and roll. Rarity uses a 1–20 scale where <b>20 is very common</b> and <b>1 is legendary</b>; with “weighted” on, common items show up more often.</p>
        </div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="panel stack">
          <h2>Database</h2>
          <div className="chips">
            {BUILTIN.map((b) => <button key={b.id} className={`tag chip ${source === b.id ? 'on' : ''}`} onClick={() => setSource(b.id)}>{b.name}</button>)}
            {custom && <button className={`tag chip ${source === 'custom' ? 'on' : ''}`} onClick={() => setSource('custom')}>{custom.name}</button>}
            <label className="tag chip">⬆ Upload your own<input type="file" accept=".txt,.csv,.tsv" hidden onChange={upload} /></label>
          </div>
          <small>{db.items.length} items loaded · {pool.length} match the filter. Custom files: header row, columns separated by | , ; or tab (Name, Price, Rarity, Description…). <a href="#/database">Generate one with AI →</a></small>
          <h2 className="mt">Filters</h2>
          <div className="chips">
            {PRESETS.map((p) => <button key={p.label} className={`tag chip ${min === p.min && max === p.max ? 'on' : ''}`} onClick={() => { setMin(p.min); setMax(p.max); }}>{p.label}</button>)}
          </div>
          <div className="grid g3">
            <Field label="Rarity from"><input type="number" min="1" max="20" value={min} onChange={(e) => setMin(Number(e.target.value))} /></Field>
            <Field label="Rarity to"><input type="number" min="1" max="20" value={max} onChange={(e) => setMax(Number(e.target.value))} /></Field>
            <Field label="How many"><input type="number" min="1" max="50" value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} /></Field>
          </div>
          <label className="row"><input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} /> Weighted by rarity</label>
          <label className="row"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> No duplicates</label>
          <button className="btn primary" onClick={doRoll}>🎲 Roll loot</button>
        </div>
        <div className="panel">
          <div className="row spread">
            <h2 style={{ margin: 0 }}>Results</h2>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="">Give to…</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
            </select>
          </div>
          {msg && <div className={`notice ${msg.t} mt`}>{msg.m}</div>}
          {!results.length && <p className="muted mt">Roll to see the treasure.</p>}
          {results.map((it) => (
            <div key={it.key} className="trait">
              <div className="row spread">
                <b>{it.name}</b>
                <div className="row" style={{ gap: 6 }}>
                  {it.price && <span className="tag">{it.price}</span>}
                  {it.rarity && <span className="tag gold">{it.rarity} · {rarityLabel(it.rarity)}</span>}
                  <button className="btn small" disabled={!characters.length} onClick={() => give(it)}>Give</button>
                </div>
              </div>
              {it.description && <p style={{ margin: '4px 0 0', fontSize: '.9rem' }}>{it.description}</p>}
              {Object.entries(it.extra || {}).map(([k, v]) => <small key={k} style={{ display: 'block' }}><b>{k}:</b> {v}</small>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
