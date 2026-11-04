import { forwardRef, useMemo, useRef, useState } from 'react';
import yaml from 'js-yaml';
import { toPng } from 'html-to-image';
import { useLocal } from '../lib/store.js';
import { fmt, mod, readDataUrl, readFile, download, uid } from '../lib/dnd.js';
import { Field } from '../components/ui.jsx';

const EXAMPLE = `title: Grizzlethorn the Bog Witch
subtitle: Medium fey (hag), neutral evil
challenge_rating: 3
experience_points: 700
armor_class: 15 (natural armor)
max_hit_points: 66 (12d8 + 12)
speed: 30 ft., swim 30 ft.
strength: 16
dexterity: 12
constitution: 13
intelligence: 14
wisdom: 15
charisma: 16
saving_throws: Wis +4, Cha +5
skills: Arcana +4, Deception +5, Perception +4
damage_resistances: poison
senses: darkvision 60 ft., passive Perception 14
languages: Common, Sylvan, Infernal
traits:
  - name: Amphibious
    description: "Grizzlethorn can breathe air and water."
  - name: Mire Stride
    description: "Difficult terrain made of mud or water doesn't cost her extra movement."
actions:
  - name: Multiattack
    description: "Grizzlethorn makes two Claw attacks."
  - name: Claw
    description: "Melee Weapon Attack."
    attack_bonus: +5
    reach: "5 ft., one target"
    damage: "10 (2d6 + 3) slashing damage plus 3 (1d6) poison damage."
  - name: Swamp Gas (Recharge 5-6)
    description: "A 15-foot cone of green fumes. Each creature in it must make a DC 12 Constitution saving throw, taking 14 (4d6) poison damage and becoming poisoned until the end of its next turn on a failure, or half damage on a success."
special_actions:
  - category: Bog Magic
    actions:
      - name: Croaking Curse (1/day)
        description: "One creature she can see within 60 ft. must succeed on a DC 13 Wisdom save or be polymorphed into a toad for 1 minute (concentration)."
reactions:
  - name: Slip Into the Murk
    description: "When hit by an attack while in water, she can submerge and move up to 10 ft. without provoking opportunity attacks."
loot:
  - name: Jar of Living Leeches
    description: "Applied to a wound, they heal 1d4 hit points but leave the patient pale for a day."
  - name: Witch's Toad Charm
    description: "Once per day, cast Speak with Animals (amphibians only)."
`;

const PROMPT_HEAD = `You are helping me prepare a Dungeons & Dragons 5e session. Create ONE new creature or NPC as YAML, using exactly the same keys and structure as this example (keep the "-" list syntax, quote descriptions, numbers for ability scores). Be specific about dice, DCs, ranges and durations, and choose a challenge rating that matches the creature's power. Reply with the YAML only, inside a single code block.

EXAMPLE:
`;

const LIST_KEYS = ['traits', 'actions', 'bonus_actions', 'reactions', 'legendary_actions'];

function abil(v) {
  const n = Number(String(v ?? 10).match(/-?\d+/)?.[0] ?? 10);
  return `${n} (${fmt(mod(n))})`;
}

export default function Monsters() {
  const [text, setText] = useLocal('monsterYaml', EXAMPLE);
  const [img, setImg] = useLocal('monsterImg', '');
  const [library, setLibrary] = useLocal('monsterLibrary', []);
  const [idea, setIdea] = useState('');
  const [msg, setMsg] = useState('');
  const card = useRef(null);

  const { data, error } = useMemo(() => {
    try {
      const d = yaml.load(text);
      return { data: d && typeof d === 'object' ? d : {}, error: null };
    } catch (e) { return { data: null, error: e.message.split('\n')[0] }; }
  }, [text]);

  const copyPrompt = async () => {
    const prompt = `${PROMPT_HEAD}${EXAMPLE}\nNow create a brand new creature, different from the example: ${idea || 'surprise me with something memorable'}`;
    try { await navigator.clipboard.writeText(prompt); setMsg('Prompt copied! Paste it into ChatGPT, Claude or any AI chat, then paste the YAML answer in the editor.'); } catch { setMsg('Clipboard blocked by the browser — select the prompt below manually.'); }
  };

  const exportPng = async () => {
    if (!card.current) return;
    try {
      const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#fdf1dc' });
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data?.title || 'creature').replace(/[^\w-]+/g, '_')}.png`;
      a.click();
    } catch (e) { setMsg(`PNG export failed: ${e.message}`); }
  };

  const saveToLibrary = () => {
    const title = data?.title || 'Untitled';
    setLibrary([{ id: uid(), title, cr: data?.challenge_rating ?? '', yaml: text, img }, ...library.filter((x) => x.title !== title)].slice(0, 40));
    setMsg(`“${title}” saved to your library.`);
  };

  return (
    <div>
      <div className="page-head">
        <div><h1>NPC &amp; Monster Cards</h1><p>Write or paste YAML on the left and get a stat block on the right. Add your own artwork, export it as PNG or print it. Don't know YAML? Describe the creature and copy an AI prompt.</p></div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="panel stack">
            <h2>1. Ask an AI (optional)</h2>
            <Field label="Describe the creature"><input value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. a cowardly goblin alchemist who throws unstable potions, CR 1" /></Field>
            <button className="btn" onClick={copyPrompt}>📋 Copy AI prompt</button>
          </div>
          <div className="panel stack">
            <div className="row spread"><h2 style={{ margin: 0 }}>2. YAML</h2>
              <div className="row">
                <button className="btn small" onClick={() => setText(EXAMPLE)}>Example</button>
                <label className="btn small">Open file<input type="file" accept=".yaml,.yml,.txt" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await readFile(f)); }} /></label>
                <button className="btn small" onClick={() => download(`${(data?.title || 'creature').replace(/[^\w-]+/g, '_')}.yaml`, text)}>Save .yaml</button>
              </div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} style={{ minHeight: 420, fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
            {error && <div className="notice err">YAML error: {error}</div>}
            <Field label="Artwork (optional)"><input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImg(await readDataUrl(f)); }} /></Field>
            {img && <button className="btn small" onClick={() => setImg('')}>Remove artwork</button>}
          </div>
          {library.length > 0 && (
            <div className="panel">
              <h2>Library</h2>
              {library.map((m) => (
                <div key={m.id} className="row spread trait">
                  <span><b>{m.title}</b> <small>CR {m.cr}</small></span>
                  <span className="row">
                    <button className="btn small" onClick={() => { setText(m.yaml); setImg(m.img || ''); }}>Load</button>
                    <button className="btn small danger" onClick={() => setLibrary(library.filter((x) => x.id !== m.id))}>✕</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="stack" style={{ position: 'sticky', top: 72 }}>
          <div className="row no-print">
            <button className="btn primary" onClick={exportPng} disabled={!data}>Export PNG</button>
            <button className="btn" onClick={() => window.print()}>Print</button>
            <button className="btn" onClick={saveToLibrary} disabled={!data}>Save to library</button>
          </div>
          {msg && <div className="notice ok">{msg}</div>}
          {data ? <StatBlock ref={card} d={data} img={img} /> : <div className="panel muted">Fix the YAML to see the card.</div>}
        </div>
      </div>
    </div>
  );
}


const StatBlock = forwardRef(function StatBlock({ d, img }, ref) {
  const line = (label, v) => (v != null && v !== '' ? <div className="sb-line"><b>{label}</b> {Array.isArray(v) ? v.join(', ') : String(v)}</div> : null);
  const actions = (list) => (list || []).map((a, i) => (
    <div className="sb-act" key={i}>
      <b>{a.name}.</b>{' '}
      {a.description}
      {a.attack_bonus != null && <> <i>{String(a.attack_bonus).startsWith('+') || String(a.attack_bonus).startsWith('-') ? a.attack_bonus : `+${a.attack_bonus}`} to hit</i></>}
      {a.reach && <>, reach {a.reach}</>}
      {a.damage && <>. <i>Hit:</i> {a.damage}</>}
    </div>
  ));
  return (
    <div className="statblock" ref={ref}>
      <div className="sb-name">{d.title || d.name || 'Unnamed creature'}</div>
      <div className="sb-sub">{d.subtitle}</div>
      {img && <img className="sb-img" src={img} alt="" />}
      <hr />
      {line('Armor Class', d.armor_class)}
      {line('Hit Points', d.max_hit_points ?? d.hit_points)}
      {line('Speed', d.speed)}
      <hr />
      <div className="sb-abil">
        {['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((k) => (
          <div key={k}><b>{k.slice(0, 3).toUpperCase()}</b>{abil(d[k])}</div>
        ))}
      </div>
      <hr />
      {line('Saving Throws', d.saving_throws)}
      {line('Skills', d.skills)}
      {line('Damage Vulnerabilities', d.damage_vulnerabilities)}
      {line('Damage Resistances', d.damage_resistances)}
      {line('Damage Immunities', d.damage_immunities)}
      {line('Condition Immunities', d.condition_immunities)}
      {line('Senses', d.senses)}
      {line('Languages', d.languages)}
      {d.challenge_rating != null && <div className="sb-line"><b>Challenge</b> {String(d.challenge_rating)}{d.experience_points ? ` (${d.experience_points} XP)` : ''}</div>}
      <hr />
      {actions(d.traits)}
      {LIST_KEYS.slice(1).map((k) => d[k]?.length ? (
        <div key={k}><h4>{k.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}</h4>{actions(d[k])}</div>
      ) : null)}
      {(d.special_actions || []).map((g, i) => (
        <div key={i}><h4>{g.category}</h4>{actions(g.actions)}</div>
      ))}
      {d.loot?.length > 0 && (
        <div><h4>Loot</h4>{d.loot.map((l, i) => <div className="sb-act" key={i}><b>{l.name}.</b> {l.description}</div>)}</div>
      )}
    </div>
  );
});
