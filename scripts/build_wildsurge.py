#!/usr/bin/env python3
"""Merge the wild surge tables in data-src/wildSurge into src/data/wildsurge.json."""
import csv, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data-src/wildSurge"
def load(fn, delim):
    rows = list(csv.reader(open(D / fn, encoding="utf8"), delimiter=delim))
    head, body = rows[0], [r for r in rows[1:] if r]
    out = []
    for r in body:
        n = int(r[0]) if r[0].strip().isdigit() else len(out) + 1
        out.append({"n": 100 if n == 0 else n, "cells": [c.strip() for c in r[1:]]})
    return head[1:], sorted(out, key=lambda x: x["n"])
tables = []
for tid, name, fn, delim, note in [
    ("phb", "Player's Handbook (d100)", "wildSurgeClassic.tsv", "\t", "The classic Wild Magic Surge table."),
    ("ua", "Unearthed Arcana (d100)", "unheartArcana.csv", ",", "Alternative surges from Unearthed Arcana."),
    ("threeway", "Three-way severity (d20 + d100)", "surgeTablethreeway.csv", "|", "Roll a d20 for severity (1-3 Extreme, 4-9 Moderate, 10-20 Nuisance), then a d100."),
]:
    cols, rows = load(fn, delim)
    tables.append({"id": tid, "name": name, "note": note, "columns": cols, "rows": rows})
(ROOT / "src/data/wildsurge.json").write_text(json.dumps(tables, ensure_ascii=False, indent=0))
print([ (t["id"], len(t["rows"]), t["columns"]) for t in tables])
