#!/usr/bin/env python3
"""Extract Divi 5 module attribute schemas from the theme's visual-builder source.

Unlike extract-attr-paths.py (which mines real page exports and only sees
attributes that pages happen to use), this reads the authoritative
module.json definitions shipped inside the Divi theme itself:

  <theme>/includes/builder-5/visual-builder/packages/module-library/src/components/<module>/module.json

Usage:
  python3 extract-module-schema.py "/path/to/wp-content/themes/Divi" [out.md]

Default output: references/module-schema-reference.md (relative to this script's skill).

Path semantics in the output:
  - `key.innerContent`            — content payload (text/url/etc.; subnames listed when declared)
  - `key.advanced.<option>`       — behavioural options (explicit attrName/subName pairs listed)
  - `key.decoration.<group>`      — standard design groups (font, spacing, border, ...)
  - `module.meta.adminLabel`      — universal admin label

These are attribute *paths that exist*; value shapes still follow the usual
Divi 5 breakpoint envelope: {"desktop": {"value": ...}}.
"""
import json
import re
import sys
from pathlib import Path


def collect_attr_pairs(obj, pairs):
    """All explicit attrName/subName pairs anywhere in the file."""
    if isinstance(obj, dict):
        if "attrName" in obj and isinstance(obj["attrName"], str):
            pairs.add((obj["attrName"], obj.get("subName") or ""))
        for v in obj.values():
            collect_attr_pairs(v, pairs)
    elif isinstance(obj, list):
        for v in obj:
            collect_attr_pairs(v, pairs)


def module_entry(data):
    name = data.get("name", "?")
    attrs = data.get("attributes", {}) or {}
    pairs = set()
    collect_attr_pairs(data, pairs)

    paths = {}  # path -> sorted set of subnames
    def add(path, sub=""):
        paths.setdefault(path, set())
        if sub:
            paths[path].add(sub)

    for key, spec in attrs.items():
        settings = spec.get("settings", {}) if isinstance(spec, dict) else {}
        if not isinstance(settings, dict):
            settings = {}
        if "innerContent" in settings:
            add(f"{key}.innerContent")
        for branch in ("advanced", "decoration"):
            sub = settings.get(branch)
            if isinstance(sub, dict):
                for opt in sub:
                    add(f"{key}.{branch}.{opt}")
        if "meta" in settings:
            add(f"{key}.meta.adminLabel")

    for attr_name, sub in pairs:
        add(attr_name, sub)

    return {
        "name": name,
        "d4Shortcode": data.get("d4Shortcode", ""),
        "moduleClassName": data.get("moduleClassName", ""),
        "title": data.get("title", ""),
        "childrenName": data.get("childrenName") or [],
        "customCssFields": sorted((data.get("customCssFields") or {}).keys()),
        "paths": {p: sorted(s) for p, s in sorted(paths.items())},
    }


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    theme = Path(sys.argv[1])
    components = theme / "includes/builder-5/visual-builder/packages/module-library/src/components"
    if not components.is_dir():
        sys.exit(f"Not found: {components}")

    version = ""
    style = theme / "style.css"
    if style.exists():
        m = re.search(r"^Version:\s*(\S+)", style.read_text(errors="ignore"), re.M)
        version = m.group(1) if m else ""

    entries = []
    for mj in sorted(components.glob("*/module.json")):
        try:
            entries.append(module_entry(json.loads(mj.read_text())))
        except Exception as e:  # noqa: BLE001 — report and continue
            print(f"WARN {mj.parent.name}: {e}", file=sys.stderr)

    out = Path(sys.argv[2]) if len(sys.argv) > 2 else (
        Path(__file__).resolve().parent.parent / "references/module-schema-reference.md"
    )

    lines = [
        "# Divi 5 Module Schema Reference (from theme source)",
        "",
        f"Auto-generated from `module.json` definitions in the Divi theme "
        f"(**Divi {version or 'unknown'}**, {len(entries)} modules). "
        "This is the authoritative attribute-path source — it lists every path that exists, "
        "whereas `module-attribute-cheatsheet.md` (export-derived) shows real-world value shapes "
        "for the paths pages actually use. Use both: existence from here, value shape from the "
        "cheat sheet or a real export.",
        "",
        "Regenerate: `python3 scripts/extract-module-schema.py \"/path/to/themes/Divi\"`",
        "",
        "Value shapes follow the standard breakpoint envelope: "
        '`{"desktop": {"value": ...}}` unless a real export shows otherwise. '
        "`→ sub` marks declared sub-keys of a path.",
        "",
    ]
    for e in entries:
        lines.append(f"## {e['name']}")
        meta = [f"class `{e['moduleClassName']}`"]
        if e["d4Shortcode"]:
            meta.append(f"d4 `{e['d4Shortcode']}`")
        if e["childrenName"]:
            meta.append("children: " + ", ".join(f"`{c}`" for c in e["childrenName"]))
        lines.append("*" + " · ".join(meta) + "*")
        lines.append("")
        for p, subs in e["paths"].items():
            lines.append(f"- `{p}`" + (f" → {', '.join(subs)}" if subs else ""))
        if e["customCssFields"]:
            lines.append(f"- customCssFields: {', '.join(e['customCssFields'])}")
        lines.append("")

    out.write_text("\n".join(lines))
    print(f"Wrote {out} ({len(entries)} modules, Divi {version})")


if __name__ == "__main__":
    main()
