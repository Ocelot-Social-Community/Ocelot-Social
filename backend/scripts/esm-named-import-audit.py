#!/usr/bin/env python3
"""Find every `import { … } from '<package>'` whose named bindings Node's ESM loader cannot
actually provide.

TypeScript type-checks named imports against the package's .d.ts, but at runtime Node derives
named exports from a CommonJS module by static analysis (cjs-module-lexer). Anything the lexer
misses type-checks cleanly and then throws "does not provide an export named 'x'" on load — so
this class of breakage is invisible to tsc and only shows up when the module graph is executed.

Rather than reason about which packages are affected, each (package, bindings) pair found in the
source is handed to Node verbatim and the loader gets to answer.
"""

import json
import pathlib
import re
import subprocess
import sys

# `import { a, b as c } from 'pkg'` — value imports only. `import type { … }` is erased by the
# compiler and can never fail at runtime, so it is excluded here.
NAMED_IMPORT = re.compile(
    r"^import\s+(?!type\s)(?:\w+\s*,\s*)?\{(?P<names>[^}]+)\}\s*from\s*['\"](?P<pkg>[^'\"./][^'\"]*)['\"]",
    re.MULTILINE,
)

usages: dict[tuple[str, str], list[str]] = {}

for path in pathlib.Path("src").rglob("*.ts"):
    text = path.read_text()
    for match in NAMED_IMPORT.finditer(text):
        names = [
            part.split(" as ")[0].strip()
            for part in match.group("names").split(",")
            if part.strip() and not part.strip().startswith("type ")
        ]
        if not names:
            continue
        key = (match.group("pkg"), ",".join(sorted(names)))
        usages.setdefault(key, []).append(str(path))

print(f"{len(usages)} distinct (package, bindings) pairs to verify\n")

broken = []
for (pkg, names) in sorted(usages):
    probe = f"import {{ {names.replace(',', ', ')} }} from {json.dumps(pkg)}"
    result = subprocess.run(
        ["node", "--input-type=module", "-e", probe],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        # Node phrases this two ways: "does not provide an export named 'x'" for a real ESM
        # module, and "Named export 'x' not found. … is a CommonJS module …" when the lexer came
        # up short. The second is the one this audit exists for, so both must be matched.
        first = next(
            (
                line
                for line in result.stderr.splitlines()
                if "does not provide an export" in line or "Named export" in line
            ),
            "",
        )
        if first:
            broken.append((pkg, names, first.strip(), usages[(pkg, names)]))

if not broken:
    print("No named import fails Node's loader.")
    sys.exit(0)

print(f"{len(broken)} broken:\n")
for pkg, names, message, files in broken:
    print(f"  {pkg}  [{names}]")
    print(f"    {message}")
    for f in sorted(set(files)):
        print(f"    - {f}")
