import { useState } from 'react';
import { useRoute } from './lib/store.js';
import Home from './pages/Home.jsx';
import Builder from './pages/Builder.jsx';
import Party from './pages/Party.jsx';
import Loot from './pages/Loot.jsx';
import Compendium from './pages/Compendium.jsx';
import WildSurge from './pages/WildSurge.jsx';
import Monsters from './pages/Monsters.jsx';
import DatabaseGen from './pages/DatabaseGen.jsx';
import DiceTray from './components/DiceTray.jsx';
import Logo from './components/Logo.jsx';

export const PAGES = [
  { path: 'builder', label: 'Character Builder', icon: '🧙', el: Builder, desc: 'Create a full character sheet: 70 races with sub-races, 14 classes, point-buy, skills, feats and a printable sheet.' },
  { path: 'party', label: 'Party', icon: '🛡️', el: Party, desc: 'Track your players: HP, AC, conditions, equipment (cursed and attuned items), coins. Import/export JSON or YAML.' },
  { path: 'loot', label: 'Loot', icon: '💰', el: Loot, desc: 'Roll random items by rarity from the mundane or magic databases (or your own) and hand them straight to a player.' },
  { path: 'compendium', label: 'Compendium', icon: '📚', el: Compendium, desc: 'Search items, magic items, races, classes, feats and languages in one place.' },
  { path: 'wildsurge', label: 'Wild Surge', icon: '🌀', el: WildSurge, desc: 'Roll on three wild magic surge tables or on your own custom table.' },
  { path: 'monsters', label: 'NPC & Monsters', icon: '🐉', el: Monsters, desc: 'Write YAML (or let an AI write it) and get a printable stat-block card with your own artwork, exportable as PNG.' },
  { path: 'database', label: 'Database Generator', icon: '🗂️', el: DatabaseGen, desc: 'Build an AI prompt for a themed item database, validate the answer and download it ready for the loot roller.' },
];

export default function App() {
  const { path, query } = useRoute();
  const [open, setOpen] = useState(false);
  const page = PAGES.find((p) => p.path === path);
  const El = page ? page.el : Home;
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/"><Logo /> DRECINE</a>
        <button className="btn small menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
        <nav className={`nav ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          {PAGES.map((p) => (
            <a key={p.path} href={`#/${p.path}`} className={p.path === path ? 'active' : ''}>{p.label}</a>
          ))}
        </nav>
      </header>
      <main>
        <El query={query} pages={PAGES} />
      </main>
      <footer>
        DRECINE 2.0 — Dungeons &amp; Dragons React Engine for Characters, Items, NPCs &amp; Equipment · free &amp; open source (AGPL-3.0) · data is saved only in your browser
      </footer>
      <DiceTray />
    </>
  );
}
