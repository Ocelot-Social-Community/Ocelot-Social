#!/usr/bin/env node
// Brand this maintenance page from a brand's typed config — WITHOUT Docker.
//
//   npm run brand -- yunite.me                     a brand repo under deployment/configurations/
//                                                  with a single brand
//   OCELOT_ACTIVE_BRANDING=classic \
//   npm run brand -- acme                          one brand of a repo that holds several (brand
//                                                  id or directory name, as the deployment names it)
//   npm run brand -- acme/brandings/classic        the same, as a path
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
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const maintenanceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(maintenanceDir, "..");
const packageDir = join(repoRoot, "packages", "branding");
const generator = join(packageDir, "scripts", "build-maintenance-branding.ts");

// The paths the generator produces, read from ITS file rather than copied: a path that reached only
// one of the two lists would survive this reset and contaminate the next brand. Plain JSON, so the
// reset also works when the package's dist/ is not built — which is exactly when you most want to be
// able to get back to vanilla.
const GENERATED = JSON.parse(
  readFileSync(
    join(packageDir, "scripts", "maintenance-generated-paths.json"),
    "utf8",
  ),
).paths;

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

/**
 * A brand argument as a directory. A path to a brand dir is taken as is; a bare name is a brand repo
 * under deployment/configurations and resolves to the brand $OCELOT_ACTIVE_BRANDING names, else to
 * its only brand under brandings/<name>/ — the brand the running maintenance image would serve.
 */
async function resolveBrandDir(arg) {
  const hasConfig = (dir) =>
    existsSync(join(dir, "brand.config.ts")) ||
    existsSync(join(dir, "brand.config.mjs"));
  const asPath = resolve(maintenanceDir, arg);
  if (hasConfig(asPath)) return asPath;
  const configurations = join(repoRoot, "deployment", "configurations");
  const asBrand = join(configurations, arg);
  if (hasConfig(asBrand)) return asBrand;
  const { resolveBrandRepo, selectBrand } = await import(
    pathToFileURL(join(packageDir, "scripts", "lib", "brand-repo.ts")).href
  );
  let brandRepo, brand;
  try {
    brandRepo = resolveBrandRepo(asBrand);
    brand = selectBrand(brandRepo, process.env.OCELOT_ACTIVE_BRANDING);
  } catch (error) {
    // A layout rule the brand repo breaks is the author's to fix: its message, not a stack trace.
    if (!String(error?.message).startsWith("[brand-repo]")) throw error;
    fail(error.message);
  }
  for (const warning of brandRepo.warnings) console.error(warning);
  if (!brand && brandRepo.brands.length > 1) {
    fail(
      `"${arg}" holds several brands (${brandRepo.brands.map((b) => b.id).join(", ")}) — ` +
        `name one: OCELOT_ACTIVE_BRANDING=<id> npm run brand -- ${arg}`,
    );
  }
  return brand?.dir ?? null;
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

const brandDir = await resolveBrandDir(arg);
if (!brandDir) {
  fail(
    `no brand.config.(ts|mjs) for "${arg}" — expected a directory under ` +
      `deployment/configurations/<name>/brandings/<brand>, or a path to one`,
  );
}

console.log(`[brand] ${brandDir}`);
execFileSync("node", [generator, brandDir, maintenanceDir], {
  stdio: "inherit",
});

console.log(
  "[brand] done — `npm run dev` to see it, `npm run brand:reset` to undo",
);
