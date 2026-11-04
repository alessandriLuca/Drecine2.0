import raw from '../data/languages.csv?raw';
import { parseTable } from './dnd.js';

const fixes = { Primodial: 'Primordial' };
const { rows } = parseTable(raw);
const seen = new Set();
export const LANGUAGES = rows
  .map((r) => ({ name: fixes[r.Language] || r.Language, speakers: r['Creature Type'], info: r['Other Info'] }))
  .filter((l) => l.name && !seen.has(l.name) && seen.add(l.name));

export const STANDARD_LANGUAGES = ['Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc', 'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal', 'Primordial', 'Sylvan', 'Undercommon'];
export const LANGUAGE_NAMES = [...new Set([...STANDARD_LANGUAGES, ...LANGUAGES.map((l) => l.name)])];
