import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

// The shell script is the OTHER half of the injection: it rewrites the placeholder in the built
// files when the container starts. Read as raw text so the two literals are compared, not two
// independent copies that happen to agree today.
import entrypoint from "../../nginx/40-support-email.sh?raw";

import emails, { SUPPORT_EMAIL_PLACEHOLDER } from "./emails";

describe("support e-mail placeholder", () => {
  // The token exists in TS (payload) and in sh (substitution). Nothing at runtime would fail loudly
  // if they drifted — the page would just render a raw `__OCELOT_SUPPORT_EMAIL__` to every visitor,
  // on the one page that is shown when everything else is already broken.
  it("is the same literal the nginx entrypoint substitutes", () => {
    const declared = /PLACEHOLDER='([^']+)'/.exec(entrypoint);
    expect(declared?.[1]).toBe(SUPPORT_EMAIL_PLACEHOLDER);
  });

  it("cannot be mistaken for an address", () => {
    // A substitution that never happens must be recognisable as a bug, not read as a mailto.
    expect(SUPPORT_EMAIL_PLACEHOLDER).not.toContain("@");
  });

  it("falls back to an address the entrypoint agrees with", () => {
    // Both sides carry the vanilla default: the app for `nuxt dev`/preview, the script for a
    // deployment that sets no SUPPORT_EMAIL. Divergence would show a different address depending on
    // how the page happened to be served.
    expect(entrypoint).toContain(`SUPPORT_EMAIL:-${emails.SUPPORT_EMAIL}`);
  });
});

// Running the script for real, not asserting on its source: the failure this guards against is a
// SHELL quoting one, invisible in the text and only observable in the output it produces.
describe("nginx entrypoint substitution", () => {
  // From the vitest root (maintenance/), not import.meta.url — under the nuxt environment that is a
  // Vite URL rather than a file:// one.
  const script = join(process.cwd(), "nginx/40-support-email.sh");
  const roots: string[] = [];
  afterAll(() => {
    for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  });

  /** Run the entrypoint over one file holding the placeholder, and return what it became. */
  function substitute(email: string): string {
    const root = mkdtempSync(join(tmpdir(), "ocelot-entrypoint-"));
    roots.push(root);
    writeFileSync(join(root, "index.html"), `x:"${SUPPORT_EMAIL_PLACEHOLDER}"`);
    execFileSync(script, [], {
      env: { ...process.env, NGINX_ROOT: root, SUPPORT_EMAIL: email },
      stdio: "pipe",
    });
    return (
      /^x:"(.*)"$/.exec(readFileSync(join(root, "index.html"), "utf8"))?.[1] ??
      ""
    );
  }

  // RFC 5322 allows all of these in a local part, and every one of them is special to sed: `&` is the
  // whole match, `|` closes the expression (it is the delimiter), `\` starts an escape. Unescaped,
  // `help&team@example.org` wrote the PLACEHOLDER back into the page served to every visitor.
  it.each([
    ["an ampersand", "help&team@example.org"],
    ["a pipe", "a|b@example.org"],
    ["a backslash", "back\\slash@example.org"],
    ["a slash", "a/b@example.org"],
    ["nothing special", "support@example.org"],
  ])("substitutes an address containing %s verbatim", (_case, email) => {
    expect(substitute(email)).toBe(email);
  });

  it("falls back to the vanilla address when the env is unset", () => {
    expect(substitute("")).toBe(emails.SUPPORT_EMAIL);
  });
});
