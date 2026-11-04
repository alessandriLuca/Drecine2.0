import { useState } from 'react';
import yaml from 'js-yaml';
import { useCharacters } from '../lib/store.js';
import { compute, newCharacter, raceImage } from '../lib/character.js';
import ClassEmblem from '../components/ClassEmblem.jsx';
import { ABILITIES } from '../data/classes.js';
import { fmt, download, readFile, uid } from '../lib/dnd.js';
import ItemList from '../components/ItemList.jsx';

const CONDITIONS = ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Concentrating', 'Inspired'];

export default function Party() {
  const { characters, save, remove, replaceAll } = useCharacters();
  const [msg, setMsg] = useState('');

  const importFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await readFile(f);
      let data = f.name.endsWith('.json') ? JSON.parse(text) : yaml.load(text);
      if (data?.characters) data = data.characters;
      if (!Array.isArray(data)) data = [data];
      const fresh = data.filter(Boolean).map((x) => normalize(x));
      replaceAll([...characters, ...fresh]);
      setMsg(`Imported ${fresh.length} character(s).`);
    } catch (err) {
      setMsg(`Import failed: ${err.message}`);
    }
    e.target.value = '';
  };

  const quickAdd = () => {
    const name = window.prompt('Character name?');
    if (name) save({ ...newCharacter(), name, quick: true });
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Party</h1>
          <p>Live tracker for the table: hit points, conditions, equipment (including cursed and attuned items), coins and notes. Open any character in the builder for the full sheet.</p>
        </div>
        <div className="row">
          <a className="btn primary" href="#/builder">+ Build character</a>
          <button className="btn" onClick={quickAdd}>+ Quick add</button>
          <label className="btn">Import<input type="file" accept=".json,.yaml,.yml" hidden onChange={importFile} /></label>
          <button className="btn" disabled={!characters.length} onClick={() => download('party.json', JSON.stringify({ characters }, null, 2), 'application/json')}>Export JSON</button>
          <button className="btn" disabled={!characters.length} onClick={() => download('party.yaml', yaml.dump({ characters: characters.map(({ portrait, ...rest }) => rest) }))}>Export YAML</button>
        </div>
      </div>
      {msg && <div className="notice ok" style={{ marginBottom: 12 }}>{msg}</div>}
      {!characters.length && (
        <div className="panel center">
          <h2>No adventurers yet</h2>
          <p className="muted">Build a character, quick-add one, or import a party file exported from DRECINE.</p>
        </div>
      )}
      <div className="grid g2">
        {characters.map((c) => <PartyCard key={c.id} c={c} save={save} remove={remove} />)}
      </div>
    </div>
  );
}

function normalize(x) {
  const base = newCharacter();
  // legacy DRECINE 1 format: { name, level, race, class, str, dex, ..., ac, hp, pp, equipment: "1) item\n2) item" }
  if (typeof x.equipment === 'string') {
    x.equipment = x.equipment.split('\n').map((l) => l.replace(/^\s*\d+\)\s*/, '').trim()).filter(Boolean)
      .map((n) => ({ id: uid(), name: n, qty: 1, notes: '', cursed: false, attuned: false }));
  }
  const legacyBase = {};
  ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach((k) => { if (x[k] != null) legacyBase[k.toUpperCase()] = Number(x[k]); });
  return {
    ...base,
    ...x,
    id: uid(),
    base: Object.keys(legacyBase).length ? { ...base.base, ...legacyBase } : (x.base || base.base),
    method: Object.keys(legacyBase).length ? 'manual' : (x.method || base.method),
    quick: x.quick ?? Object.keys(legacyBase).length > 0,
  };
}

function PartyCard({ c, save, remove }) {
  const d = compute(c);
  const [delta, setDelta] = useState('');
  const [tab, setTab] = useState('items');
  const set = (patch) => save({ ...c, ...patch });
  const maxHp = c.hpOverride || d.hp;
  const cur = c.hpCurrent ?? maxHp;
  const applyHp = (sign) => {
    const n = Math.abs(Number(delta) || 0);
    if (!n) return;
    if (sign < 0) {
      const fromTemp = Math.min(c.tempHp || 0, n);
      set({ tempHp: (c.tempHp || 0) - fromTemp, hpCurrent: Math.max(0, cur - (n - fromTemp)) });
    } else set({ hpCurrent: Math.min(maxHp, cur + n) });
    setDelta('');
  };
  const pct = Math.max(0, Math.min(100, (cur / maxHp) * 100));
  return (
    <div className="pc-card">
      <div className="row spread">
        <div className="row">
          <img src={c.portrait || raceImage(d.race.id)} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', objectPosition: 'top' }} />
          <div>
            <h3 style={{ margin: 0, color: 'var(--gold2)' }}>{c.name || 'Unnamed'}</h3>
            <small>{d.raceName} · {d.cls.name} {d.level}{c.player ? ` · ${c.player}` : ''}</small>
          </div>
        </div>
        <div className="row">
          <ClassEmblem id={d.cls.id} size={36} />
          <a className="btn small" href={`#/builder?id=${c.id}`}>Sheet</a>
          <button className="btn small danger" onClick={() => window.confirm(`Remove ${c.name || 'this character'} from the party?`) && remove(c.id)}>✕</button>
        </div>
      </div>

      <div className="grid g4 mt" style={{ gap: 6 }}>
        <div className="abil-box"><div className="k">AC</div><div className="v">{c.acOverride || d.ac}</div></div>
        <div className="abil-box"><div className="k">PASSIVE</div><div className="v">{d.passive}</div></div>
        <div className="abil-box"><div className="k">INIT</div><div className="v">{fmt(d.initiative)}</div></div>
        <div className="abil-box"><div className="k">SPEED</div><div className="v">{d.speed.walk}</div></div>
      </div>

      <div className="mt">
        <div className="row spread"><b>HP {cur} / {maxHp}{c.tempHp ? <span className="tag gold" style={{ marginLeft: 6 }}>+{c.tempHp} temp</span> : null}</b>
          <div className="row" style={{ gap: 4 }}>
            <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="±" style={{ width: 70, padding: '4px 8px' }} aria-label="HP change" />
            <button className="btn small danger" onClick={() => applyHp(-1)}>Damage</button>
            <button className="btn small" onClick={() => applyHp(1)}>Heal</button>
            <button className="btn small ghost" title="Set temporary HP" onClick={() => { set({ tempHp: Math.max(c.tempHp || 0, Number(delta) || 0) }); setDelta(''); }}>Temp</button>
            <button className="btn small ghost" title="Long rest" onClick={() => set({ hpCurrent: maxHp, tempHp: 0, conditions: (c.conditions || []).filter((x) => x === 'Inspired') })}>Rest</button>
          </div>
        </div>
        <div className="hpbar mt" style={{ marginTop: 6 }}><div style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="chips mt">
        {CONDITIONS.map((k) => {
          const on = (c.conditions || []).includes(k);
          return <button key={k} className={`tag chip ${on ? 'on' : ''}`} style={{ fontSize: '.7rem' }} onClick={() => set({ conditions: on ? c.conditions.filter((x) => x !== k) : [...(c.conditions || []), k] })}>{k}</button>;
        })}
      </div>

      <div className="tabs mt" style={{ marginBottom: 8 }}>
        {[['items', `Items (${(c.equipment || []).length})`], ['stats', 'Stats'], ['coins', 'Coins'], ['notes', 'Notes']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'items' && <ItemList items={c.equipment || []} onChange={(v) => set({ equipment: v })} />}
      {tab === 'stats' && (
        <div>
          <div className="grid g6" style={{ gap: 6 }}>
            {ABILITIES.map((a) => (
              <div className="abil-box" key={a}><div className="k">{a}</div><div className="v">{d.scores[a]}</div><div className="m">{fmt(d.mods[a])}</div></div>
            ))}
          </div>
          {c.quick && (
            <div className="grid g4 mt" style={{ gap: 6 }}>
              {ABILITIES.map((a) => (
                <label key={a} className="field">{a} base<input type="number" value={c.base?.[a] ?? 10} onChange={(e) => set({ base: { ...c.base, [a]: Number(e.target.value) }, method: 'manual' })} /></label>
              ))}
              <label className="field">Level<input type="number" min="1" max="20" value={c.level} onChange={(e) => set({ level: Number(e.target.value) || 1 })} /></label>
              <label className="field">AC override<input type="number" value={c.acOverride || ''} onChange={(e) => set({ acOverride: Number(e.target.value) || null })} /></label>
              <label className="field">Max HP override<input type="number" value={c.hpOverride || ''} onChange={(e) => set({ hpOverride: Number(e.target.value) || null })} /></label>
            </div>
          )}
          <p className="mt"><small>Skills: {d.skills.filter((s) => s.prof).map((s) => `${s.name} ${fmt(s.bonus)}`).join(', ') || '—'}</small></p>
          {d.caster && <p><small>Spell DC {d.caster.dc} · attack {fmt(d.caster.attack)}</small></p>}
        </div>
      )}
      {tab === 'coins' && (
        <div className="grid g6" style={{ gap: 6 }}>
          {['cp', 'sp', 'ep', 'gp', 'pp'].map((k) => (
            <label key={k} className="field">{k.toUpperCase()}<input type="number" value={c.currency?.[k] || 0} onChange={(e) => set({ currency: { ...(c.currency || {}), [k]: Number(e.target.value) } })} /></label>
          ))}
        </div>
      )}
      {tab === 'notes' && <textarea value={c.notes || ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Quest notes, secrets, curses the player doesn't know about…" />}
    </div>
  );
}


