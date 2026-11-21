import { spawnSync } from "node:child_process";
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

// nginx/30-active-branding.sh: which baked page the container serves. A brand repo with several
// brands bakes one page per brand under _brands/<id>/ (packages/branding/scripts/lib/
// maintenance-sites.ts); the script points nginx's root at the one $OCELOT_ACTIVE_BRANDING names.
describe("nginx active-branding entrypoint", () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
  );
  const script = join(process.cwd(), "nginx/30-active-branding.sh");
  const conf = readFileSync(join(process.cwd(), "nginx/custom.conf"), "utf8");

  // A miniature image: the root page, optionally one page per brand, and the real nginx config.
  function image(brands: string[]) {
    const dir = mkdtempSync(join(tmpdir(), "maintenance-brands-"));
    roots.push(dir);
    const root = join(dir, "html");
    mkdirSync(root);
    writeFileSync(join(root, "index.html"), "root");
    for (const id of brands) {
      mkdirSync(join(root, "_brands", id), { recursive: true });
      writeFileSync(join(root, "_brands", id, "index.html"), id);
    }
    writeFileSync(join(dir, "default.conf"), conf);
    return { root, confPath: join(dir, "default.conf") };
  }

  function run(
    img: { root: string; confPath: string },
    active: string | undefined,
  ) {
    const env: Record<string, string> = {
      PATH: process.env.PATH ?? "",
      NGINX_ROOT: img.root,
      NGINX_CONF: img.confPath,
    };
    if (active !== undefined) env.OCELOT_ACTIVE_BRANDING = active;
    const result = spawnSync(script, [], { env, encoding: "utf8" });
    const served = /^\s*root\s+([^;]+);/m.exec(
      readFileSync(img.confPath, "utf8"),
    )?.[1];
    return { ...result, served };
  }

  it("serves the named brand's page", () => {
    const img = image(["classic", "paxfamily"]);
    const { status, served } = run(img, "paxfamily");
    expect(status).toBe(0);
    expect(served).toBe(join(img.root, "_brands", "paxfamily"));
  });

  it("serves the root page when nothing is named", () => {
    const img = image(["classic", "paxfamily"]);
    expect(run(img, undefined).served).toBe(img.root);
    expect(run(img, "").served).toBe(img.root);
  });

  it("goes back to the root page when a restart drops the name", () => {
    const img = image(["classic"]);
    run(img, "classic");
    expect(run(img, undefined).served).toBe(img.root);
  });

  it("warns about an unknown brand, lists the baked ones and serves the root page", () => {
    const img = image(["classic", "paxfamily"]);
    const { status, served, stderr } = run(img, "nope");
    expect(status).toBe(0);
    expect(served).toBe(img.root);
    expect(stderr).toMatch(
      /no page for brand 'nope' \(have: classic paxfamily/,
    );
  });

  it("says so when a single-page image is given a name", () => {
    const img = image([]);
    const { served, stdout } = run(img, "acme");
    expect(served).toBe(img.root);
    expect(stdout).toMatch(/holds a single page/);
  });

  it.each(["../etc", "..", "a/b", "a\nb", "a;b"])(
    "refuses %j as a brand id, without echoing it",
    (value) => {
      const img = image(["classic"]);
      const { status, served, stderr } = run(img, value);
      expect(status).toBe(0);
      expect(served).toBe(img.root);
      expect(stderr).toMatch(/not a brand id/);
      expect(stderr).not.toContain(value);
    },
  );
});
