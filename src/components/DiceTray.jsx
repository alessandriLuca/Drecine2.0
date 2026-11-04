import { useState } from 'react';
import { roll } from '../lib/dnd.js';

const QUICK = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', '2d20kh1', '2d20kl1', '4d6kh3'];

export default function DiceTray() {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('1d20');
  const [log, setLog] = useState([]);
  const doRoll = (e) => {
    const r = roll(e);
    setLog((l) => [{ e, ...(r || { total: '?', detail: 'invalid expression' }) }, ...l].slice(0, 8));
  };
  return (
    <>
      {open && (
        <div className="panel dice-tray">
          <div className="row spread"><h3 style={{ margin: 0 }}>Dice</h3><small>e.g. 3d6+2, 2d20kh1</small></div>
          <form className="row mt" onSubmit={(ev) => { ev.preventDefault(); doRoll(expr); }}>
            <input value={expr} onChange={(e) => setExpr(e.target.value)} style={{ flex: 1 }} aria-label="Dice expression" />
            <button className="btn primary">Roll</button>
          </form>
          <div className="chips mt">
            {QUICK.map((q) => <button key={q} className="tag chip" onClick={() => doRoll(q)}>{q}</button>)}
          </div>
          {log[0] && <div className="dice-result mt">{log[0].total}</div>}
          <div className="stack" style={{ fontSize: '.8rem' }}>
            {log.map((l, i) => <div key={i} className={i ? 'muted' : ''}><b>{l.e}</b> = {l.total} <small>{l.detail}</small></div>)}
          </div>
        </div>
      )}
      <button className="dice-fab no-print" onClick={() => setOpen(!open)} title="Dice roller" aria-label="Dice roller">🎲</button>
    </>
  );
}
