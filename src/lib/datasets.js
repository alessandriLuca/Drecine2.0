import { useEffect, useState } from 'react';
import { parseTable, findKey } from './dnd.js';

export const BUILTIN = [
  { id: 'mundane', name: 'Mundane equipment', file: 'database.txt' },
  { id: 'magic', name: 'Magic items', file: 'magicDataset.txt' },
];

const cache = {};

/** Normalise any item table into { name, price, rarity, description, extra } rows. */
export function normalizeItems(text) {
  const { headers, rows } = parseTable(text);
  const kName = findKey(headers, 'name', 'item', 'nome');
  const kPrice = findKey(headers, 'price', 'cost', 'value', 'prezzo');
  const kRar = findKey(headers, 'rarity', 'rarità', 'rarita');
  const kDesc = findKey(headers, 'description', 'effect', 'descrizione', 'desc');
  const used = new Set([kName, kPrice, kRar, kDesc]);
  const items = rows
    .map((r) => ({
      name: (r[kName] || '').replace(/^"|"$/g, ''),
      price: kPrice ? r[kPrice] : '',
      rarity: kRar ? Number(String(r[kRar]).match(/\d+/)?.[0]) || null : null,
      description: (kDesc ? r[kDesc] : '').replace(/^"|"$/g, ''),
      extra: Object.fromEntries(headers.filter((h) => !used.has(h)).map((h) => [h, r[h]]).filter(([, v]) => v)),
    }))
    .filter((i) => i.name);
  return { items, headers, hasRarity: !!kRar };
}

export async function loadBuiltin(id) {
  const ds = BUILTIN.find((d) => d.id === id);
  if (!ds) return { items: [] };
  if (!cache[id]) {
    const res = await fetch(`./data/${ds.file}`);
    if (!res.ok) throw new Error(`Could not load ${ds.file}`);
    cache[id] = normalizeItems(await res.text());
  }
  return cache[id];
}

export function useBuiltin(ids) {
  const [data, setData] = useState({});
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    Promise.all(ids.map((id) => loadBuiltin(id).then((d) => [id, d]))).then((entries) => {
      if (live) setData(Object.fromEntries(entries));
    }).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}
