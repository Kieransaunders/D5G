#!/usr/bin/env python3
"""Scan all Individual Section reference packs and collect, per module type,
every distinct top-level attribute KEY PATH seen (not values) so we can build
a real attribute-path cheat sheet instead of guessing.
"""
import json, re, glob, collections

DIR = "/Users/boss/.claude/plugins/cache/divi5generate/divi5generate/1.6.2/skills/divi5-page-generator/references/Divi design system JSON/Individual Sections/By Section Type"

# module -> set of dotted key paths (leaf-terminated at first non-dict or at 'desktop'/'hover'/'tablet'/'phone')
paths_by_module = collections.defaultdict(collections.Counter)

BREAKPOINTS = {"desktop", "hover", "tablet", "phone", "phoneWide", "tabletWide", "value"}

def walk(prefix, obj, module):
    if isinstance(obj, dict):
        # stop recursing once we hit a breakpoint/value wrapper - record path up to here
        keys = set(obj.keys())
        if keys & BREAKPOINTS:
            paths_by_module[module][prefix] += 1
            return
        for k, v in obj.items():
            walk(prefix + "." + k if prefix else k, v, module)
    # lists/leaves: nothing further

pattern = re.compile(r'wp:divi/([a-z0-9-]+) (\{.*?\}) /-->')

files = glob.glob(DIR + "/*.json")
print(f"Scanning {len(files)} files...")
total_blocks = 0
for fp in files:
    try:
        raw = open(fp, encoding="utf-8").read()
    except Exception as e:
        print("skip", fp, e)
        continue
    # data is JSON with post_content as an escaped string; find via json load then regex on content
    try:
        doc = json.loads(raw)
    except Exception as e:
        print("json fail", fp, e)
        continue
    data = doc.get("data", {})
    for postid, post in data.items():
        content = post.get("post_content", "")
        for m in pattern.finditer(content):
            module = m.group(1)
            attrs_str = m.group(2)
            try:
                attrs = json.loads(attrs_str)
            except Exception:
                continue
            total_blocks += 1
            for top_key, val in attrs.items():
                if top_key in ("builderVersion", "modulePreset", "groupPreset", "customAttrs"):
                    continue
                walk(top_key, val, module)

print(f"Total blocks parsed: {total_blocks}")
print(f"Module types found: {len(paths_by_module)}")

out = {}
for module, counter in sorted(paths_by_module.items()):
    out[module] = [p for p, c in counter.most_common()]

with open("/private/tmp/claude-501/-Volumes-External-Divi5Generate/f0a5bd7a-c378-4c0a-b4e4-483bed7e9f36/scratchpad/attr-paths.json", "w") as f:
    json.dump(out, f, indent=2)

print("Wrote attr-paths.json")
