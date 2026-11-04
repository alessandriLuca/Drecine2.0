#!/usr/bin/env python3
"""Build src/data/races.json from the Races PDF.

Usage:  python3 scripts/build_races.py path/to/Races.pdf

Requires `pdftotext` (poppler-utils). Single-column race pages are parsed
automatically ("Trait Name. Trait text" paragraphs); pages whose multi-column
layout scrambles the text (sub-races) are described by hand in SUBRACES below.
Game mechanics (ability increases, speeds, darkvision, languages, skills,
resistances) are derived from the trait text and can be overridden per race.
"""
import json, re, subprocess, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "races.json"

ABILS = {"strength": "STR", "dexterity": "DEX", "constitution": "CON",
         "intelligence": "INT", "wisdom": "WIS", "charisma": "CHA"}
SKILLS = ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History",
          "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception",
          "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"]
LANGS = ["Common", "Dwarvish", "Elvish", "Elven", "Giant", "Gnomish", "Goblin", "Halfling", "Orc",
         "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan",
         "Undercommon", "Aquan", "Auran", "Gith", "Quori", "Leonin", "Loxodon", "Minotaur",
         "Vedalken", "Aarakocra", "Grung", "Khenra", "Merfolk", "Naga", "Siren", "Vampire"]
MECH = {"Ability Score Increase", "Age", "Alignment", "Size", "Speed", "Languages",
        "Creature Type", "Type", "Life Span", "Fey"}

# ---------------------------------------------------------------- races
# id, display name, description page(s), trait page(s), extra overrides
RACES = [
    ("dragonborn", "Dragonborn", [14], [13], {}),
    ("dwarf", "Dwarf", [15], [15], {"traitsFrom": "dwarf"}),
    ("duergar", "Duergar", [16], [16], {}),
    ("orc", "Orc", [17], [17], {}),
    ("half-orc", "Half-Orc", [18], [18], {}),
    ("human", "Human", [19], [19], {}),
    ("elf", "Elf", [20], [20], {}),
    ("eladrin", "Eladrin", [22], [22], {}),
    ("sea-elf", "Sea Elf", [23], [23], {}),
    ("shadar-kai", "Shadar-kai", [24], [24], {}),
    ("astral-elf", "Astral Elf", [25], [25], {}),
    ("half-elf", "Half-Elf", [26], [26], {}),
    ("tiefling", "Tiefling", [27], [27], {}),
    ("lizardfolk", "Lizardfolk", [31], [31], {}),
    ("halfling", "Halfling", [32], [32], {}),
    ("gnome", "Gnome", [34], [34], {}),
    ("deep-gnome", "Deep Gnome", [36], [36], {}),
    ("autognome", "Autognome", [37], [37], {}),
    ("aasimar", "Aasimar", [38], [38], {}),
    ("bugbear", "Bugbear", [39], [39], {}),
    ("centaur", "Centaur", [40], [40], {"type": "Fey"}),
    ("air-genasi", "Air Genasi", [41], [41], {}),
    ("earth-genasi", "Earth Genasi", [42], [42], {}),
    ("fire-genasi", "Fire Genasi", [43], [43], {}),
    ("water-genasi", "Water Genasi", [44], [44], {"speed": {"walk": 30, "swim": 30}}),
    ("satyr", "Satyr", [45], [45], {"type": "Fey"}),
    ("changeling", "Changeling", [46], [46], {}),
    ("firbolg", "Firbolg", [47], [47], {}),
    ("minotaur", "Minotaur", [48], [48], {}),
    ("githyanki", "Githyanki", [49], [49], {}),
    ("githzerai", "Githzerai", [50], [50], {}),
    ("goblin", "Goblin", [51], [51], {}),
    ("hobgoblin", "Hobgoblin", [52], [52], {}),
    ("goliath", "Goliath", [53], [53], {}),
    ("harengon", "Harengon", [54], [54], {}),
    ("kenku", "Kenku", [55], [55], {}),
    ("kobold", "Kobold", [56], [56], {}),
    ("shifter", "Shifter", [57], [57], {}),
    ("tabaxi", "Tabaxi", [59], [59], {"speed": {"walk": 30, "climb": 20}}),
    ("tortle", "Tortle", [60], [60], {"naturalAC": {"base": 17, "ability": None, "note": "Shell: AC 17, Dex does not apply"}}),
    ("triton", "Triton", [61], [61], {}),
    ("fairy", "Fairy", [62], [62], {"speed": {"walk": 30, "fly": 30}}),
    ("yuan-ti", "Yuan-ti", [63], [63], {}),
    ("kender", "Kender", [64], [64], {}),
    ("owlin", "Owlin", [65], [65], {"speed": {"walk": 30, "fly": 30}}),
    ("loxodon", "Loxodon", [66], [66], {"naturalAC": {"base": 12, "ability": "CON"}}),
    ("giff", "Giff", [67], [67], {"speed": {"walk": 30, "swim": 30}}),
    ("verdan", "Verdan", [68], [68], {}),
    ("hadozee", "Hadozee", [69], [69], {"speed": {"walk": 30, "climb": 30}}),
    ("plasmoid", "Plasmoid", [70], [70], {}),
    ("thri-kreen", "Thri-kreen", [71], [71], {"naturalAC": {"base": 13, "ability": "DEX"}}),
    ("leonin", "Leonin", [72], [72], {}),
    ("grung", "Grung", [73], [73], {}),
    ("warforged", "Warforged", [74], [74], {"acBonus": 1}),
    ("aarakocra", "Aarakocra", [75], [75], {}),
    ("kalashtar", "Kalashtar", [76], [76], {}),
    ("locathah", "Locathah", [77], [77], {"naturalAC": {"base": 12, "ability": "DEX"}}),
    ("simic-hybrid", "Simic Hybrid", [78], [78], {}),
    ("vedalken", "Vedalken", [79], [79], {}),
    ("aetherborn", "Aetherborn", [80], [80], {}),
    ("khenra", "Khenra", [81], [81], {}),
    ("kor", "Kor", [82], [82], {}),
    ("merfolk", "Merfolk", [83], [83], {}),
    ("naga", "Naga", [84], [84], {}),
    ("siren", "Siren", [85], [85], {}),
    ("vampire", "Vampire", [86], [86], {}),
    ("dhampir", "Dhampir", [87], [88], {"speed": {"walk": 35, "climb": 35}}),
    ("hexblood", "Hexblood", [89], [90], {}),
    ("reborn", "Reborn", [91], [92], {}),
    ("glitchling", "Glitchling", [93], [93], {"naturalAC": {"base": 14, "ability": None}}),
]

# Manual mechanics fixes (merged over auto-derived values)
NOSKILL = {"fixed": [], "choose": None}
DWARF_W = ["Battleaxe", "Handaxe", "Light hammer", "Warhammer"]
MERGE = {"Autumn", "Winter", "Spring", "Summer"}
DROP = {"Subrace", "Mask of the Wild", "Cantrip", "Lore of the Waters", "Dwarven Toughness", "Dwarven Armor Training"}
DESC = {
    "dwarf": "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal. They stand between 4 and 5 feet tall but are so broad and compact that they can weigh as much as a human.",
    "shadar-kai": "Sworn to the Raven Queen's service, the mysterious shadar-kai venture into the Material Plane from the Shadowfell to advance her will. Once they were fey like the rest of their elven kin; now they exist in a strange state between life and death. Eladrin and shadar-kai are like reflections of each other: one bursting with emotion, the other nearly devoid of it.",
    "tiefling": "To be greeted with stares and whispers, to suffer violence and insult on the street, to see mistrust and fear in every eye: this is the lot of the tiefling. A pact struck generations ago infused the essence of Asmodeus and the archdevils of the Nine Hells into their bloodline.",
    "dragonborn": "Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail. Shaped by the dragons themselves, they originally hatched from dragon eggs, combining the best attributes of dragons and humanoids.",
    "lizardfolk": "Lizardfolk possess an alien and inscrutable mindset, their desires and thoughts driven by a different set of basic principles than those of warm-blooded creatures. Their dismal swamp homes might lie hundreds of miles from the nearest human settlement, but the gap between their way of thinking and that of the smooth-skins is far greater.",
    "yuan-ti": "The serpent creatures known as yuan-ti are all that remains of an ancient, decadent human empire. Yuan-ti purebloods are the most human-looking of their kind, able to pass among other folk while serving their serpent gods.",
}
FIX = {
    "dragonborn": {"asi": {}},  # comes from the sub-race
    "dwarf": {"asi": {"fixed": {"CON": 2}}, "skills": NOSKILL, "weapons": DWARF_W},
    "duergar": {"skills": NOSKILL, "weapons": DWARF_W},
    "half-orc": {"languages": {"fixed": ["Common", "Orc"], "choose": 0}},
    "shadar-kai": {"asi": {"fixed": {"DEX": 2, "CON": 1}}},
    "sea-elf": {"weapons": ["Spear", "Trident", "Light crossbow", "Net"]},
    "hobgoblin": {"armor": ["Light armor"]},
    "khenra": {"weapons": ["Khopesh", "Spear", "Javelin"]},
    "merfolk": {"asi": {"fixed": {"CHA": 1}}, "skills": NOSKILL},
    "human": {"asi": {}, "skills": NOSKILL, "languages": {"fixed": ["Common"], "choose": 1}},
    "elf": {},
    "tiefling": {"asi": {"fixed": {"CHA": 2}}},
    "halfling": {},
    "gnome": {},
    "shifter": {"asi": {}},
    "lizardfolk": {"naturalAC": {"base": 13, "ability": "DEX"}, "skills": {"fixed": [], "choose": {"n": 2, "from": ["Animal Handling", "Nature", "Perception", "Stealth", "Survival"]}}},
    "autognome": {"naturalAC": {"base": 13, "ability": "DEX"}},
    "githyanki": {"skills": {"fixed": [], "choose": {"n": 1, "from": SKILLS}}, "languages": {"fixed": ["Common", "Gith"], "choose": 1}, "armor": ["Light armor", "Medium armor"], "weapons": ["Shortsword", "Longsword", "Greatsword"]},
    "warforged": {"skills": {"fixed": [], "choose": {"n": 1, "from": SKILLS}}},
    "half-elf": {"skills": {"fixed": [], "choose": {"n": 2, "from": SKILLS}}},
    "kender": {"skills": {"fixed": [], "choose": {"n": 1, "from": ["Insight", "Investigation", "Sleight of Hand", "Stealth", "Survival"]}}},
    "dhampir": {"skills": {"fixed": [], "choose": {"n": 2, "from": SKILLS}}},
    "hexblood": {"skills": {"fixed": [], "choose": {"n": 2, "from": SKILLS}}},
    "reborn": {"skills": {"fixed": [], "choose": {"n": 2, "from": SKILLS}}},
    "vedalken": {"skills": {"fixed": [], "choose": {"n": 1, "from": ["Arcana", "History", "Investigation", "Medicine", "Performance", "Sleight of Hand"]}}},
    "aarakocra": {"speed": {"walk": 25, "fly": 50}},
    "siren": {"speed": {"walk": 25, "fly": 30}},
    "grung": {"speed": {"walk": 25, "climb": 25}},
    "kor": {"speed": {"walk": 30, "climb": 30}},
    "verdan": {"size": "Small"},
    "simic-hybrid": {"languages": {"fixed": ["Common"], "choose": 1, "from": ["Elvish", "Vedalken"]}, "asi": {"fixed": {"CON": 2}, "choose": [{"count": 1, "amount": 1}]}},
    "kenku": {"languages": {"fixed": ["Common", "Auran"], "choose": 0}},
}

T = lambda n, t: {"name": n, "text": t}
ASI = lambda **kw: {"fixed": {k: v for k, v in kw.items()}}

SUBRACES = {
    "dragonborn": [
        {"name": "Standard Dragonborn", "asi": ASI(STR=2, CHA=1), "traits": [
            T("Damage Resistance", "You have resistance to the damage type associated with your draconic ancestry.")]},
        {"name": "Chromatic Dragonborn", "asi": {"flexible": True}, "traits": [
            T("Chromatic Ancestry", "You trace your ancestry to a chromatic dragon (black, blue, green, red or white), granting you a special magical affinity. This determines the damage type of your breath weapon and resistance.")]},
        {"name": "Draconblood", "asi": ASI(INT=2, CHA=1), "darkvision": 60, "traits": [
            T("Darkvision", "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light."),
            T("Forceful Presence", "When you make an Intimidation or Persuasion check, you can do so with advantage once per long rest.")]},
        {"name": "Ravenite", "asi": ASI(STR=2, CON=1), "darkvision": 60, "traits": [
            T("Darkvision", "You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light."),
            T("Vengeful Assault", "When you take damage from a creature in range of a weapon you are wielding, you can use your reaction to make an attack against that creature. You can do this once per short or long rest.")]},
    ],
    "dwarf": [
        {"name": "Hill Dwarf", "asi": ASI(WIS=1), "hpPerLevel": 1, "traits": [
            T("Dwarven Toughness", "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.")]},
        {"name": "Mountain Dwarf", "asi": ASI(STR=2), "armor": ["Light armor", "Medium armor"], "traits": [
            T("Dwarven Armor Training", "You have proficiency with light and medium armor.")]},
    ],
    "human": [
        {"name": "Standard Human", "asi": ASI(STR=1, DEX=1, CON=1, INT=1, WIS=1, CHA=1), "traits": []},
        {"name": "Variant Human", "asi": {"choose": [{"count": 2, "amount": 1}]}, "skills": {"fixed": [], "choose": {"n": 1, "from": SKILLS}}, "feat": 1, "traits": [
            T("Skills", "You gain proficiency in one skill of your choice."),
            T("Feat", "You gain one feat of your choice.")]},
    ],
    "elf": [
        {"name": "High Elf", "asi": ASI(INT=1), "languages": {"fixed": [], "choose": 1}, "cantrip": "Wizard", "weapons": ["Longsword", "Shortsword", "Shortbow", "Longbow"], "traits": [
            T("Cantrip", "You know one cantrip of your choice from the Wizard spell list. Intelligence is your spellcasting ability for it."),
            T("Elf Weapon Training", "You have proficiency with the longsword, shortsword, shortbow, and longbow."),
            T("Extra Language", "You can read, speak, and write one additional language of your choice.")]},
        {"name": "Wood Elf", "asi": ASI(WIS=1), "speed": {"walk": 35}, "weapons": ["Longsword", "Shortsword", "Shortbow", "Longbow"], "traits": [
            T("Elf Weapon Training", "You have proficiency with the longsword, shortsword, shortbow, and longbow."),
            T("Fleet of Foot", "Your base walking speed increases to 35 feet."),
            T("Mask of the Wild", "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.")]},
        {"name": "Dark Elf (Drow)", "asi": ASI(CHA=1), "darkvision": 120, "weapons": ["Rapier", "Shortsword", "Hand crossbow"], "traits": [
            T("Superior Darkvision", "Your darkvision has a range of 120 feet, instead of 60."),
            T("Sunlight Sensitivity", "You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of the attack, or whatever you are trying to perceive is in direct sunlight."),
            T("Drow Magic", "You know the Dancing Lights cantrip. At 3rd level you can cast Faerie Fire once per long rest; at 5th level you can also cast Darkness once per long rest. Charisma is your spellcasting ability for these spells."),
            T("Drow Weapon Training", "You have proficiency with rapiers, shortswords, and hand crossbows.")]},
        {"name": "Pallid Elf", "asi": ASI(WIS=1), "traits": [
            T("Incisive Sense", "You have advantage on Investigation and Insight checks."),
            T("Blessing of the Moonweaver", "You know the Light cantrip. At 3rd level you can cast Sleep once per long rest; at 5th level you can cast Invisibility (self only) once per long rest. No material components are required. Wisdom is your spellcasting ability for these spells.")]},
    ],
    "tiefling": [
        {"name": f"Bloodline of {n}", "asi": ASI(**{a: 1}), "traits": [T(t, d)]} for n, a, t, d in [
            ("Asmodeus", "INT", "Infernal Legacy", "You know the Thaumaturgy cantrip. At 3rd level you can cast Hellish Rebuke as a 2nd-level spell once per long rest; at 5th level you can also cast Darkness once per long rest. Charisma is your spellcasting ability for these spells."),
            ("Baalzebul", "INT", "Legacy of Maladomini", "You know the Thaumaturgy cantrip. At 3rd level you can cast Ray of Sickness as a 2nd-level spell once per long rest; at 5th level you can cast Crown of Madness once per long rest. Charisma is your spellcasting ability."),
            ("Dispater", "DEX", "Legacy of Dis", "You know the Thaumaturgy cantrip. At 3rd level you can cast Disguise Self once per long rest; at 5th level you can cast Detect Thoughts once per long rest. Charisma is your spellcasting ability."),
            ("Fierna", "WIS", "Legacy of Phlegethos", "You know the Friends cantrip. At 3rd level you can cast Charm Person as a 2nd-level spell once per long rest; at 5th level you can cast Suggestion once per long rest. Charisma is your spellcasting ability."),
            ("Glasya", "DEX", "Legacy of Malbolge", "You know the Minor Illusion cantrip. At 3rd level you can cast Disguise Self once per long rest; at 5th level you can cast Invisibility once per long rest. Charisma is your spellcasting ability."),
            ("Levistus", "CON", "Legacy of Stygia", "You know the Ray of Frost cantrip. At 3rd level you can cast Armor of Agathys as a 2nd-level spell once per long rest; at 5th level you can cast Darkness once per long rest. Charisma is your spellcasting ability."),
            ("Mammon", "INT", "Legacy of Minauros", "You know the Mage Hand cantrip. At 3rd level you can cast Tenser's Floating Disk once per short or long rest; at 5th level you can cast Arcane Lock (no material component) once per long rest. Charisma is your spellcasting ability."),
            ("Mephistopheles", "INT", "Legacy of Cania", "You know the Mage Hand cantrip. At 3rd level you can cast Burning Hands as a 2nd-level spell once per long rest; at 5th level you can cast Flame Blade once per long rest. Charisma is your spellcasting ability."),
            ("Zariel", "STR", "Legacy of Avernus", "You know the Thaumaturgy cantrip. At 3rd level you can cast Searing Smite as a 2nd-level spell once per long rest; at 5th level you can cast Branding Smite once per long rest. Charisma is your spellcasting ability."),
        ]
    ],
    "halfling": [
        {"name": "Lightfoot Halfling", "asi": ASI(CHA=1), "traits": [
            T("Naturally Stealthy", "You can attempt to hide even when you are only obscured by a creature that is at least one size larger than you.")]},
        {"name": "Stout Halfling", "asi": ASI(CON=1), "resistances": ["poison"], "traits": [
            T("Stout Resilience", "You have advantage on saving throws against poison, and you have resistance to poison damage.")]},
        {"name": "Ghostwise Halfling", "asi": ASI(WIS=1), "traits": [
            T("Silent Speech", "You can speak telepathically to any creature within 30 feet of you. The creature understands you only if the two of you share a language. You can speak telepathically to one creature at a time.")]},
        {"name": "Lotusden Halfling", "asi": ASI(WIS=1), "traits": [
            T("Children of the Woods", "You know the Druidcraft cantrip. At 3rd level you can cast Entangle once per long rest; at 5th level you can cast Spike Growth once per long rest. No material components are required. Wisdom is your spellcasting ability."),
            T("Timberwalk", "Ability checks made to track you are at disadvantage, and you can move through difficult terrain made of non-magical plants and overgrowth without expending extra movement.")]},
    ],
    "gnome": [
        {"name": "Rock Gnome", "asi": ASI(CON=1), "tools": ["Tinker's tools"], "traits": [
            T("Artificer's Lore", "Whenever you make an Intelligence (History) check related to magical, alchemical, or technological items, you can add twice your proficiency bonus instead of any other proficiency bonus that may apply."),
            T("Tinker", "You have proficiency with tinker's tools. Using them, you can spend 1 hour and 10 gp of materials to build a Tiny clockwork device (AC 5, 1 hp) that works for 24 hours: a Clockwork Toy, a Fire Starter, or a Music Box. You can have up to three such devices active at a time.")]},
        {"name": "Forest Gnome", "asi": ASI(DEX=1), "traits": [
            T("Natural Illusionist", "You know the Minor Illusion cantrip. Intelligence is your spellcasting ability for it."),
            T("Speak with Small Beasts", "Through sound and gestures, you can communicate simple ideas with Small or smaller beasts.")]},
    ],
    "shifter": [
        {"name": "Beasthide", "asi": ASI(CON=2), "skills": {"fixed": ["Athletics"]}, "traits": [
            T("Tough", "You have proficiency in the Athletics skill."),
            T("Shifting Feature", "Whenever you shift, you gain 1d6 additional temporary hit points, and while shifted you have a +1 bonus to your AC.")]},
        {"name": "Swiftstride", "asi": ASI(DEX=1, CHA=1), "speed": {"walk": 35}, "skills": {"fixed": ["Acrobatics"]}, "traits": [
            T("Graceful", "You have proficiency in the Acrobatics skill."),
            T("Swift Stride", "Your walking speed increases by 5 feet."),
            T("Shifting Feature", "While shifted, your walking speed increases by an additional 5 feet, and you can move up to 10 feet as a reaction when an enemy ends its turn within 5 feet of you, without provoking opportunity attacks.")]},
        {"name": "Longtooth", "asi": ASI(STR=2), "skills": {"fixed": ["Intimidation"]}, "traits": [
            T("Fierce", "You have proficiency in the Intimidation skill."),
            T("Shifting Feature", "While shifted, you can make an unarmed strike with your fangs as a bonus action, dealing 1d6 + Strength modifier piercing damage.")]},
        {"name": "Wildhunt", "asi": ASI(WIS=2, DEX=1), "skills": {"fixed": ["Survival"]}, "traits": [
            T("Natural Tracker", "You have proficiency in the Survival skill."),
            T("Shifting Feature", "While shifted, you have advantage on Wisdom checks, and no creature within 30 feet of you can make an attack roll with advantage against you unless you're incapacitated.")]},
    ],
    "merfolk": [
        {"name": "Green Merfolk", "asi": ASI(WIS=2), "cantrip": "Druid", "traits": [
            T("Mask of the Wild", "You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena."),
            T("Cantrip", "You know one cantrip of your choice from the Druid spell list. Wisdom is your spellcasting ability for it.")]},
        {"name": "Blue Merfolk", "asi": ASI(INT=2), "cantrip": "Wizard", "skills": {"fixed": ["History", "Nature"]}, "traits": [
            T("Lore of the Waters", "You gain proficiency in History and Nature."),
            T("Cantrip", "You know one cantrip of your choice from the Wizard spell list. Intelligence is your spellcasting ability for it.")]},
    ],
}

REVENANT = {
    "id": "revenant", "name": "Revenant",
    "description": "Having met a cruel and undeserved end, you have returned to the realm of the living, thirsting for revenge or seeking to complete a final, critical task. The revenant template can be applied on top of any race.",
    "asi": ASI(CON=1),
    "traits": [T("Relentless Nature", "Your DM assigns you a goal related to your death. Until you fulfil it: if you start your turn below half your hit point maximum you regain 1 hit point; if you die you return to life 24 hours later (re-forming within 1 mile if your body was destroyed); and you know the distance and direction to any creature involved in your goal while on the same plane.")],
}

# ---------------------------------------------------------------- parsing
LIG = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl", "\f": "", "’": "'"}
TRAIT = re.compile(r"^([A-Z][A-Za-z' /()\-]{1,45}?)\.\s+(.*)$")


def clean(s):
    for a, b in LIG.items():
        s = s.replace(a, b)
    return s


def page_lines(pdf, p):
    txt = subprocess.run(["pdftotext", "-f", str(p), "-l", str(p), pdf, "-"], capture_output=True, text=True).stdout
    out = []
    for l in clean(txt).splitlines():
        l = l.strip().lstrip("•■").strip()
        if l and l not in ("●", "○"):
            out.append(l)
    return out


def parse_page(lines):
    pre, traits, cur, seen_mech = [], [], None, False
    for l in lines:
        m = TRAIT.match(l)
        if m and len(m.group(1).split()) <= 6:
            name = m.group(1).strip()
            if name in ("Constitution modifier", "Dexterity modifier") and cur:
                cur["text"] += f" {name}. {m.group(2)}"
                continue
            if not seen_mech and name not in MECH and not traits:
                pre.append(l)  # sentence in the intro that looks like a trait
                continue
            seen_mech = True
            cur = {"name": name, "text": m.group(2).strip()}
            traits.append(cur)
        elif cur is None:
            pre.append(l)
        else:
            cur["text"] += " " + l
    for t in traits:
        t["text"] = re.sub(r"\s+", " ", t["text"]).strip()
    return " ".join(pre), traits


def describe(pre, name):
    s = re.sub(r"\s+", " ", pre).strip()
    i = s.find("Race Details")
    if 0 <= i < 60:
        s = s[i + len("Race Details"):]
    for tok in ["Heir of Hags", "Faded Memories", "Dhampir Hungers", "Glitchling Traits", "Hexblood Traits",
                "Reborn Traits", "Subtypes, Pick one!", "Common abilities", "Half-Elf Features", "Elf Features"]:
        s = s.replace(tok, " ")
    return re.sub(r"\s+", " ", s).strip()


def asi_from(text):
    t = text.lower()
    if re.search(r"increase one (ability )?score by 2", t):
        return {"flexible": True}
    fixed = {}
    for m in re.finditer(r"(strength|dexterity|constitution|intelligence|wisdom|charisma)((?:,? (?:and )?(?:your )?(?:strength|dexterity|constitution|intelligence|wisdom|charisma))*)(?: score| scores)?(?: each)? increases? by (\d)", t):
        names = [m.group(1)] + re.findall(r"(strength|dexterity|constitution|intelligence|wisdom|charisma)", m.group(2))
        for n in names:
            fixed[ABILS[n]] = int(m.group(3))
    res = {"fixed": fixed} if fixed else {}
    m = re.search(r"(one|two) other ability scores? of your choice (?:each )?increases? by 1|another ability score of your choice increases by 1", t)
    if m:
        res["choose"] = [{"count": 2 if m.group(1) == "two" else 1, "amount": 1}]
    return res


def speed_from(text):
    t = text.lower()
    sp = {}
    m = re.search(r"walking speed (?:is|of) (\d+)", t)
    if m: sp["walk"] = int(m.group(1))
    for kind, key in (("swim", "swim"), ("climb", "climb"), ("fly", "fly")):
        m = re.search(kind + r"(?:ming|ing)? speed (?:of )?(\d+)", t)
        if m: sp[key] = int(m.group(1))
        elif re.search(kind + r"(?:ming|ing)? speed equal to your walking speed", t) and "walk" in sp:
            sp[key] = sp["walk"]
    return sp


def skills_from(traits):
    fixed, choose = [], None
    for tr in traits:
        t = tr["text"]
        m = re.search(r"proficiency (?:in|with) (one|two) of the following skills(?: of your choice)?: ([^.]+)", t, re.I) or \
            re.search(r"proficient in your choice of (one|two) of the following skills: ([^.]+)", t, re.I)
        if m:
            opts = [s for s in SKILLS if s.lower() in m.group(2).lower()]
            choose = {"n": 1 if m.group(1).lower() == "one" else 2, "from": opts}
            continue
        m = re.search(r"proficien(?:cy|t) (?:in|with) (?:the )?([A-Z][A-Za-z ,]+?) (?:skills?|and)", t)
        for sent in re.findall(r"(?:proficiency in|proficient in|gain proficiency in) ([^.]+)", t):
            if "of your choice" in sent or "following" in sent:
                continue
            for s in SKILLS:
                if re.search(r"\b" + s + r"\b", sent) and s not in fixed:
                    fixed.append(s)
    return {"fixed": fixed, "choose": choose}


WORDS = {"one": 1, "two": 2}


def langs_from(text):
    fixed = [l for l in LANGS if re.search(r"\b" + l + r"\b", text)]
    fixed = ["Elvish" if l == "Elven" else l for l in fixed]
    fixed = list(dict.fromkeys(fixed))
    m = re.search(r"\b(one|two) (?:other|extra|additional)? ?languages?\b|\bone language of your choice", text)
    n = WORDS.get(m.group(1), 1) if m and m.groups() and m.group(1) else (1 if m else 0)
    return {"fixed": fixed, "choose": n}


def resist_from(traits):
    out = []
    for tr in traits:
        for m in re.finditer(r"resistance (?:to|against) ([a-z]+)(?:,? and ([a-z]+))? damage", tr["text"]):
            out += [g for g in m.groups() if g and g not in ("all", "the")]
    return list(dict.fromkeys(out))


def build(pdf):
    races = []
    for rid, name, dpages, tpages, extra in RACES:
        pre_all = []
        traits = []
        for p in dpages:
            pre, tr = parse_page(page_lines(pdf, p))
            pre_all.append(pre)
            if p in tpages:
                traits += tr
        for p in tpages:
            if p not in dpages:
                _, tr = parse_page(page_lines(pdf, p))
                traits += tr
        by = {t["name"]: t["text"] for t in traits}
        size_t = by.get("Size", "")
        size = "Medium or Small" if "Medium or Small" in size_t else ("Small" if re.search(r"\bsmall\b", size_t, re.I) and "Medium" not in size_t.split("Your size is")[-1] else "Medium")
        dv = 0
        for t in traits:
            if "Darkvision" in t["name"]:
                m = re.search(r"(\d+) feet", t["text"])
                dv = max(dv, int(m.group(1)) if m else 60)
        ctype = "Humanoid"
        ct = by.get("Creature Type") or by.get("Type") or ""
        m = re.search(r"You are an? ([A-Z][a-z]+)", ct)
        if m: ctype = m.group(1)
        r = {
            "id": rid, "name": name,
            "description": describe(" ".join(pre_all), name),
            "age": by.get("Age") or by.get("Life Span"),
            "size": size, "type": ctype,
            "speed": speed_from(by.get("Speed", "")) or {"walk": 30},
            "darkvision": dv,
            "asi": asi_from(by.get("Ability Score Increase", "")),
            "languages": langs_from(by.get("Languages", "Common")),
            "skills": skills_from(traits),
            "resistances": resist_from(traits),
            "traits": [],
        }
        for t in traits:
            if t["name"] in MECH or t["name"] in DROP:
                continue
            if t["name"] in MERGE and r["traits"]:
                r["traits"][-1]["text"] += f" {t['name']}: {t['text']}"
                continue
            r["traits"].append(t)
        if rid in DESC:
            r["description"] = DESC[rid]
        if "walk" not in r["speed"]:
            r["speed"]["walk"] = 30
        r.update(extra)
        r.pop("traitsFrom", None)
        for k, v in FIX.get(rid, {}).items():
            r[k] = v
        if rid in SUBRACES:
            r["subraces"] = SUBRACES[rid]
        races.append(r)
    races.append({**REVENANT, "template": True})
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(races, indent=1, ensure_ascii=False))
    print(f"wrote {len(races)} races to {OUT}")


if __name__ == "__main__":
    build(sys.argv[1])
