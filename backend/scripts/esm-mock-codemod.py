#!/usr/bin/env python3
"""Convert jest.mock() specs to the ESM form.

`jest.mock()` works by hoisting above the imports and swapping the module in the registry before
the importer grabs it. ESM has no such window: bindings are resolved when the graph is linked, so
the mock must be registered with `jest.unstable_mockModule()` and everything that could observe it
pulled in afterwards with a dynamic `await import()`.

Which static imports have to become dynamic: anything mocked in this file (obviously) and anything
belonging to the project (relative or aliased), since those are what transitively reach a mocked
module. Third-party imports stay static unless mocked, and `import type` stays static always —
types are erased before any of this matters.
"""

import pathlib
import re
import sys

ALIAS_PREFIXES = ("@src/", "@config/", "@constants/", "@context/", "@db/", "@graphql/",
                  "@helpers/", "@jwt/", "@middleware/", "@root/")

IMPORT_LINE = re.compile(
    r"^import\s+(?P<clause>(?:type\s+)?[^'\"]+?)\s+from\s+['\"](?P<spec>[^'\"]+)['\"]\s*$",
    re.MULTILINE,
)
MOCK_CALL = re.compile(r"jest\.(?:mock|doMock)\(\s*['\"](?P<spec>[^'\"]+)['\"]")
# first top-level test hook — everything that must run after the mocks goes above it
FIRST_HOOK = re.compile(r"^(?:describe|it|test|beforeAll|beforeEach|afterAll|afterEach)\s*\(",
                        re.MULTILINE)


def is_project(spec: str) -> bool:
    return spec.startswith(".") or spec.startswith(ALIAS_PREFIXES)


def to_destructuring(clause: str) -> str | None:
    """`X, { a, b as c }` -> `{ default: X, a, b: c }`; None when it cannot be expressed."""
    clause = clause.strip()
    if clause.startswith("* as "):
        return clause  # handled by the caller as a plain binding
    default_name = None
    named_part = None
    if clause.startswith("{"):
        named_part = clause
    elif "," in clause:
        head, _, tail = clause.partition(",")
        default_name = head.strip()
        named_part = tail.strip()
    else:
        default_name = clause
    fields = []
    if default_name:
        fields.append(f"default: {default_name}")
    if named_part:
        inner = named_part.strip().lstrip("{").rstrip("}").strip()
        for piece in filter(None, (p.strip() for p in inner.split(","))):
            if " as " in piece:
                original, _, alias = piece.partition(" as ")
                fields.append(f"{original.strip()}: {alias.strip()}")
            else:
                fields.append(piece)
    if not fields:
        return None
    return "{ " + ", ".join(fields) + " }"


def convert(path: pathlib.Path) -> bool:
    text = path.read_text()
    if "jest.mock(" not in text and "jest.doMock(" not in text:
        return False

    mocked = set(MOCK_CALL.findall(text))
    text = text.replace("jest.mock(", "jest.unstable_mockModule(")
    text = text.replace("jest.doMock(", "jest.unstable_mockModule(")

    moved = []
    def strip_import(match):
        clause, spec = match.group("clause"), match.group("spec")
        if clause.startswith("type "):
            return match.group(0)
        if spec == "@jest/globals":
            return match.group(0)
        if spec not in mocked and not is_project(spec):
            return match.group(0)
        if clause.strip().startswith("* as "):
            binding = clause.strip()[len("* as "):].strip()
            moved.append(f"const {binding} = await import('{spec}')")
        else:
            destructured = to_destructuring(clause)
            if destructured is None:
                return match.group(0)
            moved.append(f"const {destructured} = await import('{spec}')")
        return "\x00DROP\x00"

    text = IMPORT_LINE.sub(strip_import, text)
    text = re.sub(r"\x00DROP\x00\n?", "", text)

    if not moved:
        path.write_text(text)
        return True

    block = ("\n// Imported after the mock registrations, not above them: `unstable_mockModule`\n"
             "// does not hoist, so a static import would bind the real module first.\n"
             + "\n".join(moved) + "\n\n")

    hook = FIRST_HOOK.search(text)
    if not hook:
        print(f"  !! {path}: kein Top-Level-Hook gefunden, Block ans Ende", file=sys.stderr)
        text += block
    else:
        text = text[: hook.start()] + block.lstrip("\n") + text[hook.start():]

    path.write_text(text)
    return True


targets = [pathlib.Path(p) for p in sys.argv[1:]]
changed = sum(1 for t in targets if convert(t))
print(f"{changed} Dateien konvertiert")
