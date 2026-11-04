import { useEffect, useState, useSyncExternalStore } from 'react';

// Tiny persistent store shared by every page (characters live here so the
// builder, the party tracker and the loot generator all see the same data).

const KEY = 'drecine.v2';
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage unavailable */ }
  return { characters: [] };
}

let state = load();

function emit() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
  listeners.forEach((l) => l());
}

export const store = {
  get: () => state,
  set(updater) {
    state = typeof updater === 'function' ? updater(state) : updater;
    emit();
  },
  subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
};

export function useStore(selector = (s) => s) {
  return selector(useSyncExternalStore(store.subscribe, store.get));
}

export function useCharacters() {
  const characters = useStore((s) => s.characters || []);
  const save = (ch) => store.set((s) => {
    const list = s.characters || [];
    const exists = list.some((c) => c.id === ch.id);
    return { ...s, characters: exists ? list.map((c) => (c.id === ch.id ? ch : c)) : [...list, ch] };
  });
  const remove = (id) => store.set((s) => ({ ...s, characters: (s.characters || []).filter((c) => c.id !== id) }));
  const replaceAll = (list) => store.set((s) => ({ ...s, characters: list }));
  return { characters, save, remove, replaceAll };
}

/** useState mirrored into localStorage (for per-page preferences). */
export function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(`drecine.${key}`);
      return raw != null ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(`drecine.${key}`, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key, v]);
  return [v, setV];
}

/** Minimal hash router: #/page?x=y */
export function useRoute() {
  const get = () => {
    const h = window.location.hash.replace(/^#\/?/, '');
    const [path, q] = h.split('?');
    return { path: path || '', query: Object.fromEntries(new URLSearchParams(q || '')) };
  };
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => { window.location.hash = `#/${path}`; };
