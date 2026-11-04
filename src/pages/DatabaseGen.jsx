import { useState } from 'react';
import { normalizeItems } from '../lib/datasets.js';
import { download, rarityLabel } from '../lib/dnd.js';
import { Field } from '../components/ui.jsx';

function buildPrompt({ theme, count, columns, setting }) {
  return `I am a Dungeon Master preparing a Dungeons & Dragons 5e campaign${setting ? ` (${setting})` : ''}.
Create a database of ${count} unique items with this theme: ${theme || 'a mix of curious adventuring gear'}.

Format rules (very important):
- Output a single code block with plain text, no commentary.
- First line is the header. Columns are separated by the pipe character | and no other separator.
- Columns, in this order: ${columns}.
- Rarity is a whole number from 1 to 20 where 20 = very common and 1 = legendary (roughly: 15-20 common, 11-14 uncommon, 7-10 rare, 4-6 very rare, 1-3 legendary).
- Price in gp/sp/cp, consistent with the rarity.
- Never use the | character inside a field. Keep each item on one line.
- Descriptions must be precise 5e mechanics: dice, damage types, saving throw DCs, ranges, durations, charges, attunement.
- Every item must be different and fit the theme; no placeholders, no "etc.", write all ${count} rows.`;
}

export default function DatabaseGen() {
  const [theme, setTheme] = useState('');
  const [setting, setSetting] = useState('');
  const [count, setCount] = useState(50);
  const [columns, setColumns] = useState('Name|Price|Rarity|Description');
  const [answer, setAnswer] = useState('');
  const [name, setName] = useState('my-items');
  const [copied, setCopied] = useState(false);
  const prompt = buildPrompt({ theme, count, columns, setting });

  const cleaned = answer.replace(/```[a-z]*\n?/gi, '').trim();
  const parsed = cleaned ? normalizeItems(cleaned) : null;
  const problems = [];
  if (parsed) {
    if (!parsed.items.length) problems.push('No rows found — is the first line a header?');
    if (!parsed.hasRarity) problems.push('No Rarity column: the loot roller will not be able to filter by rarity.');
    const bad = parsed.items.filter((i) => parsed.hasRarity && !(i.rarity >= 1 && i.rarity <= 20)).length;
    if (bad) problems.push(`${bad} rows have a rarity outside 1–20.`);
    const dup = parsed.items.length - new Set(parsed.items.map((i) => i.name.toLowerCase())).size;
    if (dup) problems.push(`${dup} duplicated item names.`);
  }

  return (
    <div>
      <div className="page-head">
        <div><h1>Database Generator</h1><p>Create custom item databases with any AI chat. Describe the theme, copy the prompt, paste the answer back: DRECINE checks it and gives you a file you can load in the <a href="#/loot">loot roller</a>.</p></div>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="panel stack">
          <h2>1. Describe the database</h2>
          <Field label="Theme"><input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. cursed pirate treasure from the Sea of Fallen Stars" /></Field>
          <Field label="Setting / notes (optional)"><input value={setting} onChange={(e) => setSetting(e.target.value)} placeholder="e.g. low-magic, levels 3–6" /></Field>
          <div className="grid g2">
            <Field label="Number of items"><input type="number" min="5" max="200" value={count} onChange={(e) => setCount(Number(e.target.value))} /></Field>
            <Field label="Columns (| separated)"><input value={columns} onChange={(e) => setColumns(e.target.value)} /></Field>
          </div>
          <textarea readOnly value={prompt} style={{ minHeight: 220, fontSize: 13 }} />
          <button className="btn primary" onClick={async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* select manually */ } }}>{copied ? '✓ Copied' : '📋 Copy prompt'}</button>
        </div>
        <div className="panel stack">
          <h2>2. Paste the AI answer</h2>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Name|Price|Rarity|Description&#10;Barnacle Cutlass|350 gp|12|…" style={{ minHeight: 220, fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
          {parsed && (problems.length
            ? <div className="notice warn">{problems.map((p) => <div key={p}>⚠ {p}</div>)}</div>
            : <div className="notice ok">✓ {parsed.items.length} items look good.</div>)}
          {parsed?.items.length > 0 && (
            <>
              <div className="scroll" style={{ maxHeight: 260 }}>
                <table>
                  <thead><tr><th>Name</th><th>Price</th><th>Rarity</th></tr></thead>
                  <tbody>{parsed.items.slice(0, 100).map((i, k) => <tr key={k}><td>{i.name}</td><td>{i.price}</td><td>{i.rarity ?? '—'} {i.rarity ? <small>({rarityLabel(i.rarity)})</small> : null}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="row">
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 200 }} aria-label="File name" />
                <button className="btn primary" onClick={() => download(`${name || 'items'}.txt`, cleaned)}>Download .txt</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
