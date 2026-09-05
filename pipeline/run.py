#!/usr/bin/env python3
"""
Claude Video Kit — pipeline gratuit (Whisper + Remotion + ffmpeg)
Usage: python run.py <video.mp4>
"""

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


REPO_ROOT    = Path(__file__).parent.parent
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
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", path],
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


# ─── Transcription ────────────────────────────────────────────────────────────

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


# ─── Détection reprises ───────────────────────────────────────────────────────

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


# ─── Sons ─────────────────────────────────────────────────────────────────────

def generate_sounds():
    """Génère pop.wav et whoosh.wav dans public/."""
    pop_path    = PUBLIC_DIR / "pop.wav"
    whoosh_path = PUBLIC_DIR / "whoosh.wav"

    # Pop : courte impulsion sinusoïdale à 1100 Hz
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi",
         "-i", "sine=frequency=1100:duration=0.08",
         "-af", "afade=t=out:st=0.04:d=0.04,volume=0.5",
         "-ar", "44100", str(pop_path)],
        check=True, capture_output=True,
    )

    # Whoosh : bruit blanc filtré passe-haut, fondu rapide
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi",
         "-i", "anoisesrc=color=white:duration=0.35",
         "-af", (
             "highpass=f=800,"
             "lowpass=f=5000,"
             "afade=t=in:st=0:d=0.05,"
             "afade=t=out:st=0.25:d=0.1,"
             "volume=0.35"
         ),
         "-ar", "44100", str(whoosh_path)],
        check=True, capture_output=True,
    )


# ─── Remotion render ──────────────────────────────────────────────────────────

def render_with_remotion(duration_sec, words, brand, out_path):
    sub  = brand.get("subtitles", {})
    fps  = 30
    props = {
        "videoFile":        "input.mp4",
        "words":            words,
        "durationInFrames": max(1, round(duration_sec * fps)),
        "accentColor":      sub.get("color_accent", "#E02020"),
        "primaryColor":     sub.get("color_primary", "#111111"),
        "bgColor":          brand.get("bg_color", "#ffffff"),
        "style":            brand.get("style", "light"),
        "fontSize":         sub.get("font_size", 62),
        "wordsPerLine":     sub.get("words_per_line", 4),
        "popSoundFile":     "pop.wav",
        "whooshSoundFile":  "whoosh.wav",
        "useSounds":        True,
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
    if len(sys.argv) < 2:
        print("Usage: python run.py <video.mp4>")
        sys.exit(1)

    video_path = sys.argv[1]
    if not os.path.exists(video_path):
        print(f"Fichier introuvable : {video_path}")
        sys.exit(1)

    brand  = load_brand()
    d_cfg  = brand.get("derush", {})
    stem   = Path(video_path).stem
    out_path = str(Path(video_path).parent / f"{stem}_final.mp4")
    tmpdir = tempfile.mkdtemp(prefix="kit_")

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    try:
        print("1/6  Extraction audio…")
        audio_path = os.path.join(tmpdir, "audio.wav")
        extract_audio(video_path, audio_path)

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

        total = get_duration(video_path)
        keeps = to_keep(total, to_remove)
        print(f"     {len(silences)} silences, {len(retakes)} reprises → {len(keeps)} segments conservés")

        print("4/6  Découpe vidéo…")
        derush_path = os.path.join(tmpdir, "derush.mp4")
        apply_cuts(video_path, keeps, derush_path, tmpdir)
        adjusted        = adjust_words(all_words, keeps)
        duration_derush = get_duration(derush_path)

        print("5/6  Génération sons + préparation assets…")
        shutil.copy(derush_path, PUBLIC_DIR / "input.mp4")
        generate_sounds()

        print("6/6  Rendu Remotion (animations + sons + charte)…")
        render_with_remotion(duration_derush, adjusted, brand, out_path)

        print(f"\nFait ✓  →  {out_path}")

    except subprocess.CalledProcessError as e:
        stderr = e.stderr.decode() if e.stderr else ""
        print(f"\nErreur :\n{stderr or e}")
        sys.exit(1)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
