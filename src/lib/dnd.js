export const mod = (score) => Math.floor((Number(score || 10) - 10) / 2);
export const fmt = (n) => (n >= 0 ? `+${n}` : `${n}`);
export const profBonus = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);

export const rand = (n) => Math.floor(Math.random() * n) + 1;

/** Roll a dice expression such as "2d6+3", "d20", "4d6kh3" (keep highest 3). */
export function roll(expr) {
  const clean = String(expr).replace(/\s+/g, '').toLowerCase();
  if (!clean) return null;
  const parts = clean.match(/[+-]?[^+-]+/g);
  if (!parts) return null;
  let total = 0;
  const detail = [];
  for (const raw of parts) {
    const sign = raw.startsWith('-') ? -1 : 1;
    const p = raw.replace(/^[+-]/, '');
    const m = p.match(/^(\d*)d(\d+)(?:(kh|kl)(\d+))?$/);
    if (m) {
      const count = Math.min(Number(m[1] || 1), 200);
      const sides = Number(m[2]);
      if (!sides) return null;
      const rolls = Array.from({ length: count }, () => rand(sides));
      let kept = rolls;
      if (m[3]) {
        const k = Number(m[4]);
        kept = [...rolls].sort((a, b) => (m[3] === 'kh' ? b - a : a - b)).slice(0, k);
      }
      const sum = kept.reduce((a, b) => a + b, 0);
      total += sign * sum;
      detail.push(`${sign < 0 ? '-' : ''}${p}[${rolls.join(',')}${m[3] ? ` → ${kept.join(',')}` : ''}]`);
    } else if (/^\d+$/.test(p)) {
      total += sign * Number(p);
      detail.push(`${sign < 0 ? '-' : '+'}${p}`);
    } else {
      return null;
    }
  }
  return { total, detail: detail.join(' ') };
}

export const roll4d6 = () => {
  const r = [rand(6), rand(6), rand(6), rand(6)].sort((a, b) => b - a);
  return r[0] + r[1] + r[2];
};

export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function rarityLabel(r) {
  const n = Number(r);
  if (!n) return '—';
  if (n <= 3) return 'Legendary';
  if (n <= 6) return 'Very rare';
  if (n <= 10) return 'Rare';
  if (n <= 14) return 'Uncommon';
  return 'Common';
}

export function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}

export function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Parse a delimited table with a header row. Auto-detects | , ; or tab. Handles quoted fields. */
export function parseTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const first = lines[0];
  const delim = ['|', '\t', ';', ','].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const split = (line) => {
    const out = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
      } else if (c === delim && !q) { out.push(cur.trim()); cur = ''; } else cur += c;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(first).map((h, i) => h || `Column ${i + 1}`);
  const rows = lines.slice(1).map((l) => {
    const cells = split(l);
    const o = {};
    headers.forEach((h, i) => { o[h] = cells[i] ?? ''; });
    return o;
  });
  return { headers, rows };
}

export const findKey = (headers, ...names) =>
  headers.find((h) => names.some((n) => h.toLowerCase() === n)) ||
  headers.find((h) => names.some((n) => h.toLowerCase().includes(n)));
