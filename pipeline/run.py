#!/usr/bin/env python3
"""
Claude Video Kit — pipeline gratuit (Whisper + Remotion + ffmpeg)
Usage: python run.py <video.mp4> [--broll <broll.mp4>] [--notif]
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from difflib import SequenceMatcher
from pathlib import Path


def load_brand():
    path = Path(__file__).parent / "brand.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


REPO_ROOT   = Path(__file__).parent.parent
REMOTION_DIR = REPO_ROOT / "reel-instagram"
PUBLIC_DIR   = REMOTION_DIR / "public"


# ─── Audio ────────────────────────────────────────────────────────────────────

def extract_audio(video_path, out_path):
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path,
         "-ac", "1", "-ar", "16000", "-vn", out_path],
        check=True, capture_output=True,
    )


def get_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_format", path],
        capture_output=True, text=True, check=True,
    )
    return float(json.loads(r.stdout)["format"]["duration"])


def detect_silences(audio_path, threshold_db, min_dur):
    r = subprocess.run(
        ["ffmpeg", "-i", audio_path,
         "-af", f"silencedetect=noise={threshold_db}dB:d={min_dur}",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    silences, start = [], None
    for line in r.stderr.splitlines():
        if "silence_start" in line:
            start = float(line.split("silence_start: ")[1].split()[0])
        elif "silence_end" in line and start is not None:
            end = float(line.split("silence_end: ")[1].split("|")[0].strip())
            silences.append((start, end))
            start = None
    return silences


# ─── Transcription ─────────────────────────────────────────────────────────────

def transcribe(audio_path, brand):
    import whisper
    cfg   = brand.get("transcription", {})
    model = whisper.load_model(cfg.get("model", "base"))
    opts  = {"word_timestamps": True}
    if lang := cfg.get("language"):
        opts["language"] = lang
    return model.transcribe(audio_path, **opts)


def flatten_words(segments):
    return [
        w for seg in segments
        for w in seg.get("words", [])
        if w.get("start") is not None and w.get("end") is not None
    ]


# ─── Reprises ─────────────────────────────────────────────────────────────────

def detect_retakes(segments, similarity, window):
    words = flatten_words(segments)
    if len(words) < window * 2:
        return []
    to_remove, i = [], 0
    while i < len(words) - window:
        ref = " ".join(w["word"].strip().lower() for w in words[i:i + window])
        best_j, best_r = None, 0.0
        for j in range(i + window, len(words) - window + 1):
            cand = " ".join(w["word"].strip().lower() for w in words[j:j + window])
            r = SequenceMatcher(None, ref, cand).ratio()
            if r >= similarity and r > best_r:
                best_r, best_j = r, j
        if best_j is not None:
            to_remove.append((words[i]["start"], words[best_j]["start"]))
            i = best_j
        else:
            i += 1
    return to_remove


# ─── Découpe ──────────────────────────────────────────────────────────────────

def merge_intervals(intervals):
    merged = []
    for s, e in sorted(intervals):
        if merged and s < merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [tuple(x) for x in merged]


def to_keep(total, to_remove):
    keeps, cursor = [], 0.0
    for s, e in sorted(to_remove):
        if s > cursor + 0.05:
            keeps.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < total - 0.05:
        keeps.append((cursor, total))
    return keeps


def apply_cuts(video_path, keeps, out_path, tmpdir):
    if not keeps:
        shutil.copy(video_path, out_path)
        return
    segments = []
    for i, (s, e) in enumerate(keeps):
        seg = os.path.join(tmpdir, f"seg_{i:04d}.mp4")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(s), "-i", video_path,
             "-t", str(e - s), "-c", "copy", seg],
            check=True, capture_output=True,
        )
        segments.append(seg)
    concat = os.path.join(tmpdir, "concat.txt")
    with open(concat, "w") as f:
        for seg in segments:
            f.write(f"file '{seg}'\n")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
         "-i", concat, "-c", "copy", out_path],
        check=True, capture_output=True,
    )


def adjust_words(all_words, keeps):
    adjusted, offset = [], 0.0
    for keep_start, keep_end in keeps:
        for w in all_words:
            if keep_start <= w["start"] < keep_end:
                adjusted.append({
                    "word":  w["word"],
                    "start": round(w["start"] - keep_start + offset, 4),
                    "end":   round(min(w["end"], keep_end) - keep_start + offset, 4),
                })
        offset += keep_end - keep_start
    return adjusted


# ─── Son de notification ──────────────────────────────────────────────────────

def generate_notif_sound(out_path):
    """Génère un petit 'pop' discret avec ffmpeg."""
    subprocess.run(
        ["ffmpeg", "-y",
         "-f", "lavfi",
         "-i", "sine=frequency=1200:duration=0.12",
         "-af", "afade=t=out:st=0.07:d=0.05,volume=0.4",
         "-ar", "44100",
         out_path],
        check=True, capture_output=True,
    )


# ─── Remotion render ──────────────────────────────────────────────────────────

def render_with_remotion(duration_sec, words, brand, out_path, use_notif):
    sub    = brand.get("subtitles", {})
    fps    = 30
    props  = {
        "videoFile":        "input.mp4",
        "brollFile":        "broll.mp4",
        "words":            words,
        "durationInFrames": max(1, round(duration_sec * fps)),
        "accentColor":      sub.get("color_accent", "#f59e0b"),
        "primaryColor":     sub.get("color_primary", "white") if sub.get("color_primary", "white") != "white" else "#ffffff",
        "fontSize":         sub.get("font_size", 56),
        "wordsPerLine":     sub.get("words_per_line", 5),
        "notifFile":        "notif.wav",
        "useNotif":         use_notif,
    }

    subprocess.run(
        ["npx", "remotion", "render", "VideoKit",
         str(Path(out_path).resolve()),
         f"--props={json.dumps(props)}"],
        cwd=str(REMOTION_DIR),
        check=True,
    )


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Claude Video Kit")
    parser.add_argument("video", help="Vidéo brute (rush)")
    parser.add_argument("--broll", help="Vidéo B-roll pour la moitié haute", default=None)
    parser.add_argument("--notif", action="store_true", help="Activer les sons de notification")
    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"Fichier introuvable : {args.video}")
        sys.exit(1)

    brand   = load_brand()
    d_cfg   = brand.get("derush", {})
    stem    = Path(args.video).stem
    out_path = str(Path(args.video).parent / f"{stem}_final.mp4")
    tmpdir  = tempfile.mkdtemp(prefix="kit_")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    try:
        print("1/6  Extraction audio…")
        audio_path = os.path.join(tmpdir, "audio.wav")
        extract_audio(args.video, audio_path)

        print("2/6  Transcription (Whisper)…")
        result    = transcribe(audio_path, brand)
        segments  = result.get("segments", [])
        all_words = flatten_words(segments)
        print(f"     {len(all_words)} mots transcrits")

        print("3/6  Détection silences et reprises…")
        silences = detect_silences(
            audio_path,
            d_cfg.get("silence_threshold_db", -35),
            d_cfg.get("min_silence_duration_sec", 0.6),
        )
        retakes = detect_retakes(
            segments,
            d_cfg.get("retake_similarity", 0.75),
            d_cfg.get("retake_window_words", 6),
        )
        to_remove = []
        for s, e in silences:
            if e - s > 0.7:
                to_remove.append((s, e - 0.1))
        to_remove.extend(retakes)
        to_remove = merge_intervals(to_remove)

        total = get_duration(args.video)
        keeps = to_keep(total, to_remove)
        print(f"     {len(silences)} silences, {len(retakes)} reprises → {len(keeps)} segments conservés")

        print("4/6  Découpe vidéo…")
        derush_path = os.path.join(tmpdir, "derush.mp4")
        apply_cuts(args.video, keeps, derush_path, tmpdir)
        adjusted = adjust_words(all_words, keeps)
        duration_derush = get_duration(derush_path)

        print("5/6  Préparation assets Remotion…")
        shutil.copy(derush_path, PUBLIC_DIR / "input.mp4")

        if args.broll and os.path.exists(args.broll):
            shutil.copy(args.broll, PUBLIC_DIR / "broll.mp4")
            print(f"     B-roll : {args.broll}")
        else:
            # Pas de B-roll : on duplique la vidéo elle-même en haut
            shutil.copy(derush_path, PUBLIC_DIR / "broll.mp4")
            print("     Pas de B-roll fourni — la vidéo sera dupliquée en haut")

        if args.notif:
            generate_notif_sound(str(PUBLIC_DIR / "notif.wav"))
            print("     Son de notification généré")

        print("6/6  Rendu Remotion (split screen + animations)…")
        render_with_remotion(duration_derush, adjusted, brand, out_path, args.notif)

        print(f"\nFait ✓  →  {out_path}")

    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode() if e.stderr else ""
        print(f"\nErreur :\n{stderr or e}")
        sys.exit(1)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
