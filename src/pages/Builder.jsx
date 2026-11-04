import { useMemo, useState } from 'react';
import { useCharacters, useLocal, go } from '../lib/store.js';
import {
  PLAYABLE_RACES, REVENANT, CLASSES, BACKGROUNDS, ARMORS, FEATS,
  newCharacter, compute, raceAsiRules, getRace, getSub, getClass, getBackground, pendingChoices,
} from '../lib/character.js';
import { ABILITIES, ABILITY_NAMES, SKILLS, ALIGNMENTS } from '../data/classes.js';
import { LANGUAGE_NAMES } from '../lib/languages.js';
import { fmt, POINT_COST, STANDARD_ARRAY, roll4d6, rand, download, readFile, readDataUrl, uid } from '../lib/dnd.js';
import { Field, ChipPicker, Count, Traits } from '../components/ui.jsx';
import ItemList from '../components/ItemList.jsx';
import CharacterSheet from '../components/CharacterSheet.jsx';

const STEPS = ['Basics', 'Race', 'Class', 'Abilities', 'Skills & Languages', 'Feats', 'Equipment & Story', 'Sheet'];

export default function Builder({ query }) {
  const { characters, save } = useCharacters();
  const [draft, setDraft] = useLocal('draft', newCharacter());
  const [step, setStep] = useLocal('builderStep', 0);
  const [msg, setMsg] = useState('');

  // Editing a saved party member (#/builder?id=…) or the local draft
  const editing = query?.id ? characters.find((x) => x.id === query.id) : null;
  const c = editing || draft;
  const set = (patch) => {
    const next = { ...c, ...(typeof patch === 'function' ? patch(c) : patch) };
    if (editing) save(next); else setDraft(next);
  };
  const d = compute(c);
  const pending = pendingChoices(c);

  const saveToParty = () => {
    save({ ...c, hpCurrent: c.hpCurrent ?? d.hp });
    setMsg(`${c.name || 'Character'} saved to the party.`);
    if (!editing) go(`builder?id=${c.id}`);
  };
  const startNew = () => {
    if (!editing && !window.confirm('Discard the current draft and start a new character?')) return;
    setDraft(newCharacter());
    setStep(0);
    go('builder');
  };
  const importJson = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const obj = JSON.parse(await readFile(f));
      setDraft({ ...newCharacter(), ...obj, id: uid() });
      go('builder');
      setMsg('Character imported as a new draft.');
    } catch { setMsg('That file is not a valid DRECINE character (JSON).'); }
    e.target.value = '';
  };

  const stepBadges = {
    1: (c.raceSkills || []).length < ((d.race.skills?.choose?.n || 0) + (d.sub?.skills?.choose?.n || 0)) ? 1 : 0,
    4: pending.filter((p) => p !== 'name').length,
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Character Builder</h1>
          <p>{editing ? <>Editing <b>{c.name || 'unnamed'}</b> — changes are saved to the party automatically.</> : 'Build step by step; the draft is kept in your browser until you save it to the party.'}</p>
        </div>
        <div className="row no-print">
          <button className="btn" onClick={startNew}>New</button>
          <label className="btn">Import JSON<input type="file" accept=".json,application/json" hidden onChange={importJson} /></label>
          <button className="btn" onClick={() => download(`${c.name || 'character'}.json`, JSON.stringify(c, null, 2), 'application/json')}>Export JSON</button>
          {!editing && <button className="btn primary" onClick={saveToParty}>Save to party</button>}
        </div>
      </div>
      {msg && <div className="notice ok no-print" style={{ marginBottom: 12 }}>{msg}</div>}

      <div className="tabs">
        {STEPS.map((s, i) => (
          <button key={s} className={step === i ? 'on' : ''} onClick={() => setStep(i)}>
            {i + 1}. {s}{stepBadges[i] ? <span className="badge">{stepBadges[i]}</span> : null}
          </button>
        ))}
      </div>

      {step === 7 ? (
        <div>
          <div className="row no-print" style={{ marginBottom: 12 }}>
            <button className="btn primary" onClick={() => window.print()}>Print / save as PDF</button>
            {pending.length > 0 && <span className="notice warn">Still to choose: {pending.join(', ')}</span>}
          </div>
          <CharacterSheet c={c} />
        </div>
      ) : (
        <div className="builder">
          <div>
            {step === 0 && <Basics c={c} set={set} />}
            {step === 1 && <RaceStep c={c} set={set} />}
            {step === 2 && <ClassStep c={c} set={set} d={d} />}
            {step === 3 && <AbilityStep c={c} set={set} d={d} />}
            {step === 4 && <SkillStep c={c} set={set} d={d} />}
            {step === 5 && <FeatStep c={c} set={set} d={d} />}
            {step === 6 && <EquipStep c={c} set={set} d={d} />}
            <div className="row spread mt no-print">
              <button className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
              <button className="btn primary" onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} →</button>
            </div>
          </div>
          <Summary c={c} d={d} pending={pending} />
        </div>
      )}
    </div>
  );
}

function Summary({ c, d, pending }) {
  return (
    <aside className="panel summary">
      <div className="big">{c.name || 'Unnamed hero'}</div>
      <small>{d.raceName} · {d.cls.name} {d.level}{c.subclass ? ` · ${c.subclass}` : ''}</small>
      <div className="grid g3 mt" style={{ gap: 6 }}>
        {ABILITIES.map((a) => (
          <div className="abil-box" key={a}><div className="k">{a}</div><div className="v">{d.scores[a]}</div><div className="m">{fmt(d.mods[a])}</div></div>
        ))}
      </div>
      <div className="grid g3 mt" style={{ gap: 6 }}>
        <div className="abil-box"><div className="k">HP</div><div className="v">{d.hp}</div></div>
        <div className="abil-box"><div className="k">AC</div><div className="v">{d.ac}</div></div>
        <div className="abil-box"><div className="k">SPEED</div><div className="v">{d.speed.walk}</div></div>
        <div className="abil-box"><div className="k">INIT</div><div className="v">{fmt(d.initiative)}</div></div>
        <div className="abil-box"><div className="k">PROF</div><div className="v">{fmt(d.pb)}</div></div>
        <div className="abil-box"><div className="k">PASSIVE</div><div className="v">{d.passive}</div></div>
      </div>
      {d.caster && <p className="mt"><small>Spell save DC {d.caster.dc} · attack {fmt(d.caster.attack)}</small></p>}
      {pending.length > 0
        ? <div className="notice warn mt">To choose: {pending.join(', ')}</div>
        : <div className="notice ok mt">All choices made ✓</div>}
    </aside>
  );
}

/* ------------------------------------------------------------------ steps */

function Basics({ c, set }) {
  return (
    <div className="panel stack">
      <h2>Who are you?</h2>
      <div className="grid g2">
        <Field label="Character name"><input value={c.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Lyra Thornwhisper" /></Field>
        <Field label="Player"><input value={c.player} onChange={(e) => set({ player: e.target.value })} /></Field>
        <Field label="Level">
          <input type="number" min="1" max="20" value={c.level} onChange={(e) => set({ level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label="Alignment">
          <select value={c.alignment} onChange={(e) => set({ alignment: e.target.value })}>{ALIGNMENTS.map((a) => <option key={a}>{a}</option>)}</select>
        </Field>
        <Field label="Background">
          <select value={c.background} onChange={(e) => set({ background: e.target.value, bgSkills: [] })}>{BACKGROUNDS.map((b) => <option key={b.name}>{b.name}</option>)}</select>
        </Field>
        <Field label="Portrait (optional)">
          <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) set({ portrait: await readDataUrl(f) }); }} />
        </Field>
      </div>
      {c.portrait && (
        <div className="row"><img src={c.portrait} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10 }} /><button className="btn small" onClick={() => set({ portrait: '' })}>Remove portrait</button></div>
      )}
      <BackgroundInfo c={c} />
    </div>
  );
}

function BackgroundInfo({ c }) {
  const bg = getBackground(c);
  return (
    <div className="notice">
      <b>{bg.name}</b> — skills: {bg.skills.length ? bg.skills.join(', ') : 'two of your choice'}
      {bg.tools ? ` · tools: ${bg.tools.join(', ')}` : ''}{bg.languages ? ` · ${bg.languages} extra language(s)` : ''} · feature: <i>{bg.feature}</i>
    </div>
  );
}

function RaceStep({ c, set }) {
  const [q, setQ] = useState('');
  const race = getRace(c);
  const sub = getSub(c);
  const list = PLAYABLE_RACES.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const pick = (id) => set({ raceId: id, subrace: 0, raceAsi: {}, asiSlots: [], raceSkills: [], languages: [], bonusFeats: [] });
  const speed = { ...race.speed, ...(sub?.speed || {}) };
  const skillChoose = race.skills?.choose || sub?.skills?.choose;
  return (
    <div className="stack">
      <div className="panel">
        <div className="row spread"><h2 style={{ margin: 0 }}>Choose a race</h2><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search races…" style={{ maxWidth: 240 }} /></div>
        <div className="race-list mt">
          {list.map((r) => (
            <button key={r.id} className={`race-item ${r.id === race.id ? 'on' : ''}`} onClick={() => pick(r.id)}>
              {r.name}
              <small className="muted">{asiText(r.asi) || 'see sub-race'}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>{race.name}</h2>
        <p className="muted" style={{ fontFamily: 'Libre Baskerville, serif', fontStyle: 'italic' }}>{race.description}</p>
        <div className="chips">
          <span className="tag gold">{race.size}</span>
          <span className="tag">{race.type}</span>
          <span className="tag">Speed {Object.entries(speed).map(([k, v]) => (k === 'walk' ? `${v} ft` : `${k} ${v}`)).join(', ')}</span>
          {Math.max(race.darkvision || 0, sub?.darkvision || 0) > 0 && <span className="tag">Darkvision {Math.max(race.darkvision || 0, sub?.darkvision || 0)} ft</span>}
          {[...(race.resistances || []), ...(sub?.resistances || [])].map((r) => <span key={r} className="tag green">Resist {r}</span>)}
          {race.age && <span className="tag" title={race.age}>Age ⓘ</span>}
        </div>
        {race.subraces?.length > 0 && (
          <div className="mt">
            <h3>Sub-race</h3>
            <div className="chips">
              {race.subraces.map((s, i) => (
                <button key={s.name} className={`tag chip ${i === (c.subrace || 0) ? 'on' : ''}`} onClick={() => set({ subrace: i, raceAsi: {}, asiSlots: [], bonusFeats: [] })}>{s.name}</button>
              ))}
            </div>
          </div>
        )}
        {race.size === 'Medium or Small' && (
          <div className="mt row"><b>Size:</b>
            {['Medium', 'Small'].map((s) => <button key={s} className={`tag chip ${(c.size || 'Medium') === s ? 'on' : ''}`} onClick={() => set({ size: s })}>{s}</button>)}
          </div>
        )}
        <RaceAsi c={c} set={set} />
        {skillChoose && (
          <div className="mt">
            <h3>Racial skills <Count have={(c.raceSkills || []).length} need={skillChoose.n} /></h3>
            <ChipPicker options={skillChoose.from} value={c.raceSkills || []} max={skillChoose.n} onChange={(v) => set({ raceSkills: v })} />
          </div>
        )}
        <div className="grid g2 mt">
          <div><h3>Traits</h3><Traits traits={race.traits} /></div>
          {sub && <div><h3>{sub.name}</h3><Traits traits={sub.traits} /></div>}
        </div>
        <label className="row mt"><input type="checkbox" checked={!!c.revenant} onChange={(e) => set({ revenant: e.target.checked })} /> Apply the <b>Revenant</b> template (+1 CON, Relentless Nature)</label>
        {c.revenant && <div className="notice mt"><Traits traits={REVENANT.traits} /></div>}
      </div>
    </div>
  );
}

function asiText(asi) {
  if (!asi) return '';
  if (asi.flexible) return '+2/+1 any';
  const parts = Object.entries(asi.fixed || {}).map(([k, v]) => `${k} +${v}`);
  (asi.choose || []).forEach((ch) => parts.push(`${ch.count}× +${ch.amount} any`));
  return parts.join(', ');
}

function RaceAsi({ c, set }) {
  const { fixed, choices, flexible } = raceAsiRules(c);
  const mode = c.asiMode || '21';
  const amounts = flexible ? (mode === '21' ? [2, 1] : [1, 1, 1]) : choices.flatMap((ch) => Array(ch.count).fill(ch.amount));
  const slots = c.asiSlots || [];
  const update = (i, a, m = mode) => {
    const next = [...slots];
    next[i] = a;
    const am = flexible ? (m === '21' ? [2, 1] : [1, 1, 1]) : amounts;
    const map = {};
    next.slice(0, am.length).forEach((ab, j) => { if (ab) map[ab] = (map[ab] || 0) + am[j]; });
    set({ asiSlots: next.slice(0, am.length), raceAsi: map, asiMode: m });
  };
  return (
    <div className="mt">
      <h3>Ability score increases</h3>
      <div className="chips">
        {Object.entries(fixed).map(([k, v]) => <span key={k} className="tag gold">{ABILITY_NAMES[k]} +{v}</span>)}
        {c.revenant && <span className="tag gold">Constitution +1 (revenant)</span>}
        {!Object.keys(fixed).length && !amounts.length && <span className="muted">Choose a sub-race to see its increases.</span>}
      </div>
      {flexible && (
        <div className="row mt">
          <span>Distribution:</span>
          <button className={`tag chip ${mode === '21' ? 'on' : ''}`} onClick={() => set({ asiMode: '21', asiSlots: [], raceAsi: {} })}>+2 and +1</button>
          <button className={`tag chip ${mode === '111' ? 'on' : ''}`} onClick={() => set({ asiMode: '111', asiSlots: [], raceAsi: {} })}>+1 / +1 / +1</button>
        </div>
      )}
      {amounts.length > 0 && (
        <div className="row mt">
          {amounts.map((am, i) => (
            <Field key={`${mode}-${i}`} label={`+${am} to`} style={{ width: 160 }}>
              <select value={slots[i] || ''} onChange={(e) => update(i, e.target.value)}>
                <option value="">— choose —</option>
                {ABILITIES.filter((a) => (!flexible ? !fixed[a] : true) && (slots[i] === a || !slots.slice(0, amounts.length).includes(a))).map((a) => <option key={a} value={a}>{ABILITY_NAMES[a]}</option>)}
              </select>
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}

function ClassStep({ c, set, d }) {
  const cls = getClass(c);
  return (
    <div className="stack">
      <div className="panel">
        <h2>Choose a class</h2>
        <div className="race-list" style={{ maxHeight: 'none' }}>
          {CLASSES.map((k) => (
            <button key={k.id} className={`race-item ${k.id === cls.id ? 'on' : ''}`} onClick={() => set({ classId: k.id, subclass: '', classSkills: [], expertise: [], improvements: [] })}>
              {k.name}<small className="muted">d{k.hitDie} · {k.primary.join('/')}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="row spread">
          <h2 style={{ margin: 0 }}>{cls.name}</h2>
          <Field label="Level" style={{ width: 90 }}><input type="number" min="1" max="20" value={c.level} onChange={(e) => set({ level: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} /></Field>
        </div>
        <div className="grid g2 mt">
          <div className="stack">
            <div><b>Hit die:</b> d{cls.hitDie} · <b>Saves:</b> {cls.saves.map((s) => ABILITY_NAMES[s]).join(', ')}</div>
            <div><b>Armor:</b> {cls.armor.join(', ') || 'none'}</div>
            <div><b>Weapons:</b> {cls.weapons.join(', ')}</div>
            {cls.tools.length > 0 && <div><b>Tools:</b> {cls.tools.join(', ')}</div>}
            <div><b>Skills:</b> choose {cls.skills.n} from {cls.skills.from.length === SKILLS.length ? 'any skill' : cls.skills.from.join(', ')}</div>
          </div>
          <div className="stack">
            <Field label={`${cls.subclassTitle} (level ${cls.subclassLevel})`}>
              <select value={c.subclass} disabled={d.level < cls.subclassLevel} onChange={(e) => set({ subclass: e.target.value })}>
                <option value="">{d.level < cls.subclassLevel ? `Available at level ${cls.subclassLevel}` : '— choose —'}</option>
                {cls.subclasses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Hit points per level">
              <select value={c.hpMethod} onChange={(e) => set({ hpMethod: e.target.value })}>
                <option value="average">Fixed average ({cls.hitDie / 2 + 1})</option>
                <option value="max">Maximum ({cls.hitDie})</option>
                <option value="rolled">Rolled</option>
              </select>
            </Field>
            {c.hpMethod === 'rolled' && d.level > 1 && (
              <div className="row">
                <button className="btn small" onClick={() => set({ hpRolls: Array.from({ length: d.level - 1 }, () => rand(cls.hitDie)) })}>Roll {d.level - 1}d{cls.hitDie}</button>
                <small>{(c.hpRolls || []).slice(0, d.level - 1).join(', ') || 'not rolled yet (average used)'}</small>
              </div>
            )}
          </div>
        </div>
        {d.caster && (
          <div className="notice mt">
            Spellcasting ability <b>{ABILITY_NAMES[d.caster.ability]}</b> · save DC {d.caster.dc} · attack {fmt(d.caster.attack)}
            {d.caster.cantrips ? ` · ${d.caster.cantrips} cantrips` : ''}{d.caster.known ? ` · ${d.caster.known} spells known` : ''}{d.caster.prepared ? ` · ${d.caster.prepared} prepared` : ''}
          </div>
        )}
        <h3 className="mt">Features by level</h3>
        <div className="scroll" style={{ maxHeight: 380 }}>
          <table>
            <thead><tr><th>Lv</th><th>Feature</th><th>Description</th></tr></thead>
            <tbody>
              {cls.features.map(([l, n, t], i) => (
                <tr key={i} style={{ opacity: l <= d.level ? 1 : 0.45 }}><td>{l}</td><td><b>{n}</b></td><td>{t}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {d.resources.length > 0 && <div className="chips mt">{d.resources.map(([k, v]) => <span key={k} className="tag gold">{k}: {v}</span>)}</div>}
      </div>
    </div>
  );
}

function AbilityStep({ c, set, d }) {
  const method = c.method || 'standard';
  const base = c.base || {};
  const setBase = (a, v) => set({ base: { ...base, [a]: v } });
  const spent = ABILITIES.reduce((s, a) => s + (POINT_COST[base[a]] ?? 99), 0);
  const pool = method === 'standard' ? STANDARD_ARRAY : c.rolled || [];

  const assignFromPool = (a, idxStr) => {
    // store as indexes so duplicate values in a roll work
    const assign = { ...(c.assign || {}), [a]: idxStr === '' ? undefined : Number(idxStr) };
    const nb = { ...base };
    ABILITIES.forEach((ab) => { nb[ab] = assign[ab] != null ? pool[assign[ab]] : 8; });
    set({ assign, base: nb });
  };
  const switchMethod = (m) => {
    if (m === 'pointbuy') set({ method: m, base: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 }, assign: {} });
    else if (m === 'standard') set({ method: m, assign: {}, base: { STR: 8, DEX: 8, CON: 8, INT: 8, WIS: 8, CHA: 8 } });
    else if (m === 'roll') set({ method: m, assign: {}, rolled: [] });
    else set({ method: m });
  };
  const usedIdx = Object.values(c.assign || {}).filter((v) => v != null);

  return (
    <div className="stack">
      <div className="panel">
        <h2>Ability scores</h2>
        <div className="tabs" style={{ marginBottom: 10 }}>
          {[['standard', 'Standard array'], ['pointbuy', 'Point buy'], ['roll', 'Roll 4d6'], ['manual', 'Manual']].map(([k, l]) => (
            <button key={k} className={method === k ? 'on' : ''} onClick={() => switchMethod(k)}>{l}</button>
          ))}
        </div>
        {method === 'pointbuy' && <div className={`notice ${spent > 27 ? 'err' : spent === 27 ? 'ok' : ''}`}>Points spent: <b>{spent}</b> / 27 (scores 8–15 before racial bonuses)</div>}
        {method === 'roll' && (
          <div className="row">
            <button className="btn primary" onClick={() => set({ rolled: Array.from({ length: 6 }, roll4d6), assign: {} })}>Roll 6 × 4d6 (drop lowest)</button>
            {pool.length > 0 && <span>Rolled: {pool.map((v, i) => <span key={i} className="tag gold" style={{ marginRight: 4 }}>{v}</span>)}</span>}
          </div>
        )}
        <div className="scroll mt" style={{ maxHeight: 'none' }}>
          <table>
            <thead><tr><th>Ability</th><th>Base</th><th>Race</th><th>ASI</th><th>Total</th><th>Mod</th></tr></thead>
            <tbody>
              {ABILITIES.map((a) => (
                <tr key={a}>
                  <td><b>{ABILITY_NAMES[a]}</b>{getClass(c).primary.includes(a) && <span className="tag gold" style={{ marginLeft: 6 }}>primary</span>}</td>
                  <td style={{ width: 150 }}>
                    {method === 'manual' && <input type="number" min="1" max="30" value={base[a] ?? 10} onChange={(e) => setBase(a, Number(e.target.value))} />}
                    {method === 'pointbuy' && (
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <button className="btn small" disabled={base[a] <= 8} onClick={() => setBase(a, base[a] - 1)}>−</button>
                        <b style={{ width: 24, textAlign: 'center' }}>{base[a]}</b>
                        <button className="btn small" disabled={base[a] >= 15 || spent - POINT_COST[base[a]] + POINT_COST[base[a] + 1] > 27} onClick={() => setBase(a, base[a] + 1)}>+</button>
                      </div>
                    )}
                    {(method === 'standard' || method === 'roll') && (
                      <select value={c.assign?.[a] ?? ''} onChange={(e) => assignFromPool(a, e.target.value)} disabled={!pool.length}>
                        <option value="">—</option>
                        {pool.map((v, i) => (!usedIdx.includes(i) || c.assign?.[a] === i) && <option key={i} value={i}>{v}</option>)}
                      </select>
                    )}
                  </td>
                  <td>{d.raceBonus[a] ? `+${d.raceBonus[a]}` : ''}</td>
                  <td>{d.asiBonus[a] ? `+${d.asiBonus[a]}` : ''}</td>
                  <td><b>{d.scores[a]}</b></td>
                  <td style={{ color: 'var(--gold2)' }}>{fmt(d.mods[a])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Improvements c={c} set={set} d={d} />
    </div>
  );
}

function Improvements({ c, set, d }) {
  if (!d.asiLevels.length) return <div className="panel"><h2>Ability Score Improvements</h2><p className="muted">Your first ASI (or feat) arrives at level 4.</p></div>;
  const imps = c.improvements || [];
  const upd = (i, v) => { const n = [...imps]; n[i] = v; set({ improvements: n }); };
  return (
    <div className="panel">
      <h2>Ability Score Improvements</h2>
      {d.asiLevels.map((lvl, i) => {
        const imp = imps[i] || { kind: 'asi', a: {} };
        const a = imp.a || {};
        const total = Object.values(a).reduce((s, v) => s + Number(v || 0), 0);
        return (
          <div key={lvl} className="row" style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
            <span className="tag gold">Level {lvl}</span>
            <select value={imp.kind} onChange={(e) => upd(i, { kind: e.target.value, a: {}, feat: '' })} style={{ width: 150 }}>
              <option value="asi">+2 ability points</option>
              <option value="feat">Feat</option>
            </select>
            {imp.kind === 'asi' ? (
              <>
                {ABILITIES.map((ab) => (
                  <label key={ab} className="field" style={{ width: 60 }}>{ab}
                    <select value={a[ab] || 0} onChange={(e) => upd(i, { ...imp, a: { ...a, [ab]: Number(e.target.value) } })}>
                      {[0, 1, 2].map((v) => <option key={v} value={v} disabled={v > 0 && total - (a[ab] || 0) + v > 2}>{v ? `+${v}` : '0'}</option>)}
                    </select>
                  </label>
                ))}
                <Count have={total} need={2} />
              </>
            ) : (
              <FeatSelect value={imp.feat} onChange={(f) => upd(i, { ...imp, feat: f })} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeatSelect({ value, onChange }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1, minWidth: 200 }}>
      <option value="">— choose a feat —</option>
      {FEATS.map((f) => <option key={f.name} value={f.name}>{f.name}{f.prerequisite ? ` (req: ${f.prerequisite})` : ''}</option>)}
    </select>
  );
}

function SkillStep({ c, set, d }) {
  const cls = d.cls;
  const bg = d.bg;
  const raceFixed = [...(d.race.skills?.fixed || []), ...(d.sub?.skills?.fixed || [])];
  const fromOthers = [...raceFixed, ...(c.raceSkills || []), ...bg.skills, ...(c.bgSkills || [])];
  const expertiseN = cls.id === 'rogue' ? (d.level >= 6 ? 4 : 2) : cls.id === 'bard' && d.level >= 3 ? (d.level >= 10 ? 4 : 2) : 0;
  const proficient = d.skills.filter((s) => s.prof).map((s) => s.name);
  const langN = (d.race.languages?.choose || 0) + (d.sub?.languages?.choose || 0) + (bg.languages || 0);
  const langs = c.languages || [];
  const langOptions = d.race.languages?.from || LANGUAGE_NAMES;
  return (
    <div className="stack">
      <div className="panel">
        <h2>Skills</h2>
        <h3>{cls.name} skills <Count have={(c.classSkills || []).filter((s) => !fromOthers.includes(s)).length} need={cls.skills.n} /></h3>
        <ChipPicker options={cls.skills.from} value={(c.classSkills || []).filter((s) => !fromOthers.includes(s))} max={cls.skills.n} locked={fromOthers} onChange={(v) => set({ classSkills: v })} />
        {bg.skills.length === 0 && (
          <>
            <h3 className="mt">Background skills (custom) <Count have={(c.bgSkills || []).length} need={2} /></h3>
            <ChipPicker options={SKILLS} value={c.bgSkills || []} max={2} onChange={(v) => set({ bgSkills: v })} />
          </>
        )}
        {expertiseN > 0 && (
          <>
            <h3 className="mt">Expertise <Count have={(c.expertise || []).length} need={expertiseN} /></h3>
            <ChipPicker options={proficient} value={(c.expertise || []).filter((x) => proficient.includes(x))} max={expertiseN} onChange={(v) => set({ expertise: v })} />
          </>
        )}
        <div className="notice mt">
          Granted automatically — race: {raceFixed.join(', ') || 'none'}{(c.raceSkills || []).length ? ` + ${c.raceSkills.join(', ')}` : ''} · background ({bg.name}): {bg.skills.join(', ') || 'custom'}
        </div>
        <div className="grid g3 mt" style={{ gap: 4 }}>
          {d.skills.map((s) => (
            <div key={s.name} className="row" style={{ gap: 6 }}>
              <span className={`tag ${s.exp ? 'gold' : s.prof ? 'green' : ''}`} style={{ width: 38, textAlign: 'center' }}>{fmt(s.bonus)}</span>{s.name} <small>({s.ability})</small>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Languages</h2>
        <p>Known: <b>{(d.race.languages?.fixed || []).join(', ')}</b></p>
        {langN > 0 ? (
          <div className="row">
            {Array.from({ length: langN }).map((_, i) => (
              <select key={i} value={langs[i] || ''} style={{ width: 200 }} onChange={(e) => { const n = [...langs]; n[i] = e.target.value; set({ languages: n.slice(0, langN) }); }}>
                <option value="">— language —</option>
                {langOptions.filter((l) => !(d.race.languages?.fixed || []).includes(l) && (langs[i] === l || !langs.includes(l))).map((l) => <option key={l}>{l}</option>)}
              </select>
            ))}
          </div>
        ) : <p className="muted">No extra languages to choose.</p>}
      </div>
    </div>
  );
}

function FeatStep({ c, set, d }) {
  const [q, setQ] = useState('');
  const bonusN = d.sub?.feat || d.race.feat || 0;
  const bonus = c.bonusFeats || [];
  const list = useMemo(() => FEATS.filter((f) => (f.name + f.text).toLowerCase().includes(q.toLowerCase())), [q]);
  const chosen = d.feats.map((n) => FEATS.find((f) => f.name === n)).filter(Boolean);
  return (
    <div className="stack">
      <div className="panel">
        <h2>Feats</h2>
        {bonusN > 0 && (
          <div className="row" style={{ marginBottom: 10 }}>
            <span className="tag gold">{d.raceName} bonus feat</span>
            <FeatSelect value={bonus[0]} onChange={(f) => set({ bonusFeats: [f] })} />
          </div>
        )}
        <p className="muted">Feats taken instead of an Ability Score Improvement are chosen in the <b>Abilities</b> step. {!bonusN && !d.asiLevels.length && 'This character has no feat yet.'}</p>
        {chosen.map((f) => <div className="trait" key={f.name}><b>{f.name}</b> <small>{f.source}{f.prerequisite ? ` · requires ${f.prerequisite}` : ''}</small><br />{f.text}</div>)}
      </div>
      <div className="panel">
        <div className="row spread"><h2 style={{ margin: 0 }}>Browse feats</h2><input placeholder="Search feats…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} /></div>
        <div className="scroll mt" style={{ maxHeight: 420 }}>
          {list.map((f) => <div className="trait" key={f.name} style={{ padding: '8px 10px' }}><b>{f.name}</b> <small>{f.source}{f.prerequisite ? ` · requires ${f.prerequisite}` : ''}</small><br /><small>{f.text}</small></div>)}
        </div>
      </div>
    </div>
  );
}

function EquipStep({ c, set, d }) {
  const cls = d.cls;
  const addStarting = () => set({ equipment: [...(c.equipment || []), ...cls.equipment.map((n) => ({ id: uid(), name: n, qty: 1, notes: '', cursed: false, attuned: false }))] });
  const cur = c.currency || {};
  return (
    <div className="stack">
      <div className="panel">
        <h2>Armor</h2>
        <div className="row">
          <Field label="Armor worn" style={{ width: 220 }}>
            <select value={c.armor} onChange={(e) => set({ armor: e.target.value })}>{ARMORS.map((a) => <option key={a.name}>{a.name}</option>)}</select>
          </Field>
          <label className="row" style={{ marginTop: 18 }}><input type="checkbox" checked={!!c.shield} onChange={(e) => set({ shield: e.target.checked })} /> Shield (+2)</label>
          <span className="tag gold" style={{ marginTop: 18 }}>AC {d.ac} — {d.acNote}</span>
        </div>
      </div>
      <div className="panel">
        <div className="row spread"><h2 style={{ margin: 0 }}>Equipment</h2><button className="btn small" onClick={addStarting}>+ {cls.name} starting equipment</button></div>
        <div className="mt"><ItemList items={c.equipment || []} onChange={(v) => set({ equipment: v })} /></div>
        <div className="grid g6 mt" style={{ gap: 8 }}>
          {['cp', 'sp', 'ep', 'gp', 'pp'].map((k) => (
            <Field key={k} label={k.toUpperCase()}><input type="number" min="0" value={cur[k] || 0} onChange={(e) => set({ currency: { ...cur, [k]: Number(e.target.value) } })} /></Field>
          ))}
        </div>
      </div>
      <div className="panel">
        <h2>Personality &amp; story</h2>
        <div className="grid g2">
          {['personality', 'ideals', 'bonds', 'flaws'].map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
              <textarea style={{ minHeight: 60 }} value={c.traits?.[k] || ''} onChange={(e) => set({ traits: { ...(c.traits || {}), [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
        <Field label="Backstory"><textarea value={c.backstory || ''} onChange={(e) => set({ backstory: e.target.value })} /></Field>
      </div>
    </div>
  );
}


