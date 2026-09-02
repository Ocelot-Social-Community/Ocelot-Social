#!/usr/bin/env python3
"""One-shot codemod: give every intra-project module specifier the explicit extension that
Node's ESM resolver requires. Relative specifiers and TypeScript path aliases alike, in
`from '…'`, `import('…')`, `export … from '…'` and jest module-mocking calls.

Bare package specifiers are left alone (the `exports` map resolves those), as are `.gql`
(handled by a loader) and `.json` (needs an import attribute, done by hand).

Resolution mirrors what tsc will check: `<spec>.ts` wins over `<spec>/index.ts`, and a
specifier resolving to neither is reported rather than guessed at.
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIRS = ["src", "test"]

# tsconfig `paths`, mirrored. `@root/*` maps to the package root, the rest into src/.
ALIASES = {
    "@config/": "src/config/",
    "@constants/": "src/constants/",
    "@context/": "src/context/",
    "@db/": "src/db/",
    "@graphql/": "src/graphql/",
    "@helpers/": "src/helpers/",
    "@jwt/": "src/jwt/",
    "@middleware/": "src/middleware/",
    "@src/": "src/",
    "@root/": "",
}

# `from '…'`, `import('…')`, `require('…')`, jest.mock('…'), jest.unstable_mockModule('…')
SPECIFIER = re.compile(
    r"""(?P<prefix>(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|"""
    r"""\bjest\.(?:mock|unstable_mockModule|doMock|requireActual|requireMock)\s*\(\s*))"""
    r"""(?P<quote>['"])(?P<spec>[^'"]+)(?P=quote)"""
)

SKIP_SUFFIXES = (".js", ".mjs", ".cjs", ".json", ".gql", ".css")

unresolved = []
changed_files = 0
changed_specs = 0


def target_for(spec: str, file_path: str):
    """Absolute path the specifier points at, or None for a bare package specifier."""
    if spec.startswith("."):
        return os.path.normpath(os.path.join(os.path.dirname(file_path), spec))
    for alias, replacement in ALIASES.items():
        if spec.startswith(alias):
            return os.path.normpath(os.path.join(ROOT, replacement + spec[len(alias):]))
    return None


def extended(spec: str, file_path: str):
    """The specifier with an explicit extension, or the original when nothing applies."""
    if spec.endswith(SKIP_SUFFIXES):
        return spec
    target = target_for(spec, file_path)
    if target is None:
        return spec
    if os.path.isfile(target + ".ts") or os.path.isfile(target + ".tsx"):
        return spec + ".js"
    if os.path.isfile(os.path.join(target, "index.ts")):
        return spec.rstrip("/") + "/index.js"
    if os.path.isfile(target + ".json"):
        return spec  # import attribute needed; handled separately
    unresolved.append((os.path.relpath(file_path, ROOT), spec))
    return spec


def process(file_path: str):
    global changed_files, changed_specs
    with open(file_path, encoding="utf-8") as handle:
        source = handle.read()

    hits = [0]

    def replace(match):
        spec = match.group("spec")
        new_spec = extended(spec, file_path)
        if new_spec == spec:
            return match.group(0)
        hits[0] += 1
        return f"{match.group('prefix')}{match.group('quote')}{new_spec}{match.group('quote')}"

    updated = SPECIFIER.sub(replace, source)
    if hits[0]:
        with open(file_path, "w", encoding="utf-8") as handle:
            handle.write(updated)
        changed_files += 1
        changed_specs += hits[0]


for directory in SRC_DIRS:
    for current, _dirs, files in os.walk(os.path.join(ROOT, directory)):
        for name in files:
            if name.endswith((".ts", ".tsx")) and not name.endswith(".d.ts"):
                process(os.path.join(current, name))

print(f"{changed_specs} specifiers rewritten in {changed_files} files")
if unresolved:
    print(f"\n{len(unresolved)} unresolved (left untouched, need a look):", file=sys.stderr)
    for file_name, spec in unresolved[:40]:
        print(f"  {file_name}: {spec}", file=sys.stderr)
