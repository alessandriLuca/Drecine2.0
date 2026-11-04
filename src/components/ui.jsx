export function Field({ label, children, style }) {
  return <label className="field" style={style}>{label}{children}</label>;
}

/** Toggle chips with an optional maximum. */
export function ChipPicker({ options, value = [], max = Infinity, onChange, locked = [] }) {
  const lockedSet = new Set(locked);
  return (
    <div className="chips">
      {options.map((o) => {
        const isLocked = lockedSet.has(o);
        const on = value.includes(o) || isLocked;
        const full = !on && value.length >= max;
        return (
          <button
            type="button"
            key={o}
            className={`tag chip ${on ? 'on' : ''} ${full || isLocked ? 'disabled' : ''}`}
            title={isLocked ? 'Already granted by another source' : ''}
            onClick={() => {
              if (isLocked) return;
              if (on) onChange(value.filter((v) => v !== o));
              else if (!full) onChange([...value, o]);
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Count({ have, need }) {
  const ok = have >= need;
  return <span className={`tag ${ok ? 'green' : 'red'}`}>{have}/{need}</span>;
}

export function Traits({ traits }) {
  if (!traits?.length) return <p className="muted">No special traits.</p>;
  return (
    <div>
      {traits.map((t, i) => (
        <div className="trait" key={`${t.name}-${i}`}><b>{t.name}.</b> {t.text}</div>
      ))}
    </div>
  );
}
