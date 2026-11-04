import RACES from '../data/races.json';
import FEATS from '../data/feats.json';
import { CLASSES, ABILITIES, SKILLS, SKILL_ABILITY, BACKGROUNDS, ARMORS, spellSlots } from '../data/classes.js';
import { mod, profBonus, uid } from './dnd.js';

export { RACES, FEATS, CLASSES, BACKGROUNDS, ARMORS };
export const PLAYABLE_RACES = RACES.filter((r) => !r.template);
export const REVENANT = RACES.find((r) => r.id === 'revenant');

const THIRD_CASTERS = { 'Eldritch Knight': 'INT', 'Arcane Trickster': 'INT' };

export function newCharacter() {
  return {
    id: uid(),
    name: '',
    player: '',
    level: 1,
    alignment: 'True Neutral',
    background: 'Folk Hero',
    raceId: 'human',
    subrace: 0,
    revenant: false,
    size: '',
    classId: 'fighter',
    subclass: '',
    method: 'standard',
    base: { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 10, CHA: 8 },
    rolled: [],
    assign: { STR: 0, DEX: 1, CON: 2, INT: 3, WIS: 4, CHA: 5 },
    raceAsi: {}, // ability -> amount for flexible / "of your choice" increases
    improvements: [], // one entry per ASI level: { kind: 'asi', a: {STR:1,...} } | { kind: 'feat', feat }
    bonusFeats: [], // e.g. variant human
    classSkills: [],
    raceSkills: [],
    bgSkills: [],
    expertise: [],
    languages: [],
    hpMethod: 'average',
    hpRolls: [],
    armor: 'None',
    shield: false,
    equipment: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    hpCurrent: null,
    tempHp: 0,
    conditions: [],
    traits: { personality: '', ideals: '', bonds: '', flaws: '' },
    backstory: '',
    notes: '',
    portrait: '',
  };
}

export const getRace = (c) => RACES.find((r) => r.id === c.raceId) || PLAYABLE_RACES[0];
export const getSub = (c) => {
  const r = getRace(c);
  return r.subraces?.length ? r.subraces[Math.min(c.subrace || 0, r.subraces.length - 1)] : null;
};
export const getClass = (c) => CLASSES.find((k) => k.id === c.classId) || CLASSES[0];
export const getBackground = (c) => BACKGROUNDS.find((b) => b.name === c.background) || BACKGROUNDS[0];

/** Describe the free choices a race/sub-race grants for ability increases. */
export function raceAsiRules(c) {
  const r = getRace(c);
  const s = getSub(c);
  const fixed = {};
  const add = (o) => Object.entries(o || {}).forEach(([k, v]) => { fixed[k] = (fixed[k] || 0) + v; });
  add(r.asi?.fixed);
  add(s?.asi?.fixed);
  const choices = [...(r.asi?.choose || []), ...(s?.asi?.choose || [])];
  const flexible = !!(r.asi?.flexible || s?.asi?.flexible);
  return { fixed, choices, flexible };
}

/** Validate the player's free race ASI picks; returns a cleaned map. */
export function validRaceAsi(c) {
  const { fixed, choices, flexible } = raceAsiRules(c);
  const picks = Object.fromEntries(Object.entries(c.raceAsi || {}).filter(([, v]) => v > 0));
  if (flexible) {
    const vals = Object.values(picks).sort((a, b) => b - a);
    const ok = (vals.length <= 2 && vals.every((v, i) => v <= (i === 0 ? 2 : 1))) || (vals.length <= 3 && vals.every((v) => v === 1));
    return ok ? picks : {};
  }
  const budget = choices.reduce((a, ch) => a + ch.count, 0);
  const out = {};
  let used = 0;
  for (const [k, v] of Object.entries(picks)) {
    if (fixed[k] && choices.length) continue; // "other" ability scores
    if (used >= budget) break;
    out[k] = 1;
    used += 1;
  }
  return out;
}

export function asiLevels(cls, level) {
  return cls.features.filter(([l, n]) => n === 'Ability Score Improvement' && l <= level).map(([l]) => l);
}

export function featBonuses(name) {
  const f = FEATS.find((x) => x.name === name);
  return f;
}

export function compute(c) {
  const race = getRace(c);
  const sub = getSub(c);
  const cls = getClass(c);
  const bg = getBackground(c);
  const level = Math.max(1, Math.min(20, Number(c.level) || 1));
  const pb = profBonus(level);

  // ---------- ability scores
  const { fixed } = raceAsiRules(c);
  const raceBonus = { ...fixed };
  Object.entries(validRaceAsi(c)).forEach(([k, v]) => { raceBonus[k] = (raceBonus[k] || 0) + v; });
  if (c.revenant) raceBonus.CON = (raceBonus.CON || 0) + 1;
  const asiBonus = {};
  const lvls = asiLevels(cls, level);
  const feats = [...(c.bonusFeats || []).filter(Boolean)];
  lvls.forEach((_, i) => {
    const imp = c.improvements?.[i];
    if (!imp) return;
    if (imp.kind === 'feat') { if (imp.feat) feats.push(imp.feat); } else Object.entries(imp.a || {}).forEach(([k, v]) => { asiBonus[k] = (asiBonus[k] || 0) + Number(v || 0); });
  });
  const scores = {};
  ABILITIES.forEach((a) => {
    const cap = cls.id === 'barbarian' && level >= 20 && (a === 'STR' || a === 'CON') ? 24 : 20;
    let v = Number(c.base?.[a] || 10) + (raceBonus[a] || 0);
    v = Math.min(cap, v + (asiBonus[a] || 0));
    if (cap === 24) v = Math.min(24, v + 4);
    scores[a] = v;
  });
  const mods = Object.fromEntries(ABILITIES.map((a) => [a, mod(scores[a])]));

  // ---------- proficiencies
  const raceSkillsFixed = [...(race.skills?.fixed || []), ...(sub?.skills?.fixed || [])];
  const skillSet = new Set([...raceSkillsFixed, ...(c.raceSkills || []), ...(c.classSkills || []), ...(bg.skills || []), ...(c.bgSkills || [])]);
  if (c.revenant) { /* no skills */ }
  const saves = new Set(cls.saves);
  if (cls.id === 'monk' && level >= 14) ABILITIES.forEach((a) => saves.add(a));
  if (cls.id === 'rogue' && level >= 15) saves.add('WIS');
  const expertise = new Set(c.expertise || []);
  const jack = cls.id === 'bard' && level >= 2;
  const skills = SKILLS.map((s) => {
    const prof = skillSet.has(s);
    const exp = prof && expertise.has(s);
    const bonus = mods[SKILL_ABILITY[s]] + (exp ? pb * 2 : prof ? pb : jack ? Math.floor(pb / 2) : 0);
    return { name: s, ability: SKILL_ABILITY[s], prof, exp, bonus };
  });
  const saveList = ABILITIES.map((a) => ({ ability: a, prof: saves.has(a), bonus: mods[a] + (saves.has(a) ? pb : 0) }));
  const perception = skills.find((s) => s.name === 'Perception').bonus;
  const hasFeat = (n) => feats.some((f) => f.toLowerCase().startsWith(n.toLowerCase()));

  // ---------- hit points
  const hd = cls.hitDie;
  const avg = hd / 2 + 1;
  let hp = hd + mods.CON;
  for (let l = 2; l <= level; l++) {
    const r = c.hpMethod === 'max' ? hd : c.hpMethod === 'rolled' ? Number(c.hpRolls?.[l - 2] || avg) : avg;
    hp += Math.max(1, r + mods.CON);
  }
  hp += (race.hpPerLevel || 0) * level + (sub?.hpPerLevel || 0) * level;
  if (hasFeat('Tough')) hp += 2 * level;
  hp = Math.max(1, hp);

  // ---------- armor class
  const armor = ARMORS.find((a) => a.name === c.armor) || ARMORS[0];
  const naturalAC = sub?.naturalAC || race.naturalAC;
  const options = [];
  if (armor.type === 'none') {
    options.push({ v: 10 + mods.DEX, why: 'Unarmored' });
    if (cls.unarmored && !(cls.noShieldUnarmored && c.shield)) {
      options.push({ v: 10 + mods[cls.unarmored[0]] + mods[cls.unarmored[1]], why: 'Unarmored Defense' });
    }
    if (naturalAC) options.push({ v: naturalAC.base + (naturalAC.ability ? mods[naturalAC.ability] : 0), why: 'Natural armor' });
  } else {
    const dex = armor.dex === 'full' ? mods.DEX : Math.min(armor.dex, mods.DEX);
    options.push({ v: armor.base + dex, why: armor.name });
    if (naturalAC && race.id !== 'tortle') options.push({ v: naturalAC.base + (naturalAC.ability ? mods[naturalAC.ability] : 0), why: 'Natural armor' });
  }
  const best = options.sort((a, b) => b.v - a.v)[0];
  let ac = best.v + (c.shield ? 2 : 0) + (race.acBonus || 0);
  const acNote = `${best.why}${c.shield ? ' + shield' : ''}${race.acBonus ? ' + integrated protection' : ''}`;

  // ---------- speed / senses
  const speed = { ...(race.speed || { walk: 30 }), ...(sub?.speed || {}) };
  if (cls.id === 'monk' && armor.type === 'none' && !c.shield) speed.walk += cls.resources['Unarmored movement'][level - 1];
  if (cls.id === 'barbarian' && level >= 5 && armor.type !== 'heavy') speed.walk += 10;
  if (hasFeat('Mobile')) speed.walk += 10;
  const darkvision = Math.max(race.darkvision || 0, sub?.darkvision || 0);
  let initiative = mods.DEX + (race.id === 'harengon' ? pb : 0) + (hasFeat('Alert') ? 5 : 0);
  if (jack) initiative += Math.floor(pb / 2);

  // ---------- spellcasting
  let caster = null;
  const thirdAbility = THIRD_CASTERS[c.subclass];
  if (cls.caster || (thirdAbility && level >= 3)) {
    const effCls = cls.caster ? cls : { ...cls, caster: 'third', spellAbility: thirdAbility };
    const ab = effCls.spellAbility;
    caster = {
      ability: ab,
      dc: 8 + pb + mods[ab],
      attack: pb + mods[ab],
      slots: spellSlots(effCls, level),
      cantrips: cls.cantrips?.[level - 1] ?? (thirdAbility ? (level >= 10 ? 3 : 2) : 0),
      known: cls.spellsKnown?.[level - 1],
      prepared: cls.prepared ? Math.max(1, mods[ab] + (cls.caster === 'half' || cls.caster === 'artificer' ? Math.floor(level / 2) : level)) : null,
    };
  }

  // ---------- features
  const classFeatures = cls.features.filter(([l, n]) => l <= level && n !== 'Ability Score Improvement').map(([l, n, d]) => ({ level: l, name: n, text: d }));
  const raceTraits = [...(race.traits || []), ...(sub?.traits || []), ...(c.revenant ? REVENANT.traits : [])];
  const resources = Object.entries(cls.resources || {}).map(([k, arr]) => [k, arr[level - 1]]).filter(([, v]) => v && v !== 0);

  // ---------- languages & other proficiencies
  const languages = [...new Set([...(race.languages?.fixed || []), ...(c.languages || []).filter(Boolean)])];
  const weapons = [...new Set([...cls.weapons, ...(race.weapons || []), ...(sub?.weapons || [])])];
  const armorProf = [...new Set([...cls.armor, ...(race.armor || []), ...(sub?.armor || [])])];
  const tools = [...new Set([...(cls.tools || []), ...(bg.tools || []), ...(sub?.tools || [])])];
  const resistances = [...new Set([...(race.resistances || []), ...(sub?.resistances || [])])];

  const size = race.size === 'Medium or Small' ? (c.size || 'Medium') : race.size;

  return {
    race, sub, cls, bg, level, pb, scores, mods, raceBonus, asiBonus, feats,
    skills, saves: saveList, passive: 10 + perception, hp, ac, acNote, speed, darkvision, initiative,
    caster, classFeatures, raceTraits, resources, languages, weapons, armorProf, tools, resistances, size,
    hitDice: `${level}d${hd}`, asiLevels: lvls,
    raceName: sub ? sub.name : race.name,
  };
}

/** How many free picks the character still has to make (for builder badges). */
export function pendingChoices(c) {
  const d = compute(c);
  const out = [];
  const raceSkillN = (d.race.skills?.choose?.n || 0) + (d.sub?.skills?.choose?.n || 0);
  if ((c.raceSkills || []).length < raceSkillN) out.push('race skills');
  if ((c.classSkills || []).length < d.cls.skills.n) out.push('class skills');
  const langN = (d.race.languages?.choose || 0) + (d.sub?.languages?.choose || 0) + (d.bg.languages || 0);
  if ((c.languages || []).filter(Boolean).length < langN) out.push('languages');
  if (!c.name) out.push('name');
  return out;
}
