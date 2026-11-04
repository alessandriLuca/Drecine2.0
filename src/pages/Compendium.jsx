import { useMemo, useState } from 'react';
import { useBuiltin } from '../lib/datasets.js';
import { PLAYABLE_RACES, CLASSES, FEATS } from '../lib/character.js';
import { LANGUAGES } from '../lib/languages.js';
import { rarityLabel } from '../lib/dnd.js';
import { Traits } from '../components/ui.jsx';

const KINDS = [
  ['all', 'Everything'], ['magic', 'Magic items'], ['mundane', 'Equipment'], ['race', 'Races'],
  ['class', 'Classes'], ['feat', 'Feats'], ['language', 'Languages'],
];

export default function Compendium() {
  const data = useBuiltin(['magic', 'mundane']);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [open, setOpen] = useState(null);

  const index = useMemo(() => {
    const out = [];
    (data.magic?.items || []).forEach((i) => out.push({ kind: 'magic', name: i.name, sub: `${rarityLabel(i.rarity)}${i.price ? ` · ${i.price}` : ''}`, text: i.description }));
    (data.mundane?.items || []).forEach((i) => out.push({ kind: 'mundane', name: i.name, sub: i.price, text: i.description }));
    PLAYABLE_RACES.forEach((r) => out.push({ kind: 'race', name: r.name, sub: `${r.size} ${r.type}`, text: r.description, race: r }));
    CLASSES.forEach((c) => out.push({ kind: 'class', name: c.name, sub: `d${c.hitDie} · ${c.subclasses.length} subclasses`, text: c.subclasses.join(', '), cls: c }));
    FEATS.forEach((f) => out.push({ kind: 'feat', name: f.name, sub: f.source, text: (f.prerequisite ? `Prerequisite: ${f.prerequisite}. ` : '') + f.text }));
    LANGUAGES.forEach((l) => out.push({ kind: 'language', name: l.name, sub: l.speakers, text: l.info }));
    return out;
  }, [data]);

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = index.filter((e) => (kind === 'all' || e.kind === kind)
    && words.every((w) => e.name.toLowerCase().includes(w) || (q.length > 2 && (e.text || '').toLowerCase().includes(w))))
    .sort((a, b) => {
      const an = a.name.toLowerCase().startsWith(words[0] || '') ? 0 : 1;
      const bn = b.name.toLowerCase().startsWith(words[0] || '') ? 0 : 1;
      return an - bn || a.name.localeCompare(b.name);
    })
    .slice(0, 150);

  return (
    <div>
      <div className="page-head">
        <div><h1>Compendium</h1><p>One search box for {index.length} entries: magic items, equipment, races, classes, feats and languages. Matches names first, then descriptions.</p></div>
      </div>
      <div className="panel">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search… e.g. “bag of holding”, “darkvision”, “warlock”" style={{ fontSize: '1.1rem', padding: 12 }} />
        <div className="chips mt">
          {KINDS.map(([k, l]) => <button key={k} className={`tag chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{l}</button>)}
        </div>
      </div>
      <div className="panel">
        <small>{hits.length >= 150 ? 'Showing the first 150 results' : `${hits.length} results`}</small>
        {hits.map((e, i) => {
          const id = `${e.kind}:${e.name}:${i}`;
          const isOpen = open === id;
          return (
            <div className="trait" key={id} style={{ cursor: 'pointer' }} onClick={() => setOpen(isOpen ? null : id)}>
              <div className="row spread">
                <span><b>{e.name}</b> <small>{e.sub}</small></span>
                <span className="tag">{KINDS.find(([k]) => k === e.kind)[1]}</span>
              </div>
              {isOpen ? <Detail e={e} /> : e.text && <small className="muted" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.text}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ e }) {
  if (e.race) {
    const r = e.race;
    return (
      <div onClick={(ev) => ev.stopPropagation()} style={{ cursor: 'auto' }}>
        <p className="mt">{r.description}</p>
        <Traits traits={r.traits} />
        {r.subraces?.length > 0 && <p><b>Sub-races:</b> {r.subraces.map((s) => s.name).join(', ')}</p>}
        <a className="btn small" href="#/builder">Use in the builder</a>
      </div>
    );
  }
  if (e.cls) {
    const c = e.cls;
    return (
      <div onClick={(ev) => ev.stopPropagation()} style={{ cursor: 'auto' }}>
        <p className="mt"><b>Saves:</b> {c.saves.join(', ')} · <b>Armor:</b> {c.armor.join(', ') || 'none'} · <b>Weapons:</b> {c.weapons.join(', ')}</p>
        <p><b>{c.subclassTitle}:</b> {c.subclasses.join(', ')}</p>
        {c.features.filter(([, n]) => n !== 'Ability Score Improvement').map(([l, n, t], i) => <div key={i} style={{ fontSize: '.88rem' }}><b>{l}. {n}</b> — {t}</div>)}
      </div>
    );
  }
  return <p className="mt" style={{ whiteSpace: 'pre-wrap' }}>{e.text || 'No description.'}</p>;
}
