#!/usr/bin/env python3
"""Give bare `jest.fn()` stubs a call signature.

`@types/jest` typed `jest.fn()` loosely, so `.mockResolvedValue(x)` accepted anything. The
`@jest/globals` version types it as `Mock<UnknownFunction>`, and the argument of every
`mock*Value` helper is then inferred as `never` — every stub that is configured rather than
merely asserted on needs a signature.

The signature is derived from how the stub is USED: a promise-returning one where the file calls
`mockResolvedValue`/`mockRejectedValue` on it, a plain one where it only calls
`mockReturnValue`/`mockImplementation`. Stubs that are only asserted against keep the bare form,
which still type-checks.
"""

import pathlib
import re
import sys

ASYNC_HELPERS = ("mockResolvedValue", "mockResolvedValueOnce",
                 "mockRejectedValue", "mockRejectedValueOnce")
SYNC_HELPERS = ("mockReturnValue", "mockReturnValueOnce")

ASYNC_SIG = "jest.fn<(...args: unknown[]) => Promise<unknown>>()"
SYNC_SIG = "jest.fn<(...args: unknown[]) => unknown>()"

# `const name = jest.fn()` and `name: jest.fn(),` inside an object literal
DECL = re.compile(r"\b(?:const|let)\s+(?P<name>\w+)\s*=\s*jest\.fn\(\)")
MEMBER = re.compile(r"(?P<name>\w+):\s*jest\.fn\(\)")


def usage_kind(text: str, name: str) -> str | None:
    """Which family of mock helpers is called on `name` (directly or as `obj.name`)."""
    for helper in ASYNC_HELPERS:
        if re.search(rf"\b{re.escape(name)}\s*\.\s*{helper}\b", text) or re.search(
            rf"\.\s*{re.escape(name)}\s*\.\s*{helper}\b", text
        ):
            return "async"
    for helper in SYNC_HELPERS:
        if re.search(rf"\b{re.escape(name)}\s*\.\s*{helper}\b", text) or re.search(
            rf"\.\s*{re.escape(name)}\s*\.\s*{helper}\b", text
        ):
            return "sync"
    return None


def convert(path: pathlib.Path) -> int:
    text = path.read_text()
    hits = 0

    def replace(match, template):
        nonlocal hits
        kind = usage_kind(text, match.group("name"))
        if kind is None:
            return match.group(0)
        hits += 1
        signature = ASYNC_SIG if kind == "async" else SYNC_SIG
        return template.format(name=match.group("name"), sig=signature)

    out = DECL.sub(lambda m: replace(m, "const {name} = {sig}"), text)
    out = MEMBER.sub(lambda m: replace(m, "{name}: {sig}"), out)
    # `const` vs `let` is preserved by only rewriting the `const` form above; restore any `let`
    for name in re.findall(r"\blet\s+(\w+)\s*=\s*jest\.fn", text):
        out = out.replace(f"const {name} = jest.fn<", f"let {name} = jest.fn<")
    if hits:
        path.write_text(out)
    return hits


total = 0
for arg in sys.argv[1:]:
    total += convert(pathlib.Path(arg))
print(f"{total} Stubs mit Signatur versehen")
