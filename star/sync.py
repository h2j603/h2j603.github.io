#!/usr/bin/env python3
"""essay.md(문장 단위) → index.html의 P 배열. 실행: python3 star/sync.py (배포본 public/★/index.html에 씀)"""
import re, pathlib
HERE = pathlib.Path(__file__).resolve().parent
md = (HERE / "essay.md").read_text(encoding="utf-8")
paras = []
for block in re.split(r"^## ¶\d+\s*$", md, flags=re.M)[1:]:
    sents = [re.sub(r"^\d+-\d+\s+", "", l).strip() for l in block.strip().splitlines() if re.match(r"^\d+-\d+\s", l)]
    paras.append(" ".join(sents))
html_path = HERE.parent / "public" / "★" / "index.html"
html = html_path.read_text(encoding="utf-8")
arr = "const P = [\n" + ",\n".join("`" + p.replace("`", "'") + "`" for p in paras) + "\n];"
new, n = re.subn(r"const P = \[\n.*?\n\];", lambda m: arr, html, count=1, flags=re.S)
assert n == 1, "P 배열을 못 찾음"
html_path.write_text(new, encoding="utf-8")
print(f"{len(paras)} 문단 반영")
