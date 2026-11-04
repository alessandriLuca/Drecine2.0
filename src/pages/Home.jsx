import { useCharacters } from '../lib/store.js';
import { RACES, CLASSES, FEATS, PLAYABLE_RACES, raceImage } from '../lib/character.js';
import ClassEmblem from '../components/ClassEmblem.jsx';

export default function Home({ pages }) {
  const { characters } = useCharacters();
  return (
    <div className="stack">
      <section className="hero">
        <h1>DRECINE 2.0</h1>
        <p className="acr">
          <b>D</b>ungeons &amp; Dragons <b>R</b>eact <b>E</b>ngine for <b>C</b>haracters, <b>I</b>tems, <b>N</b>PCs &amp; <b>E</b>quipment
        </p>
        <p style={{ maxWidth: '65ch' }}>
          A free toolbox for Dungeon Masters and players. Everything runs in your browser: no account, no server —
          your party and characters are saved locally and can be exported at any time.
        </p>
        <div className="row mt">
          <a className="btn primary" href="#/builder">Create a character</a>
          <a className="btn" href="#/party">Open the party ({characters.length})</a>
          <span className="tag gold">{RACES.length - 1} races</span>
          <span className="tag gold">{CLASSES.length} classes</span>
          <span className="tag gold">{FEATS.length} feats</span>
        </div>
      </section>
      <div className="strip mt">
        {PLAYABLE_RACES.map((r) => <a key={r.id} href="#/builder" title={r.name}><img src={raceImage(r.id)} alt={r.name} loading="lazy" /></a>)}
      </div>
      <div className="row mt" style={{ justifyContent: 'center' }}>
        {CLASSES.map((k) => <span key={k.id} title={k.name}><ClassEmblem id={k.id} size={48} /></span>)}
      </div>
      <div className="grid g3 mt">
        {pages.map((p) => (
          <a key={p.path} className="tool-card" href={`#/${p.path}`}>
            <div className="ico">{p.icon}</div>
            <h3>{p.label}</h3>
            <p>{p.desc}</p>
          </a>
        ))}
        <div className="tool-card" style={{ cursor: 'default' }}>
          <div className="ico">🎲</div>
          <h3>Dice tray</h3>
          <p>Always available in the bottom-right corner. Supports expressions such as 2d6+3, advantage (2d20kh1) and 4d6kh3.</p>
        </div>
      </div>
    </div>
  );
}
