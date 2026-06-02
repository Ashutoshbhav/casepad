import re, sys, pathlib

SRC = pathlib.Path(__file__).parent

def clean(vtt_text: str) -> str:
    lines = vtt_text.splitlines()
    out = []
    for ln in lines:
        if ln.strip() == "" or ln.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        # timestamp lines like 00:00:01.000 --> 00:00:03.000
        if "-->" in ln:
            continue
        # inline timing/position tags
        ln = re.sub(r"<\d{2}:\d{2}:\d{2}\.\d{3}>", "", ln)
        ln = re.sub(r"</?c>", "", ln)
        ln = re.sub(r"<[^>]+>", "", ln)
        ln = ln.strip()
        if not ln:
            continue
        # dedupe consecutive identical lines (rolling-caption repeats)
        if out and out[-1] == ln:
            continue
        out.append(ln)
    # second pass: collapse the rolling-window overlap where each cue repeats
    # the prior cue's tail. Keep a line only if it isn't fully contained in the
    # previously kept line.
    deduped = []
    for ln in out:
        if deduped and (ln in deduped[-1] or deduped[-1].endswith(ln)):
            continue
        deduped.append(ln)
    text = " ".join(deduped)
    text = re.sub(r"\s+", " ", text).strip()
    return text

for vtt in sorted(SRC.glob("*.en.vtt")):
    vid = vtt.name.split(".")[0]
    txt = clean(vtt.read_text(encoding="utf-8", errors="ignore"))
    out = SRC / f"{vid}.clean.txt"
    out.write_text(txt, encoding="utf-8")
    print(f"{vid}: {len(txt)} chars -> {out.name}")
