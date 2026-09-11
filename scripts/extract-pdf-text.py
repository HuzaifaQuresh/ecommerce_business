"""Extract text from a PDF using only the Python standard library."""
from __future__ import annotations

import re
import sys
import zlib
from pathlib import Path


def decode_literal(s: bytes) -> str:
    out = []
    i = 0
    while i < len(s):
        if s[i] == 92 and i + 1 < len(s):  # backslash
            nxt = s[i + 1]
            mapping = {110: "\n", 114: "\r", 116: "\t", 98: "\b", 102: "\f"}
            if nxt in mapping:
                out.append(mapping[nxt])
                i += 2
                continue
            if nxt in (40, 41, 92):
                out.append(chr(nxt))
                i += 2
                continue
            octal = b""
            j = i + 1
            while j < len(s) and len(octal) < 3 and 48 <= s[j] <= 55:
                octal += bytes([s[j]])
                j += 1
            if octal:
                out.append(chr(int(octal, 8)))
                i = j
                continue
            i += 2
            continue
        if 32 <= s[i] < 127:
            out.append(chr(s[i]))
        elif s[i] in (9, 10, 13):
            out.append(" ")
        i += 1
    return "".join(out)


def strings_from_content(data: bytes) -> list[str]:
    texts: list[str] = []
    for m in re.finditer(rb"\((?:\\.|[^\\)])*\)\s*Tj", data):
        inner = m.group(0)[1 : m.group(0).rfind(b")")]
        texts.append(decode_literal(inner))
    for m in re.finditer(rb"\[(.*?)\]\s*TJ", data, re.S):
        chunk = m.group(1)
        parts = []
        for sm in re.finditer(rb"\((?:\\.|[^\\)])*\)", chunk):
            parts.append(decode_literal(sm.group(0)[1:-1]))
        if parts:
            texts.append("".join(parts))
    return texts


def inflate_streams(raw: bytes) -> list[bytes]:
    streams = []
    for m in re.finditer(rb"stream\r?\n(.*?)\r?\nendstream", raw, re.S):
        payload = m.group(1)
        try:
            streams.append(zlib.decompress(payload))
            continue
        except zlib.error:
            pass
        try:
            streams.append(zlib.decompress(payload, -15))
        except zlib.error:
            streams.append(payload)
    return streams


def main() -> None:
    pdf_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    raw = pdf_path.read_bytes()
    page_count = len(re.findall(rb"/Type\s*/Page[^s]", raw))
    print(f"file={pdf_path.name} size={pdf_path.stat().st_size} pages~{page_count}")

    parts: list[str] = []
    for idx, stream in enumerate(inflate_streams(raw), start=1):
        texts = strings_from_content(stream)
        if not texts:
            continue
        block = " ".join(t.strip() for t in texts if t.strip())
        if block:
            parts.append(f"\n===== STREAM {idx} =====\n{block}")

    out_path.write_text("\n".join(parts), encoding="utf-8", errors="replace")
    print(f"wrote {out_path} chars={out_path.stat().st_size} streams_with_text={len(parts)}")


if __name__ == "__main__":
    main()
