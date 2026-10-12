import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

// The other half of the injection, read as raw text so the two literals are compared rather than two
// copies that happen to agree today.
import entrypoint from "../../nginx/41-client-uri.sh?raw";

import { CLIENT_URI_PLACEHOLDER } from "./clientUri";

describe("client uri placeholder", () => {
  // Nothing at runtime would fail loudly if they drifted: every link preview would just carry a raw
  // `__OCELOT_CLIENT_URI__/…` URL.
  it("is the same literal the nginx entrypoint substitutes", () => {
    const declared = /PLACEHOLDER='([^']+)'/.exec(entrypoint);
    expect(declared?.[1]).toBe(CLIENT_URI_PLACEHOLDER);
  });
});

describe("nginx entrypoint substitution", () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
  );
  const script = join(process.cwd(), "nginx/41-client-uri.sh");

  // A miniature build: the prerendered page with the token in front of the image path.
  function build() {
    const root = mkdtempSync(join(tmpdir(), "maintenance-html-"));
    roots.push(root);
    writeFileSync(
      join(root, "index.html"),
      `<meta property="og:image" content="${CLIENT_URI_PLACEHOLDER}/brand/og.png">`,
    );
    return root;
  }

  function run(clientUri: string | undefined) {
    const root = build();
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      NGINX_ROOT: root,
    };
    if (clientUri !== undefined) env.CLIENT_URI = clientUri;
    const result = spawnSync(script, [], { env, encoding: "utf8" });
    return {
      ...result,
      html: readFileSync(join(root, "index.html"), "utf8"),
    };
  }

  it("makes og:image absolute", () => {
    const { status, html } = run("https://stage.ocelot.social");

    expect(status).toBe(0);
    expect(html).toContain(
      'content="https://stage.ocelot.social/brand/og.png"',
    );
  });

  it("drops a trailing slash instead of doubling it", () => {
    expect(run("https://network.example:8443/").html).toContain(
      'content="https://network.example:8443/brand/og.png"',
    );
  });

  // Unset is a supported state, not an error: the page behaves as it did before this existed.
  it("leaves the path relative when the env is unset", () => {
    const { status, html } = run(undefined);

    expect(status).toBe(0);
    expect(html).toContain('content="/brand/og.png"');
  });

  // The value lands in an HTML attribute and a JS string; anything that is not a bare origin is
  // refused, without echoing it into the log.
  it.each([
    ["a quote", 'https://x.example"><script>alert(1)</script>'],
    ["a path", "https://x.example/sub"],
    ["no scheme", "x.example"],
    ["another scheme", "javascript:alert(1)"],
    ["two lines", "https://x.example\nhttps://y.example"],
  ])("refuses %s and stays relative", (_case, value) => {
    const { status, html, stderr } = run(value);

    expect(status).toBe(0);
    expect(html).toContain('content="/brand/og.png"');
    expect(stderr).toMatch(/ignoring CLIENT_URI/);
    expect(stderr).not.toContain(value);
  });

  // An external OG image carries no token. The page has to come up all the same.
  it("does not fail when there is nothing to substitute", () => {
    const root = mkdtempSync(join(tmpdir(), "maintenance-html-"));
    roots.push(root);
    writeFileSync(join(root, "index.html"), "<p>no token</p>");

    expect(() =>
      execFileSync(script, [], {
        env: {
          PATH: process.env.PATH ?? "",
          NGINX_ROOT: root,
          CLIENT_URI: "https://x.example",
        },
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});
