#!/usr/bin/env python3
"""Vérifie que tous les outils sont en place."""

import subprocess
import sys
import json
from pathlib import Path

OK   = "\033[32m OK  \033[0m"
STOP = "\033[31mSTOP \033[0m"
WARN = "\033[33mWARN \033[0m"

def check(label, ok, detail=""):
    status = OK if ok else STOP
    line = f"  [{status}] {label}"
    if detail:
        line += f"  —  {detail}"
    print(line)
    return ok

def cmd_version(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True)
        return r.stdout.strip() or r.stderr.strip().splitlines()[0]
    except FileNotFoundError:
        return None

def main():
    print("\n─── Diagnostic Claude Video Kit ───\n")
    errors = 0

    # ffmpeg
    v = cmd_version(["ffmpeg", "-version"])
    ok = v is not None
    check("ffmpeg", ok, v.splitlines()[0] if ok else "introuvable — brew/apt install ffmpeg")
    if not ok: errors += 1

    # python
    v = sys.version.split()[0]
    check("Python", True, v)

    # numpy
    try:
        import numpy as np
        check("numpy", True, np.__version__)
    except ImportError:
        check("numpy", False, "pip install numpy")
        errors += 1

    # scipy
    try:
        import scipy
        check("scipy", True, scipy.__version__)
    except ImportError:
        check("scipy", False, "pip install scipy")
        errors += 1

    # whisper
    try:
        import whisper
        check("whisper", True, "openai-whisper installé")
    except ImportError:
        check("whisper", False, "pip install openai-whisper")
        errors += 1

    # brand.json
    brand_path = Path(__file__).parent / "brand.json"
    if brand_path.exists():
        try:
            brand = json.loads(brand_path.read_text())
            check("brand.json", True, f"platform={brand.get('platform')} format={brand.get('format')}")
        except Exception as e:
            check("brand.json", False, f"JSON invalide : {e}")
            errors += 1
    else:
        check("brand.json", False, "fichier manquant")
        errors += 1

    print()
    if errors == 0:
        print("  Tout est en ordre. Lance :")
        print("  python pipeline/run.py ta_video.mp4\n")
    else:
        print(f"  {errors} problème(s) à régler avant de lancer le pipeline.\n")

if __name__ == "__main__":
    main()
