"""Generate per-scene voiceover MP3s from docs/VIDEO_SCRIPT.md using edge-tts (free neural voices).
Usage: python media/make_voiceover.py [voice] [rate]
"""
import asyncio, re, sys, pathlib
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "docs" / "VIDEO_SCRIPT.md"
OUT = ROOT / "media" / "voiceover"
VOICE = sys.argv[1] if len(sys.argv) > 1 else "en-US-AndrewMultilingualNeural"
RATE = sys.argv[2] if len(sys.argv) > 2 else "-4%"

def scenes():
    cur, buf, out = None, [], []
    for line in SCRIPT.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\*\*(\d+:\d+) – (\d+:\d+) · (.+?)\*\*", line)
        if m:
            if cur: out.append((cur, " ".join(buf)))
            cur, buf = m.group(3), []
        elif line.startswith(">") and cur is not None:
            buf.append(line.lstrip("> ").strip())
        elif line.strip() == "---" and cur:
            out.append((cur, " ".join(buf))); cur, buf = None, []
    if cur: out.append((cur, " ".join(buf)))
    cleaned = []
    for title, text in out:
        text = re.sub(r"\*\(.*?\)\*", "", text)            # stage directions
        text = text.strip().strip('"').replace('"', '').replace(" — ", ", ").replace("—", ",")
        text = re.sub(r"\s+", " ", text)
        cleaned.append((title, text))
    return cleaned

async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for i, (title, text) in enumerate(scenes(), 1):
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        path = OUT / f"scene-{i}-{slug}.mp3"
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(path))
        print(f"{path.name}  ({len(text)} chars)")
        print("    " + text[:110] + ("..." if len(text) > 110 else ""))

asyncio.run(main())

