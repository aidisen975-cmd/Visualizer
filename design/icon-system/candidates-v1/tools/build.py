#!/usr/bin/env python3
"""ICON-001 candidate builder. Design-only; never touches product UI.

B tier: imports the user's handdrawn-icons skill (gen.py, read-only, unmodified)
        for wob/rr/circ/block/palette, then renders a 24px-tuned B variant.
C tier: the skill has no C tier (mono, 16px). fit-view is hand-authored to the
        real UI's 16px linear convention and is labelled as NOT skill-generated.
Run: python3 tools/build.py   (from candidates-v1/)
"""
import hashlib, importlib.util, json, os, re, shutil, sys, tempfile
from xml.dom import minidom

sys.dont_write_bytecode = True
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = os.path.abspath(os.path.join(ROOT, "..", "..", ".."))
SKILL = os.path.expanduser("~/.cursor/skills/handdrawn-icons")
GEN = os.path.join(SKILL, "assets", "gen.py")

# --- load skill gen.py in a scratch cwd so its own side effects (svg/, index.html) stay out of the repo
scratch = tempfile.mkdtemp()
shutil.copy(os.path.join(SKILL, "assets", "template.html"), scratch)
cwd = os.getcwd(); os.chdir(scratch)
spec = importlib.util.spec_from_file_location("skill_gen", GEN)
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
os.chdir(cwd); shutil.rmtree(scratch)
C, wob, rr, L, block = g.C, g.wob, g.rr, g.L, g.block

def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

# ---------------------------------------------------------------- B tier
SW_MAIN, SW_DETAIL = 6, 4.8   # 100-box units; =1.44px / 1.15px at 24px

def b_svg(name, blk, outline, detail):
    def paths(lst, w):
        o = []
        for p in lst:
            if p.startswith("__DASH__"):
                o.append(f'<path d="{p[8:]}" stroke-dasharray="7 6"/>')
            elif p.startswith("__DOT__"):
                x, y = p[7:].split()
                o.append(f'<circle cx="{x}" cy="{y}" r="3.4" fill="{C["ink"]}" stroke="none"/>')
            elif p.rstrip().endswith("Z"):  # hard rule: closed silhouettes are paper-filled
                o.append(f'<path d="{p}" fill="{C["canvas"]}"/>')
            else:
                o.append(f'<path d="{p}"/>')
        return "".join(o)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24"><title>{name}</title>'
            f'<g id="bg" opacity="0.95">{blk}</g>'
            f'<g id="outline" fill="none" stroke="{C["ink"]}" stroke-width="{SW_MAIN}" stroke-linecap="round" stroke-linejoin="round">{paths(outline, SW_MAIN)}</g>'
            f'<g id="detail" fill="none" stroke="{C["ink"]}" stroke-width="{SW_DETAIL}" stroke-linecap="round" stroke-linejoin="round">{paths(detail, SW_DETAIL)}</g></svg>')

B = {}
# series-style: card + solid/dashed curve pair (line-style semantics)
B["series-style"] = b_svg("series-style", block(46, 44, 34, 32, "blue", 301),
    [wob(rr(16, 18, 78, 74, 5), True, seed=302)],
    [wob([(26, 62), (38, 54), (50, 58), (68, 46)], seed=303, smooth=True),
     "__DOT__68 46",
     "__DASH__" + wob([(26, 40), (40, 32), (52, 38), (68, 28)], seed=304, smooth=True)])
# axes: card + L axes + ticks on both axes, no data curve
B["axes"] = b_svg("axes", block(10, 44, 34, 32, "sage", 311),
    [wob(rr(16, 18, 78, 74, 5), True, seed=312)],
    [L((29, 28), (29, 62), (66, 62), seed=313),
     L((29, 36), (38, 36), seed=314), L((29, 49), (38, 49), seed=315),
     L((44, 62), (44, 53), seed=316), L((57, 62), (57, 53), seed=317)])
# legend: card + three "line-with-marker + label bar" rows
B["legend"] = b_svg("legend", block(46, 10, 34, 32, "lav", 321),
    [wob(rr(16, 18, 78, 74, 5), True, seed=322)],
    [L((24, 32), (38, 32), seed=323), "__DOT__31 32", L((46, 32), (68, 32), seed=324),
     L((24, 46), (38, 46), seed=325), "__DOT__31 46", L((46, 46), (62, 46), seed=326),
     L((24, 60), (38, 60), seed=327), "__DOT__31 60", L((46, 60), (66, 60), seed=328)])
# layout: one large + two small floating windows, wide gaps for 24px
B["layout"] = b_svg("layout", block(48, 46, 36, 34, "apricot", 331),
    [wob(rr(14, 22, 50, 78, 4), True, seed=332),
     wob(rr(60, 22, 86, 45, 3), True, seed=333),
     wob(rr(60, 55, 86, 78, 3), True, seed=334)],
    [L((22, 34), (42, 34), seed=335)])

B_META = {
 "series-style": dict(label_zh="曲线样式", function="设置数据系列的线型、颜色、线宽（实线 + 虚线两条曲线）",
   usage="属性栏一级标题「数据系列」（含「样式」子节），24px 标题图标",
   ui_anchor="temperature_trajectory_visualizer.html: section(\"数据系列\") / section(\"样式\", key series.style)",
   duplicate_of=None, note="与 A 级 trajectory（L 轴+单曲线）区分：本图是卡片内两条不同线型曲线。"),
 "axes": dict(label_zh="坐标轴", function="X/Y 坐标轴及刻度设置（L 形轴 + 双向主刻度，无数据曲线）",
   usage="属性栏一级标题「X Axis」「Y Axis」（两处共用同一图标）",
   ui_anchor="buildAxisSection(): section(\"X Axis\") / section(\"Y Axis\")",
   duplicate_of=None, note="与 trajectory 区分：无数据曲线，两轴均有刻度。X/Y 共用一个图标是否合适需用户确认。"),
 "legend": dict(label_zh="图例", function="图例条目：线型标记 + 文字条，共三行",
   usage="属性栏一级标题「图例」",
   ui_anchor="section(\"图例\", key legend)",
   duplicate_of=None, note="与 dataset（表格网格）区分：行内含线段+圆点标记，无网格线。"),
 "layout": dict(label_zh="图窗布局", function="图窗位置与尺寸：一大两小窗口排列",
   usage="局部图属性栏一级标题「位置与尺寸」；主图仅有「图表」混合节，尚无同名一级标题",
   ui_anchor="section(\"位置与尺寸\", key place)（仅 detail 图）",
   duplicate_of=None, note="位置待用户确认：主图无独立“布局”一级标题。与 A 级 canvas 构图相近风险，已用分离窗口+大间距区分，需人工判断。"),
}

# ---------------------------------------------------------------- C tier
C_STROKE = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"'
C_SVG = {
 "fit-view": ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><title>fit-view</title>'
   f'<path d="M2.5 5.5v-3h3M10.5 2.5h3v3M13.5 10.5v3h-3M5.5 13.5h-3v-3" {C_STROKE}/>'
   f'<path d="M5.4 10.2l1.9-2.4 1.5 1.1 1.9-2.6" {C_STROKE}/></svg>'),
}
C_META = {
 "fit-view": dict(label_zh="适应窗口", function="让图窗内容适应可见区域（四角括号 + 内部曲线）；与 zoom-out（放大镜+减号）区分",
   usage="画布缩放栏「适应窗口」按钮（图标 + 文字）。「适应宽度」「100%」语义不同，本轮不配图标",
   ui_anchor="#tvZoomFit（现为纯文字按钮）",
   duplicate_of=None, note="Skill 无 C 级支持：按 Notion C 规范与现有 UI 16px 线性约定（viewBox 16, 1.4, round, currentColor）手写，非 Skill 产出。"),
}

# ---------------------------------------------------------------- write assets + validate
def validate(path, tier):
    txt = open(path, encoding="utf-8").read()
    minidom.parseString(txt)  # XML well-formed
    checks = {"xml": True, "no_external_ref": not re.search(r'(href|src|url)\s*[=(]\s*["\']?(https?:|//|file:)', txt)}
    if tier == "B":
        outline = re.search(r'<g id="outline".*?</g>', txt, re.S).group(0)
        closed = re.findall(r'<path d="[^"]*Z"( fill="[^"]*")?', outline)
        checks["closed_silhouettes_paper_filled"] = all('FAF8F5' in (c or '') for c in closed) and len(closed) > 0
        checks["pastel_only_in_bg"] = not re.search(r'(8BB9DD|EBA18B|A8C2A1|ADA3D7|EDCCBA)', outline + re.search(r'<g id="detail".*?</g>', txt, re.S).group(0))
        checks["no_filter_no_gradient"] = "filter" not in txt and "Gradient" not in txt
    else:
        checks["uses_currentColor"] = "currentColor" in txt and "#" not in txt
        checks["viewBox16"] = 'viewBox="0 0 16 16"' in txt
    return {k: bool(v) for k, v in checks.items()}

manifest_icons = []
gen_sha, skill_sha = sha(GEN), sha(os.path.join(SKILL, "SKILL.md"))
def add(tier, sid, svg, meta, source_skill, ver):
    d = os.path.join(ROOT, "icons", tier.lower()); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"{sid}.svg"); open(p, "w", encoding="utf-8").write(svg)
    rel = f"icons/{tier.lower()}/{sid}.svg"
    manifest_icons.append(dict(semantic_id=sid, tier=tier, label_zh=meta["label_zh"], svg_path=rel,
        function=meta["function"], usage=meta["usage"], ui_anchor=meta["ui_anchor"],
        source_skill=source_skill, source_skill_version=ver,
        status="PENDING_REVIEW", decision=None, duplicate_of=meta["duplicate_of"],
        validation=validate(p, tier), note=meta["note"],
        sizes_checked=[20, 24, 32] if tier == "B" else [16, 20]))
for k, v in B.items():
    add("B", k, v, B_META[k], "handdrawn-icons (helpers: wob/rr/circ/block/palette from gen.py; B variant renderer in tools/build.py)", f"gen.py sha256:{gen_sha[:12]} / SKILL.md sha256:{skill_sha[:12]}")
for k, v in C_SVG.items():
    add("C", k, v, C_META[k], "NONE — skill has no C tier; hand-authored to Notion C spec", "n/a")

NOT_GENERATED = [
 dict(semantic_id="region-select", tier="C", result="DUPLICATE_REUSE", reason="真实 UI 已有 16px 框选图标（虚线矩形，data-tool=range-select, 快捷键 M）。", ref="temperature_trajectory_visualizer.html L1662"),
 dict(semantic_id="readout-probe", tier="C", result="DUPLICATE_REUSE", reason="真实 UI 已有 16px 读数图标（十字+圆，data-tool=cursor, 快捷键 R）。", ref="temperature_trajectory_visualizer.html L1663"),
 dict(semantic_id="region-zoom", tier="C 条件", result="CANCELLED", reason="无独立工具；「放大到此范围」仅是框选后弹出的逐行菜单项（规划表：逐行菜单项不加图标）。", ref="temperature_trajectory_visualizer.html L3730"),
 dict(semantic_id="inset-region", tier="C 条件", result="CANCELLED", reason="「创建局部视图」同为框选后菜单项；局部图语义已由 A/B 级 inset 覆盖。", ref="L3730 / section(\"局部视图\")"),
 dict(semantic_id="layer-order", tier="C 条件", result="CANCELLED", reason="图层面板是上移/下移/置顶/置底四个文字按钮，单个图标无法区分四种动作，文字已足够；强行配图属于凑数。", ref="temperature_trajectory_visualizer.html L8151"),
 dict(semantic_id="grid-ticks", tier="B 条件", result="CANCELLED", reason="无独立网格/刻度一级模块：刻度在 X/Y Axis 的子节「轴线与刻度」内，且没有网格控件。", ref="buildAxisSection L6604-6608"),
 dict(semantic_id="typography", tier="B 条件", result="CANCELLED", reason="无独立「标题/字体」一级模块：「图标题」是「图表」下的子节，字体控件分散在各对象内。", ref="L7760 / L7957"),
]

manifest = dict(task="ICON-001", app_version_baseline="0.6.2", generated_by="tools/build.py",
    git_head=os.popen(f"git -C {REPO} rev-parse HEAD").read().strip(),
    skill_files=dict(skill_md_sha256=skill_sha, gen_py_sha256=gen_sha, modified=False),
    global_status="CANDIDATES_READY / PENDING_REVIEW",
    icons=manifest_icons, not_generated=NOT_GENERATED)
json.dump(manifest, open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# ---------------------------------------------------------------- gallery data
def rd(p): return open(p, encoding="utf-8").read()
A_DIR = os.path.join(REPO, "tmp", "handdrawn-icons", "svg")
A_REUSE = [("dataset", "数据区总标题「数据」"), ("trajectory", "图窗 / Dock 图窗项"), ("canvas", "属性栏「画布」/ Dock 画布项"),
           ("layers", "右栏「图层」页签"), ("inset", "属性栏「局部视图」"), ("annotation", "属性栏「标注与引导线」"),
           ("template", "「图表模板」入口"), ("project", "工程管理"), ("readout", "读数（预览标题，可选）")]
reuse = [dict(id=n, usage=u, svg=rd(os.path.join(A_DIR, n + ".svg"))) for n, u in A_REUSE if os.path.exists(os.path.join(A_DIR, n + ".svg"))]
html_src = rd(os.path.join(REPO, "temperature_trajectory_visualizer.html"))
existing_c = []
for tool, lab in [("pointer", "选择 V"), ("range-select", "框选 M"), ("cursor", "读数 R"), ("pan", "平移 H")]:
    m = re.search(r'data-tool="%s"[^>]*>(<svg.*?</svg>)' % tool, html_src, re.S)
    if m: existing_c.append(dict(id=tool, label=lab, svg=m.group(1)))

data = dict(icons=[dict(i, svg=rd(os.path.join(ROOT, i["svg_path"]))) for i in manifest_icons],
            reuse=reuse, existing_c=existing_c, not_generated=NOT_GENERATED)
tpl = rd(os.path.join(ROOT, "tools", "preview.template.html"))
out = tpl.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
open(os.path.join(ROOT, "preview.html"), "w", encoding="utf-8").write(out)
print("built", len(manifest_icons), "candidates;", len(reuse), "reuse refs;", len(existing_c), "existing C")
for i in manifest_icons: print(i["semantic_id"], i["validation"])
