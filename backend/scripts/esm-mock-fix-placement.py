#!/usr/bin/env python3
"""Move the dynamic-import block emitted by esm-mock-codemod.py to the right place.

The first cut put it before the first test hook, which is too late: specs routinely derive
top-level constants from an imported binding (`const mockStat = stat as jest.Mock`), and those
lines end up above the import. The only real constraint is that the import runs AFTER the last
`jest.unstable_mockModule()` registration — so that is where it belongs, as early as possible.
"""

import pathlib
import re
import sys

MARKER = "// Imported after the mock registrations, not above them: `unstable_mockModule`\n"
BLOCK = re.compile(
    r"// Imported after the mock registrations, not above them: `unstable_mockModule`\n"
    r"// does not hoist, so a static import would bind the real module first\.\n"
    r"(?:const .*= await import\('[^']*'\)\n)+"
)


def end_of_last_mock(text: str) -> int | None:
    """Index just past the last `jest.unstable_mockModule(...)` statement."""
    last = text.rfind("jest.unstable_mockModule(")
    if last == -1:
        return None
    i = text.index("(", last)
    depth = 0
    while i < len(text):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    end = text.find("\n", i)
    return len(text) if end == -1 else end + 1


fixed = 0
for path in map(pathlib.Path, sys.argv[1:]):
    text = path.read_text()
    match = BLOCK.search(text)
    if not match:
        continue
    block = match.group(0)
    without = text[: match.start()] + text[match.end():]
    without = re.sub(r"\n{3,}", "\n\n", without)
    insert_at = end_of_last_mock(without)
    if insert_at is None:
        print(f"  !! {path}: keine unstable_mockModule-Registrierung gefunden", file=sys.stderr)
        continue
    path.write_text(without[:insert_at] + "\n" + block + without[insert_at:])
    fixed += 1

print(f"{fixed} Dateien: Import-Block neu platziert")
