"""Inspect image XObject filters in a PDF."""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

raw = Path(sys.argv[1]).read_bytes()
print("size", len(raw))

filters = Counter(re.findall(rb"/Filter\s*/([A-Za-z]+)", raw))
print("filters", {k.decode(): v for k, v in filters.most_common()})

subtypes = Counter(re.findall(rb"/Subtype\s*/([A-Za-z]+)", raw))
print("subtypes", {k.decode(): v for k, v in subtypes.most_common(20)})

# sample a few image dictionaries
img_hits = [m.start() for m in re.finditer(rb"/Subtype\s*/Image", raw)]
print("image xobjects", len(img_hits))
for start in img_hits[:8]:
    snippet = raw[max(0, start - 400) : start + 400]
    print("---")
    print(snippet.decode("latin-1", errors="replace")[:500])
