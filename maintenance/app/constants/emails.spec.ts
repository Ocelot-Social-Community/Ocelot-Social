import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

// The shell script is the OTHER half of the injection: it rewrites the placeholder in the built
// files when the container starts. Read as raw text so the two literals are compared, not two
// independent copies that happen to agree today.
import entrypoint from "../../nginx/40-support-email.sh?raw";

import emails, { isSupportAddress, SUPPORT_EMAIL_PLACEHOLDER } from "./emails";

// Values shaped enough like an address to reach the substitution, and hostile once they arrive: the
// page is prerendered, so the runtime config sits in a double-quoted JS string inside a <script>
// block of index.html, and sed writes bytes. Used TWICE below — once against the TypeScript guard,
// once against the shell script — because either half accepting one of these is the same hole.
const HOSTILE = [
  // Closes the string, then the block: everything after it is code the visitor's browser runs.
  'x"</script><script>alert(1)</script>@example.org',
  // Only the string has to go for the surrounding object literal to become attacker-controlled.
  'x",evil:"1@example.org',
  // A template literal needs no quote of its own.
  "x`${alert(1)}`@example.org",
  // No quote, no backtick — an injected tag is enough on its own.
  "x<img src=x onerror=alert(1)>@example.org",
  // grep works a line at a time, so a shape check alone would pass on the first line.
  'ok@example.org\nx"</script><script>alert(1)</script>@example.org',
];

describe("support e-mail placeholder", () => {
  // The token exists in TS (payload) and in sh (substitution). Nothing at runtime would fail loudly
  // if they drifted — the page would just render a raw `__OCELOT_SUPPORT_EMAIL__` to every visitor,
  // on the one page that is shown when everything else is already broken.
  it("is the same literal the nginx entrypoint substitutes", () => {
    const declared = /PLACEHOLDER='([^']+)'/.exec(entrypoint);
    expect(declared?.[1]).toBe(SUPPORT_EMAIL_PLACEHOLDER);
  });

  it("cannot be mistaken for an address", () => {
    // Load-bearing, not cosmetic: this is the ONLY thing that makes app.vue fall back on an
    // unsubstituted token now that it no longer compares against the token itself.
    expect(SUPPORT_EMAIL_PLACEHOLDER).not.toContain("@");
    expect(isSupportAddress(SUPPORT_EMAIL_PLACEHOLDER)).toBe(false);
  });

  it("falls back to an address the entrypoint agrees with", () => {
    // Both sides carry the vanilla default: the app for `nuxt dev`/preview, the script for a
    // deployment that sets no SUPPORT_EMAIL — or one that sets a value the script refuses.
    // Divergence would show a different address depending on how the page happened to be served.
    const declared = /DEFAULT_EMAIL='([^']+)'/.exec(entrypoint);
    expect(declared?.[1]).toBe(emails.SUPPORT_EMAIL);
  });
});

describe("isSupportAddress", () => {
  it.each([
    ["a plain address", "support@example.org"],
    ["the vanilla default", emails.SUPPORT_EMAIL],
    ["an ampersand in the local part", "help&team@example.org"],
    ["a pipe in the local part", "a|b@example.org"],
    ["a backslash in the local part", "back\\slash@example.org"],
    ["a slash in the local part", "a/b@example.org"],
    ["a subdomain", "post@mail.example.co.uk"],
  ])("accepts %s", (_case, value) => {
    expect(isSupportAddress(value)).toBe(true);
  });

  // Everything the runtime config can hold when NEITHER injection ran. Each of these must reach the
  // vanilla address instead of the visitor.
  it.each([
    ["the placeholder", SUPPORT_EMAIL_PLACEHOLDER],
    ["an empty string", ""],
    ["undefined", undefined],
    ["a bare word", "support"],
    ["a domain without a local part", "@example.org"],
    ["a local part without a domain", "support@"],
    ["a domain without a dot", "support@localhost"],
    ["an address with whitespace", "support @example.org"],
    ["two addresses", "a@example.org b@example.org"],
    // A dot with nothing on one side of it is not a label. Both shapes pass a naive
    // `[^\s@]+\.[^\s@]+` domain, and would then be rendered in place of the fallback.
    ["an empty domain label", "support@example..org"],
    ["a trailing dot", "support@example.org."],
    ["a leading dot", "support@.example.org"],
    // The value is substituted into a JS string in a <script> block — see the entrypoint. These are
    // refused rather than encoded; no address needs them.
    ...HOSTILE.map((value, index): [string, string] => [
      `a markup break-out (${index})`,
      value,
    ]),
  ])("rejects %s", (_case, value) => {
    expect(isSupportAddress(value)).toBe(false);
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

  // The value comes from the helm chart rather than from a visitor, but nothing between the chart and
  // the browser looked at it: sed put it in the page as given, and the page is what a visitor sees
  // when every other check in the system is already unavailable.
  describe("a value that would break out of the markup", () => {
    /** Run the entrypoint over a fixture holding the placeholder; return the page and the log. */
    function run(email: string): {
      page: string;
      stderr: string;
      code: number;
    } {
      const root = mkdtempSync(join(tmpdir(), "ocelot-entrypoint-hostile-"));
      roots.push(root);
      writeFileSync(
        join(root, "index.html"),
        `<script>window.__NUXT__={config:{public:{supportEmail:"${SUPPORT_EMAIL_PLACEHOLDER}"}}}</script>`,
      );
      const result = spawnSync(script, [], {
        env: { ...process.env, NGINX_ROOT: root, SUPPORT_EMAIL: email },
        encoding: "utf8",
      });
      return {
        page: readFileSync(join(root, "index.html"), "utf8"),
        stderr: result.stderr,
        code: result.status ?? -1,
      };
    }

    it.each(HOSTILE.map((value, index): [number, string] => [index, value]))(
      "serves the vanilla address instead of value %i",
      (_index, email) => {
        const { page, stderr, code } = run(email);

        // Not `not.toContain("<script>")` — the fixture legitimately has one. What must not appear is
        // anything the value brought with it.
        expect(page).toBe(
          `<script>window.__NUXT__={config:{public:{supportEmail:"${emails.SUPPORT_EMAIL}"}}}</script>`,
        );
        // Loud, and without echoing the value back into the log.
        expect(stderr).toContain("WARNING");
        expect(stderr).toContain("SUPPORT_EMAIL");
        expect(stderr).not.toContain("alert(1)");
        // Never fatal: this page comes up even when its own configuration is wrong.
        expect(code).toBe(0);
      },
    );

    // The two halves decide the same question in two languages — sh at container start, TypeScript in
    // the browser — and only agreement makes either one meaningful: what the script lets through is
    // exactly what app.vue will render.
    it.each([
      "support@example.org",
      "help&team@example.org",
      "a|b@example.org",
      "back\\slash@example.org",
      "a/b@example.org",
      "post@mail.example.co.uk",
      "support@example..org",
      "support@example.org.",
      "support@localhost",
      ...HOSTILE,
    ])("agrees with isSupportAddress about %j", (email) => {
      const substituted = /supportEmail:"([^"]*)"/.exec(run(email).page)?.[1];

      expect(substituted).toBe(
        isSupportAddress(email) ? email : emails.SUPPORT_EMAIL,
      );
    });
  });

  // The regression. `nuxt generate` puts the token in the output TWICE, in two roles:
  //
  //   index.html   window.__NUXT__.config.public.supportEmail — the value the page reads
  //   _nuxt/*.js   a string constant in the app bundle
  //
  // The script used to rewrite both, so the bundle's copy became the configured address as well.
  // app.vue compared the two, found them equal, concluded the substitution had NOT happened and
  // rendered the vanilla address — on every correctly configured deployment, and only there. The
  // earlier tests missed it because their fixture carries the token in ONE role, where no
  // substitution can contradict another. Both halves of the fix are asserted here: the bundle is
  // left alone, and the resolved value survives even if it were not.
  describe("a build that carries the token in both roles", () => {
    function build(email: string): { config: string; bundle: string } {
      const root = mkdtempSync(join(tmpdir(), "ocelot-entrypoint-build-"));
      roots.push(root);
      mkdirSync(join(root, "_nuxt"));
      writeFileSync(
        join(root, "index.html"),
        `<script>window.__NUXT__={};window.__NUXT__.config={public:{supportEmail:"${SUPPORT_EMAIL_PLACEHOLDER}"}}</script>`,
      );
      writeFileSync(
        join(root, "_nuxt", "entry.js"),
        `const Iv="${SUPPORT_EMAIL_PLACEHOLDER}",$v={SUPPORT_EMAIL:"${emails.SUPPORT_EMAIL}"};`,
      );
      execFileSync(script, [], {
        env: { ...process.env, NGINX_ROOT: root, SUPPORT_EMAIL: email },
        stdio: "pipe",
      });
      return {
        config:
          /supportEmail:"([^"]*)"/.exec(
            readFileSync(join(root, "index.html"), "utf8"),
          )?.[1] ?? "",
        bundle:
          /Iv="([^"]*)"/.exec(
            readFileSync(join(root, "_nuxt", "entry.js"), "utf8"),
          )?.[1] ?? "",
      };
    }

    it("substitutes the runtime config", () => {
      expect(build("post@example.org").config).toBe("post@example.org");
    });

    it("leaves the client bundle untouched", () => {
      expect(build("post@example.org").bundle).toBe(SUPPORT_EMAIL_PLACEHOLDER);
    });

    // What app.vue does with the result — the assertion that would have failed before the fix.
    it("resolves to the configured address, not the vanilla one", () => {
      const { config } = build("post@example.org");
      const rendered = isSupportAddress(config) ? config : emails.SUPPORT_EMAIL;

      expect(rendered).toBe("post@example.org");
      expect(rendered).not.toBe(emails.SUPPORT_EMAIL);
    });
  });

  // A build whose HTML no longer carries the token at all — a Nuxt upgrade moving the runtime config
  // elsewhere would look like this. The page has to come up regardless, but silently: it renders a
  // plausible wrong address, which is why the script has to say so where `kubectl logs` shows it.
  it("warns instead of failing when there is nothing to substitute", () => {
    const root = mkdtempSync(join(tmpdir(), "ocelot-entrypoint-empty-"));
    roots.push(root);
    writeFileSync(join(root, "index.html"), "<html>no token here</html>");

    const result = spawnSync(script, [], {
      env: { ...process.env, NGINX_ROOT: root, SUPPORT_EMAIL: "x@example.org" },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(SUPPORT_EMAIL_PLACEHOLDER);
    expect(result.stderr).toContain("WARNING");
    expect(result.stdout).toContain("[maintenance] support e-mail:");
    expect(readFileSync(join(root, "index.html"), "utf8")).toBe(
      "<html>no token here</html>",
    );
  });
});
