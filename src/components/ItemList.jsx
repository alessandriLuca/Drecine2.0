import { useState } from 'react';
import { uid } from '../lib/dnd.js';

/** Editable equipment list. Items: { id, name, qty, notes, cursed, attuned } */
export default function ItemList({ items = [], onChange, compact }) {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(null);
  const update = (id, patch) => onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const add = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onChange([...items, { id: uid(), name: name.trim(), qty: 1, notes: '', cursed: false, attuned: false }]);
    setName('');
  };
  const attuned = items.filter((i) => i.attuned).length;
  return (
    <div>
      {!compact && (
        <div className="row spread" style={{ marginBottom: 6 }}>
          <small>{items.length} items</small>
          <span className={`tag ${attuned > 3 ? 'red' : ''}`}>Attuned {attuned}/3</span>
        </div>
      )}
      {items.map((it) => (
        <div key={it.id}>
          <div className={`item-row ${it.cursed ? 'cursed' : ''}`}>
            <span className="nm" title={it.notes || it.name}>
              {it.cursed && '☠ '}{it.attuned && '✦ '}{it.name}
            </span>
            <input type="number" min="0" value={it.qty} onChange={(e) => update(it.id, { qty: Number(e.target.value) })} aria-label="Quantity" style={{ padding: '3px 6px' }} />
            <button className="btn small ghost" title="Details" onClick={() => setOpen(open === it.id ? null : it.id)}>⋯</button>
            <button className={`btn small ghost`} title="Toggle attunement" onClick={() => update(it.id, { attuned: !it.attuned })} style={{ color: it.attuned ? 'var(--gold2)' : undefined }}>✦</button>
            <button className="btn small ghost" title="Remove" onClick={() => onChange(items.filter((x) => x.id !== it.id))}>✕</button>
          </div>
          {open === it.id && (
            <div className="stack" style={{ padding: '8px 0' }}>
              <input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} aria-label="Item name" />
              <textarea value={it.notes} placeholder="Notes, effects, curse details…" onChange={(e) => update(it.id, { notes: e.target.value })} style={{ minHeight: 60 }} />
              <label className="row"><input type="checkbox" checked={!!it.cursed} onChange={(e) => update(it.id, { cursed: e.target.checked })} /> Cursed (hidden from the player? write it in the notes)</label>
            </div>
          )}
        </div>
      ))}
      <form className="row" onSubmit={add} style={{ marginTop: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item…" style={{ flex: 1 }} />
        <button className="btn small">Add</button>
      </form>
    </div>
  );
}
