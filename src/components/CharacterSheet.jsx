import { compute } from '../lib/character.js';
import { ABILITIES, ABILITY_NAMES } from '../data/classes.js';
import { fmt } from '../lib/dnd.js';

const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

export default function CharacterSheet({ c }) {
  const d = compute(c);
  const speed = Object.entries(d.speed).map(([k, v]) => (k === 'walk' ? `${v} ft` : `${k} ${v} ft`)).join(', ');
  const feats = d.feats;
  return (
    <div className="sheet">
      <div className="head">
        {c.portrait ? <img className="portrait" src={c.portrait} alt="" /> : <div className="portrait" />}
        <div>
          <div className="name">{c.name || 'Unnamed hero'}</div>
          <div className="meta">
            <div><span>Class &amp; level</span>{d.cls.name} {d.level}{c.subclass ? ` (${c.subclass})` : ''}</div>
            <div><span>Race</span>{d.raceName}{c.revenant ? ' (Revenant)' : ''}</div>
            <div><span>Background</span>{c.background}</div>
            <div><span>Alignment</span>{c.alignment}</div>
            <div><span>Player</span>{c.player || '—'}</div>
            <div><span>Size / type</span>{d.size} {d.race.type}</div>
            <div><span>Proficiency</span>{fmt(d.pb)}</div>
            <div><span>Hit dice</span>{d.hitDice}</div>
          </div>
        </div>
      </div>

      <div className="cols">
        <div>
          {ABILITIES.map((a) => (
            <div className="abil" key={a}>
              <div className="k">{ABILITY_NAMES[a].toUpperCase()}</div>
              <div className="m">{fmt(d.mods[a])}</div>
              <div className="s">{d.scores[a]}</div>
            </div>
          ))}
          <div className="box">
            <div className="line"><b>{d.passive}</b>&nbsp;Passive Perception</div>
            {d.darkvision > 0 && <div className="line">Darkvision {d.darkvision} ft</div>}
          </div>
        </div>

        <div>
          <div className="stats">
            <div className="stat"><b>{d.ac}</b><span>Armor class</span></div>
            <div className="stat"><b>{fmt(d.initiative)}</b><span>Initiative</span></div>
            <div className="stat"><b>{d.speed.walk}</b><span>Speed</span></div>
            <div className="stat"><b>{d.hp}</b><span>HP max</span></div>
            <div className="stat"><b>{c.hpCurrent ?? d.hp}</b><span>Current HP</span></div>
            <div className="stat"><b>{c.tempHp || 0}</b><span>Temp HP</span></div>
          </div>
          <div className="box"><small>AC: {d.acNote} · Speed: {speed}</small></div>
          <div className="box">
            <h3>Saving throws</h3>
            {d.saves.map((s) => (
              <div className="line" key={s.ability}><i className={`dot ${s.prof ? 'on' : ''}`} /><span className="n">{fmt(s.bonus)}</span> {ABILITY_NAMES[s.ability]}</div>
            ))}
          </div>
          <div className="box">
            <h3>Skills</h3>
            {d.skills.map((s) => (
              <div className="line" key={s.name}>
                <i className={`dot ${s.exp ? 'exp on' : s.prof ? 'on' : ''}`} /><span className="n">{fmt(s.bonus)}</span> {s.name} <small style={{ color: '#8a7455' }}>({s.ability})</small>
              </div>
            ))}
          </div>
          <div className="box">
            <h3>Proficiencies &amp; languages</h3>
            <div className="feat"><b>Armor:</b> {d.armorProf.join(', ') || 'none'}</div>
            <div className="feat"><b>Weapons:</b> {d.weapons.join(', ')}</div>
            {d.tools.length > 0 && <div className="feat"><b>Tools:</b> {d.tools.join(', ')}</div>}
            <div className="feat"><b>Languages:</b> {d.languages.join(', ')}</div>
            {d.resistances.length > 0 && <div className="feat"><b>Resistances:</b> {d.resistances.join(', ')}</div>}
          </div>
        </div>

        <div>
          {d.caster && (
            <div className="box">
              <h3>Spellcasting ({d.caster.ability})</h3>
              <div className="feat">Save DC <b>{d.caster.dc}</b> · Attack <b>{fmt(d.caster.attack)}</b>
                {d.caster.cantrips ? ` · Cantrips ${d.caster.cantrips}` : ''}
                {d.caster.known ? ` · Spells known ${d.caster.known}` : ''}
                {d.caster.prepared ? ` · Prepared ${d.caster.prepared}` : ''}</div>
              <div className="slots">
                {d.caster.slots?.pact
                  ? <div>{d.caster.slots.count} × {ORD[d.caster.slots.level - 1]}-level pact slots</div>
                  : (d.caster.slots?.slots || []).map((n, i) => <div key={i}>{ORD[i]}: {'◯'.repeat(n)}</div>)}
              </div>
            </div>
          )}
          {d.resources.length > 0 && (
            <div className="box">
              <h3>Class resources</h3>
              {d.resources.map(([k, v]) => <div className="feat" key={k}><b>{k}:</b> {v}</div>)}
            </div>
          )}
          <div className="box">
            <h3>Class features</h3>
            {d.classFeatures.map((f, i) => <div className="feat" key={i}><b>{f.name}</b> <small>(lv {f.level})</small> — {f.text}</div>)}
          </div>
          <div className="box">
            <h3>Racial traits</h3>
            {d.raceTraits.map((t, i) => <div className="feat" key={i}><b>{t.name}.</b> {t.text}</div>)}
          </div>
          {feats.length > 0 && (
            <div className="box">
              <h3>Feats</h3>
              {feats.map((f) => <div className="feat" key={f}><b>{f}</b></div>)}
            </div>
          )}
          <div className="box">
            <h3>Equipment</h3>
            <div className="feat">{c.armor !== 'None' ? `${c.armor} armor` : 'No armor'}{c.shield ? ', shield' : ''}</div>
            {(c.equipment || []).map((it) => (
              <div className="feat" key={it.id}>{it.qty > 1 ? `${it.qty}× ` : ''}{it.name}{it.attuned ? ' ✦' : ''}{it.notes ? <small> — {it.notes}</small> : null}</div>
            ))}
            <div className="feat"><b>Coins:</b> {['pp', 'gp', 'ep', 'sp', 'cp'].map((k) => `${c.currency?.[k] || 0} ${k}`).join(' · ')}</div>
          </div>
          {(c.traits?.personality || c.traits?.ideals || c.traits?.bonds || c.traits?.flaws || c.backstory) && (
            <div className="box">
              <h3>Personality</h3>
              {['personality', 'ideals', 'bonds', 'flaws'].map((k) => c.traits?.[k] && <div className="feat" key={k}><b>{k[0].toUpperCase() + k.slice(1)}:</b> {c.traits[k]}</div>)}
              {c.backstory && <div className="feat"><b>Backstory:</b> {c.backstory}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
