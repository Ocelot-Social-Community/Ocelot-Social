#!/usr/bin/env node
// Brand this maintenance page from a brand's typed config — WITHOUT Docker.
//
//   npm run brand -- yunite.me                     a directory under deployment/configurations/
//   npm run brand -- ../some/other/brand/branding  any brand dir (must hold a brand.config.*)
//   npm run brand:reset                            back to exactly how it was
//
// The page is a STATIC site: nginx serves it precisely when the backend is unreachable, so it cannot
// fetch its branding at runtime and must be branded BEFORE `nuxt generate`. The generator therefore
// writes into these sources (css / fonts / logo / metadata / locales). In Docker the tree is
// ephemeral; here it is your working copy — hence the reset.
//
// Everything the generator writes is a SEPARATE, git-ignored file — it never edits a committed
// source, so `git status` after branding is empty and the reset is a plain delete. No backup, no git
// surgery: the app reads each artifact as an optional overlay and falls back to vanilla without it.
//
// The generator is invoked by PATH rather than as a dependency: @ocelot-social/branding is not
// published yet, and a `file:` dependency is COPIED into node_modules, so every package edit would
// need a reinstall before it showed up here. Once the package is on npm this becomes a devDependency.
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const maintenanceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(maintenanceDir, "..");
const packageDir = join(repoRoot, "packages", "branding");
const generator = join(packageDir, "scripts", "build-maintenance-branding.ts");

// Everything build-maintenance-branding.ts produces. Kept in step with the GENERATED list there — a
// path added on that side and forgotten here would survive `brand:reset` and leak into the next brand.
const GENERATED = [
  "app/assets/css/brand.css",
  "app/constants/metadata.brand.json",
  "app/locales",
  "public/brand",
];

function fail(message) {
  console.error(`[brand] ${message}`);
  process.exit(1);
}

function reset() {
  let removed = 0;
  for (const rel of GENERATED) {
    const path = join(maintenanceDir, rel);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed++;
  }
  console.log(
    removed
      ? `[brand] removed ${removed} generated path(s) — vanilla ocelot.social`
      : "[brand] nothing to remove — already vanilla",
  );
}

/** A brand argument as a directory: a bare name resolves under deployment/configurations. */
function resolveBrandDir(arg) {
  const hasConfig = (dir) =>
    existsSync(join(dir, "brand.config.ts")) ||
    existsSync(join(dir, "brand.config.mjs"));
  const asPath = resolve(maintenanceDir, arg);
  if (hasConfig(asPath)) return asPath;
  const asName = join(
    repoRoot,
    "deployment",
    "configurations",
    arg,
    "branding",
  );
  if (hasConfig(asName)) return asName;
  return null;
}

const arg = process.argv[2];
if (arg === "--reset") {
  reset();
  process.exit(0);
}
if (!arg) {
  fail(
    "usage: npm run brand -- <brand-name|brand-dir>   (npm run brand:reset to undo)",
  );
}

// The generator imports the package's own dist/ — built, not published, so say so plainly instead of
// failing later with a module-resolution error.
if (!existsSync(join(packageDir, "dist"))) {
  fail(
    `@ocelot-social/branding is not built. Run:\n` +
      `  npm --prefix ${packageDir} ci && npm --prefix ${packageDir} run build`,
  );
}

const brandDir = resolveBrandDir(arg);
if (!brandDir) {
  fail(
    `no brand.config.(ts|mjs) for "${arg}" — expected a directory under ` +
      `deployment/configurations/<name>/branding, or a path to one`,
  );
}

console.log(`[brand] ${brandDir}`);
execFileSync("node", [generator, brandDir, maintenanceDir], {
  stdio: "inherit",
});

console.log(
  "[brand] done — `npm run dev` to see it, `npm run brand:reset` to undo",
);
