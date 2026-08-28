"""Build the store zip. Ships only what the extension needs at runtime."""
import json, zipfile, pathlib
ROOT = pathlib.Path(__file__).parent
version = json.loads((ROOT / "manifest.json").read_text())["version"]
SHIP = ["manifest.json", "viewer.html", "popup.html"]
SHIP_DIRS = ["icons"]
SHIP_SRC = ["src/xml.js", "src/features.js", "src/tree.js", "src/detect.js", "src/viewer.js", "src/popup.js"]
out = ROOT / "build" / f"xml-viewer-v{version}.zip"
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in SHIP + SHIP_SRC:
        z.write(ROOT / f, f)
    for d in SHIP_DIRS:
        for p in sorted((ROOT / d).rglob("*")):
            if p.is_file():
                z.write(p, str(p.relative_to(ROOT)))
print(out, out.stat().st_size, "bytes")
