#!/usr/bin/env python3
"""Convert data-src/feats.csv (Name|Description) to src/data/feats.json, fixing glued sentences."""
import csv, json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
rows = list(csv.reader(open(ROOT / "data-src/feats.csv", encoding="utf8"), delimiter="|"))[1:]
out = []
for name, desc in rows:
    desc = re.sub(r"([a-z0-9.:;)!])([A-Z])", r"\1 \2", desc).replace("  ", " ")
    body = desc[len("Source: "):] if desc.startswith("Source: ") else desc
    src, pre, rest = "", "", body
    starts = r" (?=You |Your |Skilled |When |As |Through |Thanks |Having |Whether |Choose |Increase |Prerequisite:|Some |Living |Training |Experience |With |In |Because |Blessed |Practice )"
    if desc.startswith("Source: "):
        m = re.search(starts, body)
        if m and m.start() < 90:
            src, rest = body[:m.start()].strip(), body[m.end():].strip()
    if rest.startswith("Prerequisite:"):
        m = re.search(r" (?=You |Your |When |As |Through |Thanks |Having |Whether |Choose |Increase )", rest)
        if m:
            pre, rest = rest[len("Prerequisite:"):m.start()].strip(), rest[m.end():].strip()
    title = " ".join(w.upper() if w == "ua" else w.capitalize() for w in name.split("-"))
    title = title.replace(" Ua", " (UA)").replace(" UA", " (UA)")
    out.append({"name": title, "source": src, "prerequisite": pre, "text": rest})
out.sort(key=lambda f: f["name"])
(ROOT / "src/data/feats.json").write_text(json.dumps(out, indent=0, ensure_ascii=False))
print(len(out), "feats")
