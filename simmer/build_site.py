"""Wrap app/simmer.html in a full HTML document for GitHub Pages: python build_site.py"""

from pathlib import Path

HERE = Path(__file__).parent
HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<meta name="description" content="Simmer: a personal feed of your own day.">'
    "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
    "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>\n"
)

body = (HERE / "app" / "simmer.html").read_text(encoding="utf-8")
(HERE / "site").mkdir(exist_ok=True)
(HERE / "site" / "index.html").write_text(HEAD + body + "\n</body></html>\n", encoding="utf-8")
print("wrote site/index.html")
