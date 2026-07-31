import { describe, expect, it } from "vitest";

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
