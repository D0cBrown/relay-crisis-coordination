"""Assemble the Relay demo video from the raw screen recording + per-scene voiceover.

Usage: python media/assemble_video.py "<raw recording>.mp4"
Output: media/relay-demo.mp4 (1080p30, H.264 + AAC) and media/relay-demo.srt (captions).

Each scene = a few segments of the raw recording (see docs/VIDEO_CUTLIST.md), scaled to fit
the scene's voiceover length (segments are shortened proportionally if too long, or the last
frame is held if too short), then muxed with its mp3. Scenes are concatenated at the end.
"""
import os, re, subprocess, sys, pathlib
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = sys.argv[1]
VO = ROOT / "media" / "voiceover"
BUILD = ROOT / "media" / "build"
BUILD.mkdir(parents=True, exist_ok=True)
TAIL = 0.6  # seconds of silence after each scene's speech

# (mp3, [(start_s, end_s, zoom)])  — timecodes from docs/VIDEO_CUTLIST.md
# Strictly chronological: no footage from later in the recording is shown before its time.
SCENES = [
    ("scene-1-the-problem.mp3", [(0, 10, False)]),
    # create incident -> join as Sam -> board (no agent panel yet)
    ("scene-2-the-idea.mp3", [(10, 24, False)]),
    # agent panel opens with the 6 tools -> prompt sent -> agent starts working / reads the board
    ("scene-3-the-agent-plugs-in.mp3", [(24, 31, False), (42, 51, False), (54, 70, False)]),
    # Review Panel with the 2 routine drafts -> medicine row escalated -> footbridge rejected (zoom)
    ("scene-4-bounded-agency-at-work.mp3", [(276, 288, False), (384, 396, False), (462, 474, True)]),
    # verbatim source -> Confirm 2 routine -> Confirm medicine -> ledger -> MATCHED cards
    ("scene-5-the-human-commits.mp3", [(652, 658, False), (666, 673, False), (674, 679, False), (686, 691, False), (697, 700, False)]),
    # reimbursement card with the injected message -> prompt -> answer (zoom)
    ("scene-6-the-attack-that-fails.mp3", [(552, 564, False), (570, 574, False), (600, 610, True)]),
    # final three-line answer with the server-verified agent actions visible -> landing
    ("scene-7-close.mp3", [(716, 728, False), (0, 4, False)]),
]

BASE_VF = "scale=1920:1032,pad=1920:1080:0:24:black,fps=30,format=yuv420p"
ZOOM_VF = "crop=1280:688:600:120," + BASE_VF  # 1.5x on the right-centre (ChatGPT panel)


def run(args):
    r = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args],
                       capture_output=True, text=True, errors="replace")
    if r.returncode != 0:
        raise SystemExit(f"ffmpeg failed: {' '.join(args)}\n{r.stderr[-2000:]}")


def duration(path):
    r = subprocess.run([FF, "-i", str(path)], capture_output=True, text=True, errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)


def script_scenes():
    """Voiceover text per scene, for captions (same parsing as make_voiceover.py)."""
    text = (ROOT / "docs" / "VIDEO_SCRIPT.md").read_text(encoding="utf-8").splitlines()
    cur, buf, out = None, [], []
    for line in text:
        m = re.match(r"\*\*(\d+:\d+) – (\d+:\d+) · (.+?)\*\*", line)
        if m:
            if cur: out.append(" ".join(buf))
            cur, buf = m.group(3), []
        elif line.startswith(">") and cur is not None:
            buf.append(line.lstrip("> ").strip())
        elif line.strip() == "---" and cur:
            out.append(" ".join(buf)); cur, buf = None, []
    if cur: out.append(" ".join(buf))
    cleaned = []
    for t in out:
        t = re.sub(r"\*\(.*?\)\*", "", t)
        t = t.strip().strip('"').replace('"', "")
        cleaned.append(re.sub(r"\s+", " ", t))
    return cleaned


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


scene_files, scene_lengths = [], []
for idx, (mp3, segs) in enumerate(SCENES, 1):
    audio = VO / mp3
    target = duration(audio) + TAIL
    total = sum(e - s for s, e, _ in segs)
    factor = min(1.0, target / total)
    parts = []
    for j, (s, e, zoom) in enumerate(segs):
        length = (e - s) * factor
        part = BUILD / f"s{idx}_{j}.mp4"
        run(["-ss", f"{s:.2f}", "-t", f"{length:.2f}", "-i", SRC,
             "-vf", ZOOM_VF if zoom else BASE_VF, "-an",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(part)])
        parts.append(part)
    lst = BUILD / f"s{idx}.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    joined = BUILD / f"s{idx}_v.mp4"
    run(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    vd = duration(joined)
    hold = max(0.0, target - vd + 0.2)
    final = BUILD / f"scene{idx}.mp4"
    run(["-i", str(joined), "-i", str(audio),
         "-filter_complex", f"[0:v]tpad=stop_mode=clone:stop_duration={hold:.2f}[v];[1:a]apad[a]",
         "-map", "[v]", "-map", "[a]", "-t", f"{target:.2f}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", str(final)])
    scene_files.append(final)
    scene_lengths.append(duration(final))
    print(f"scene {idx}: video {total:.0f}s x{factor:.2f} -> {scene_lengths[-1]:.1f}s (speech {target - TAIL:.1f}s)")

lst = BUILD / "all.txt"
lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in scene_files), encoding="utf-8")
out = ROOT / "media" / "relay-demo.mp4"
run(["-f", "concat", "-safe", "0", "-i", str(lst),
     "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(out)])

# captions: split each scene's text into ~2 chunks spread over the scene
texts = script_scenes()
srt, t0, n = [], 0.0, 1
for text, length in zip(texts, scene_lengths):
    words = text.split()
    chunks = [" ".join(words[i:i + 14]) for i in range(0, len(words), 14)]
    speech = length - TAIL
    per = speech / max(1, len(chunks))
    for k, chunk in enumerate(chunks):
        a, b = t0 + k * per, t0 + (k + 1) * per - 0.05
        srt.append(f"{n}\n{srt_time(a)} --> {srt_time(b)}\n{chunk}\n")
        n += 1
    t0 += length
(ROOT / "media" / "relay-demo.srt").write_text("\n".join(srt), encoding="utf-8")

print(f"\nFINAL: {out}  {duration(out):.1f}s  (limit 180s)")
print(f"captions: {ROOT / 'media' / 'relay-demo.srt'}")
