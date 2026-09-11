"""Extract JPEG streams from a PDF using a linear scan (no catastrophic regex)."""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> None:
    pdf_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    raw = pdf_path.read_bytes()
    print(f"loaded {len(raw)} bytes", flush=True)

    jpeg_count = 0
    stream_count = 0
    pos = 0
    marker = b"stream"
    while True:
        idx = raw.find(marker, pos)
        if idx < 0:
            break
        start = idx + len(marker)
        if start < len(raw) and raw[start : start + 2] == b"\r\n":
            start += 2
        elif start < len(raw) and raw[start : start + 1] == b"\n":
            start += 1
        end = raw.find(b"endstream", start)
        if end < 0:
            break
        payload = raw[start:end]
        if payload.endswith(b"\r\n"):
            payload = payload[:-2]
        elif payload.endswith(b"\n"):
            payload = payload[:-1]
        stream_count += 1
        if payload.startswith(b"\xff\xd8\xff"):
            jpeg_count += 1
            dest = out_dir / f"img-{jpeg_count:03d}.jpg"
            dest.write_bytes(payload)
            if jpeg_count <= 12 or jpeg_count % 15 == 0:
                print(f"jpeg {jpeg_count}: {dest.name} {len(payload)} bytes", flush=True)
        pos = end + 9
        if stream_count % 300 == 0:
            print(f"scanned {stream_count} streams, jpegs={jpeg_count}", flush=True)

    print(f"done streams={stream_count} jpegs={jpeg_count}", flush=True)


if __name__ == "__main__":
    main()
