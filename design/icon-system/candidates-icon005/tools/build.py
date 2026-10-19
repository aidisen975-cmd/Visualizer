#!/usr/bin/env python3
"""ICON-005 isolated L1 candidates. Not approved. Does not touch product UI."""
import hashlib, importlib.util, json, os, shutil, sys, tempfile
from xml.dom import minidom

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILL = os.path.expanduser("~/.cursor/skills/handdrawn-icons")
GEN = os.path.join(SKILL, "assets", "gen.py")

scratch = tempfile.mkdtemp()
shutil.copy(os.path.join(SKILL, "assets", "template.html"), scratch)
cwd = os.getcwd()
os.chdir(scratch)
spec = importlib.util.spec_from_file_location("skill_gen", GEN)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
os.chdir(cwd)
shutil.rmtree(scratch)
C, wob, rr, L, block = g.C, g.wob, g.rr, g.L, g.block

SW_MAIN, SW_DETAIL = 6, 4.8

def b_svg(name, blk, outline, detail):
    def paths(lst):
        o = []
        for p in lst:
            if p.startswith("__DASH__"):
                o.append(f'<path d="{p[8:]}" stroke-dasharray="7 6"/>')
            elif p.startswith("__DOT__"):
                x, y = p[7:].split()
                o.append(f'<circle cx="{x}" cy="{y}" r="3.4" fill="{C["ink"]}" stroke="none"/>')
            elif p.rstrip().endswith("Z"):
                o.append(f'<path d="{p}" fill="{C["canvas"]}"/>')
            else:
                o.append(f'<path d="{p}"/>')
        return "".join(o)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24"><title>{name}</title>'
            f'<g id="bg" opacity="0.95">{blk}</g>'
            f'<g id="outline" fill="none" stroke="{C["ink"]}" stroke-width="{SW_MAIN}" stroke-linecap="round" stroke-linejoin="round">{paths(outline)}</g>'
            f'<g id="detail" fill="none" stroke="{C["ink"]}" stroke-width="{SW_DETAIL}" stroke-linecap="round" stroke-linejoin="round">{paths(detail)}</g></svg>')

B = {
    "figure-title": b_svg("figure-title", block(48, 14, 34, 28, "apricot", 401),
        [wob(rr(16, 18, 78, 74, 5), True, seed=402)],
        [L((26, 34), (66, 34), seed=403), L((26, 48), (58, 48), seed=404), L((26, 60), (46, 60), seed=405)]),
    "frame": b_svg("frame", block(14, 46, 30, 28, "sage", 411),
        [wob(rr(22, 24, 74, 72, 4), True, seed=412)],
        [L((30, 36), (66, 36), seed=413), L((30, 36), (30, 62), seed=414), L((58, 62), (66, 62), seed=415)]),
    "export-settings": b_svg("export-settings", block(46, 48, 34, 28, "blue", 421),
        [wob(rr(16, 28, 78, 74, 5), True, seed=422)],
        [L((47, 58), (47, 36), seed=423), L((38, 44), (47, 34), seed=424), L((56, 44), (47, 34), seed=425)]),
    "range": b_svg("range", block(48, 16, 32, 26, "lav", 431),
        [wob(rr(16, 22, 78, 74, 5), True, seed=432)],
        [L((28, 58), (68, 58), seed=433), L((28, 50), (28, 66), seed=434), L((68, 50), (68, 66), seed=435)]),
    "source-link": b_svg("source-link", block(16, 18, 28, 24, "coral", 441),
        [wob(rr(18, 22, 46, 48, 4), True, seed=442), wob(rr(56, 50, 80, 74, 4), True, seed=443)],
        [L((42, 40), (60, 56), seed=444)]),
}

META = {
    "figure-title": "图标题。卡片里三条长短不同的文字线，没有图例圆点。",
    "frame": "背景与尺寸。一个窗口加角上的尺寸线，不是 layout 的一大两小。",
    "export-settings": "导出设置。页面里一支向上的箭头。",
    "range": "范围与缩放。一条轴和两端括号，不是已批准的 axes。",
    "source-link": "来源框与引导线。两个框和一条连线，不是 inset 的放大窗口。",
}

icon_dir = os.path.join(ROOT, "icons")
os.makedirs(icon_dir, exist_ok=True)
manifest = []
for name, svg in B.items():
    path = os.path.join(icon_dir, name + ".svg")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(svg)
    minidom.parse(path)
    text = open(path, encoding="utf-8").read()
    if "https://" in text or "currentColor" in text:
        raise SystemExit(name + " is not an offline hand-drawn candidate")
    manifest.append({
        "semantic_id": name,
        "status": "PENDING_REVIEW",
        "tier": "B",
        "display_px": 28,
        "note": META[name],
        "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
    })

with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as handle:
    json.dump({"status": "PENDING_REVIEW", "approved": False, "icons": manifest}, handle, ensure_ascii=False, indent=2)

cards = []
for name in B:
    cards.append(f'<figure><img src="icons/{name}.svg" width="28" height="28" alt=""><figcaption>{name}<br>{META[name]}</figcaption></figure>')
preview = """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>ICON-005 candidates</title>
<style>body{margin:24px;background:#f6f2ea;font:14px/1.4 "Songti SC",serif}h1{font-size:18px}.row{display:flex;gap:16px;flex-wrap:wrap}figure{margin:0;padding:12px;background:#fff;border:1px solid #ddd4c6;border-radius:10px;width:180px}img{background:#faf8f5;border-radius:7px}</style>
</head><body><h1>待审批，未接入 Visualizer</h1><div class="row">""" + "".join(cards) + "</div></body></html>"
with open(os.path.join(ROOT, "preview.html"), "w", encoding="utf-8") as handle:
    handle.write(preview)
print("pending", len(manifest))
