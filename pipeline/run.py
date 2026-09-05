#!/usr/bin/env python3
"""
Claude Video Kit — pipeline gratuit (Whisper + ffmpeg)
Usage: python run.py <video.mp4>
"""

import json
import os
import sys
import subprocess
import tempfile
import shutil
from pathlib import Path
from difflib import SequenceMatcher


def load_brand():
    path = Path(__file__).parent / "brand.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


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
    silences = []
    start = None
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
    cfg = brand.get("transcription", {})
    model = whisper.load_model(cfg.get("model", "base"))
    opts = {"word_timestamps": True}
    lang = cfg.get("language")
    if lang:
        opts["language"] = lang
    return model.transcribe(audio_path, **opts)


def flatten_words(segments):
    words = []
    for seg in segments:
        for w in seg.get("words", []):
            if w.get("start") is not None and w.get("end") is not None:
                words.append(w)
    return words


# ─── Reprise detection ────────────────────────────────────────────────────────

def detect_retakes(segments, similarity, window):
    """
    Détecte les reprises : séquences de mots répétées.
    Quand une phrase apparaît plusieurs fois, garde la dernière occurrence.
    Retourne une liste de (start, end) à supprimer.
    """
    words = flatten_words(segments)
    if len(words) < window * 2:
        return []

    to_remove = []
    i = 0
    while i < len(words) - window:
        ref = " ".join(w["word"].strip().lower() for w in words[i:i + window])
        best_j = None
        best_r = 0.0
        for j in range(i + window, len(words) - window + 1):
            cand = " ".join(w["word"].strip().lower() for w in words[j:j + window])
            r = SequenceMatcher(None, ref, cand).ratio()
            if r >= similarity and r > best_r:
                best_r = r
                best_j = j
        if best_j is not None:
            to_remove.append((words[i]["start"], words[best_j]["start"]))
            i = best_j
        else:
            i += 1

    return to_remove


# ─── Cuts ─────────────────────────────────────────────────────────────────────

def merge_intervals(intervals):
    merged = []
    for s, e in sorted(intervals):
        if merged and s < merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [tuple(x) for x in merged]


def to_keep(total_duration, to_remove):
    keeps = []
    cursor = 0.0
    for s, e in sorted(to_remove):
        if s > cursor + 0.05:
            keeps.append((cursor, s))
        cursor = max(cursor, e)
    if cursor < total_duration - 0.05:
        keeps.append((cursor, total_duration))
    return keeps


def apply_cuts(video_path, keeps, out_path, tmpdir):
    if not keeps:
        shutil.copy(video_path, out_path)
        return

    segments = []
    for i, (s, e) in enumerate(keeps):
        seg = os.path.join(tmpdir, f"seg_{i:04d}.mp4")
        subprocess.run(
            ["ffmpeg", "-y",
             "-ss", str(s), "-i", video_path,
             "-t", str(e - s),
             "-c", "copy", seg],
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


# ─── Sous-titres ──────────────────────────────────────────────────────────────

def hex_to_ass(color):
    if color.startswith("#"):
        r, g, b = color[1:3], color[3:5], color[5:7]
        return f"&H00{b}{g}{r}&"
    return {"white": "&H00FFFFFF&", "black": "&H00000000&"}.get(color, "&H00FFFFFF&")


def adjust_words(all_words, keeps):
    """Recale les timestamps des mots après découpe."""
    adjusted = []
    offset = 0.0
    for keep_start, keep_end in keeps:
        seg_words = [w for w in all_words if keep_start <= w["start"] < keep_end]
        for w in seg_words:
            adjusted.append({
                "word": w["word"],
                "start": w["start"] - keep_start + offset,
                "end":   min(w["end"], keep_end) - keep_start + offset,
            })
        offset += keep_end - keep_start
    return adjusted


def build_ass(words, brand):
    sub = brand.get("subtitles", {})
    font        = sub.get("font", "Arial")
    font_size   = sub.get("font_size", 20)
    primary     = hex_to_ass(sub.get("color_primary", "white"))
    accent      = hex_to_ass(sub.get("color_accent", "#f59e0b"))
    position    = sub.get("position", "bottom")
    per_line    = sub.get("words_per_line", 4)

    align   = 2 if position == "bottom" else 8 if position == "top" else 5
    marginv = 60 if position == "bottom" else 40

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 1

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{font_size},{primary},&H000000FF&,&H00000000&,&H80000000&,-1,0,0,0,100,100,0,0,1,3,1,{align},30,30,{marginv},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def fmt_time(t):
        h = int(t // 3600)
        m = int((t % 3600) // 60)
        s = t % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    # Regroupe les mots par lignes
    lines = [words[i:i + per_line] for i in range(0, len(words), per_line)]
    events = []
    for line in lines:
        for active, aw in enumerate(line):
            parts = []
            for idx, w in enumerate(line):
                txt = w["word"].strip()
                if idx == active:
                    parts.append(f"{{\\c{accent}}}{txt}{{\\c{primary}}}")
                else:
                    parts.append(txt)
            text = " ".join(parts)
            events.append(
                f"Dialogue: 0,{fmt_time(aw['start'])},{fmt_time(aw['end'])},"
                f"Default,,0,0,0,,{text}"
            )

    return header + "\n".join(events) + "\n"


# ─── Assemblage final ─────────────────────────────────────────────────────────

def assemble(derush_path, ass_path, out_path, brand):
    fmt    = brand.get("format", "vertical")
    lufs   = brand.get("audio", {}).get("target_lufs", -14)

    if fmt == "vertical":
        scale = "1080:1920"
        pad   = "1080:1920:(ow-iw)/2:(oh-ih)/2"
    else:
        scale = "1920:1080"
        pad   = "1920:1080:(ow-iw)/2:(oh-ih)/2"

    # Escape path for ASS filter (backslash on Windows, colon needs escaping)
    ass_escaped = ass_path.replace("\\", "/").replace(":", "\\:")

    vf = ",".join([
        f"scale={scale}:force_original_aspect_ratio=decrease",
        f"pad={pad}",
        f"ass={ass_escaped}",
    ])
    af = f"loudnorm=I={lufs}:TP=-1.5:LRA=11"

    subprocess.run(
        ["ffmpeg", "-y", "-i", derush_path,
         "-vf", vf, "-af", af,
         "-c:v", "libx264", "-crf", "18", "-preset", "fast",
         "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart",
         out_path],
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

    brand    = load_brand()
    d_cfg    = brand.get("derush", {})
    out_path = Path(video_path).stem + "_final.mp4"
    tmpdir   = tempfile.mkdtemp(prefix="kit_")

    try:
        print("1/5  Extraction audio…")
        audio_path = os.path.join(tmpdir, "audio.wav")
        extract_audio(video_path, audio_path)

        print("2/5  Transcription (Whisper)…")
        result   = transcribe(audio_path, brand)
        segments = result.get("segments", [])
        all_words = flatten_words(segments)
        print(f"     {len(all_words)} mots transcrits")

        print("3/5  Détection silences et reprises…")
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

        print("4/5  Découpe vidéo…")
        derush_path = os.path.join(tmpdir, "derush.mp4")
        apply_cuts(video_path, keeps, derush_path, tmpdir)

        print("5/5  Sous-titres + normalisation audio…")
        adjusted  = adjust_words(all_words, keeps)
        ass_path  = os.path.join(tmpdir, "subtitles.ass")
        with open(ass_path, "w", encoding="utf-8") as f:
            f.write(build_ass(adjusted, brand))

        assemble(derush_path, ass_path, out_path, brand)

        print(f"\nFait ✓  →  {out_path}")

    except subprocess.CalledProcessError as e:
        print(f"\nErreur ffmpeg :\n{e.stderr.decode() if e.stderr else e}")
        sys.exit(1)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
