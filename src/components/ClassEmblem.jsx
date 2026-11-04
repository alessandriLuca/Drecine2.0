// Original heraldic emblems for each class (inline SVG, no external assets).

const COLORS = {
  artificer: ['#3a6f8f', '#9fd3f0'], barbarian: ['#8f2f1f', '#f0a080'], bard: ['#7a3f8f', '#e6b3f2'],
  'blood-hunter': ['#6b0f1a', '#ff7a85'], cleric: ['#8f7a2f', '#ffe28a'], druid: ['#2f6f3a', '#9fe0a0'],
  fighter: ['#5a5a66', '#e0e0ea'], monk: ['#2f6f6f', '#9fe8e0'], paladin: ['#2f4f8f', '#ffe9a8'],
  ranger: ['#3f5f2a', '#c8e89a'], rogue: ['#2a2a33', '#b8b8c8'], sorcerer: ['#8f2f5a', '#ffb070'],
  warlock: ['#3f1f5f', '#c89aff'], wizard: ['#1f3f7a', '#a8c8ff'],
};

const ICONS = {
  artificer: (
    <>
      <circle cx="32" cy="32" r="11" />
      <path d="M32 12v6M32 46v6M12 32h6M46 32h6M18 18l4 4M42 42l4 4M46 18l-4 4M18 46l4-4" />
      <circle cx="32" cy="32" r="4" />
    </>
  ),
  barbarian: (
    <>
      <path d="M32 10v46" />
      <path d="M32 16c-8-6-16-4-18 4 4 8 12 8 18 4M32 16c8-6 16-4 18 4-4 8-12 8-18 4" />
    </>
  ),
  bard: (
    <>
      <ellipse cx="26" cy="40" rx="11" ry="12" />
      <circle cx="26" cy="40" r="3" />
      <path d="M33 31 48 14M45 11l6 6M28 52l-4-24" />
    </>
  ),
  'blood-hunter': (
    <>
      <path d="M32 12c-7 10-12 17-12 23a12 12 0 0 0 24 0c0-6-5-13-12-23Z" />
      <path d="M14 54 50 18M46 16l6 6" />
    </>
  ),
  cleric: (
    <>
      <circle cx="32" cy="32" r="9" />
      <path d="M32 10v8M32 46v8M10 32h8M46 32h8M17 17l6 6M41 41l6 6M47 17l-6 6M17 47l6-6" />
    </>
  ),
  druid: (
    <>
      <path d="M32 54C16 44 14 26 32 10c18 16 16 34 0 44Z" />
      <path d="M32 54V20M32 30l-7-6M32 38l8-7M32 46l-6-5" />
    </>
  ),
  fighter: (
    <>
      <path d="M14 14 46 46M50 14 18 46" />
      <path d="M40 46l8-8M16 38l8 8M12 50l6-6M52 50l-6-6" />
    </>
  ),
  monk: (
    <>
      <circle cx="32" cy="32" r="18" />
      <path d="M32 14a9 9 0 0 1 0 18 9 9 0 0 0 0 18" />
      <circle cx="32" cy="23" r="2" />
      <circle cx="32" cy="41" r="2" />
    </>
  ),
  paladin: (
    <>
      <path d="M32 10 50 16v14c0 12-8 20-18 24-10-4-18-12-18-24V16Z" />
      <path d="M32 18v28M23 28h18" />
    </>
  ),
  ranger: (
    <>
      <path d="M20 10c14 8 14 36 0 44" />
      <path d="M20 10v44M14 32h38M46 27l6 5-6 5M14 28l-3 4 3 4" />
    </>
  ),
  rogue: (
    <>
      <path d="M32 8 37 34H27Z" />
      <path d="M22 34h20M32 34v10M28 48a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />
    </>
  ),
  sorcerer: (
    <>
      <path d="M32 54c-10 0-16-7-16-15 0-9 8-13 9-23 5 5 6 10 5 14 3-3 5-8 4-14 10 6 14 15 14 23 0 8-6 15-16 15Z" />
      <path d="M32 54c-4 0-7-3-7-7 0-4 4-7 6-12 2 4 8 7 8 12 0 4-3 7-7 7Z" />
    </>
  ),
  warlock: (
    <>
      <path d="M8 32c7-10 15-15 24-15s17 5 24 15c-7 10-15 15-24 15S15 42 8 32Z" />
      <circle cx="32" cy="32" r="7" />
      <path d="M32 26v12" />
    </>
  ),
  wizard: (
    <>
      <path d="M14 50h36M20 50 34 10l12 40" />
      <path d="M27 30h12M40 18l2-4 2 4 4 2-4 2-2 4-2-4-4-2Z" />
    </>
  ),
};

export default function ClassEmblem({ id, size = 56 }) {
  const [bg, fg] = COLORS[id] || ['#444', '#ddd'];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <radialGradient id={`g-${id}`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={fg} stopOpacity=".35" />
          <stop offset="100%" stopColor={bg} />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#g-${id})`} stroke="#d9a441" strokeWidth="2" />
      <circle cx="32" cy="32" r="26" fill="none" stroke={fg} strokeOpacity=".35" strokeWidth="1" />
      <g fill="none" stroke={fg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">{ICONS[id]}</g>
    </svg>
  );
}
