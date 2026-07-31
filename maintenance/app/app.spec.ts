import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";

import App from "./app.vue";
import emails, { SUPPORT_EMAIL_PLACEHOLDER } from "./constants/emails";
import metadata from "./constants/metadata";

describe("app", () => {
  // The address comes from runtimeConfig, which nuxt.config.ts fills from $SUPPORT_EMAIL — so a test
  // that leaves it alone asserts against whatever the ENVIRONMENT happens to hold (docker-compose
  // passes one to this container). Every case sets it explicitly and restores it, in one place so a
  // forgotten `finally` cannot leak the value into the tests that follow.
  async function withSupportEmail<T>(
    value: string,
    run: () => Promise<T>,
  ): Promise<T> {
    const config = useRuntimeConfig();
    const original = config.public.supportEmail;
    config.public.supportEmail = value;
    try {
      return await run();
    } finally {
      config.public.supportEmail = original;
    }
  }

  it("renders maintenance heading", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find("h1").text()).toContain("is under maintenance");
  });

  it("renders explanation text", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.text()).toContain("scheduled maintenance");
  });

  // The address is deployment config (build-time env, or the nginx entrypoint at container start),
  // NOT branding — no brand archive carries an e-mail. Unset, the vanilla constant answers.
  it("renders the vanilla support email when none is configured", async () => {
    await withSupportEmail("", async () => {
      const wrapper = await mountSuspended(App);
      const link = wrapper.find(`a[href="mailto:${emails.SUPPORT_EMAIL}"]`);
      expect(link.exists()).toBe(true);
      expect(link.text()).toBe(emails.SUPPORT_EMAIL);
    });
  });

  // A placeholder still in the payload means neither injection ran (`nuxt dev` without the env, or
  // previewing the built files without nginx). Rendering it verbatim would put a raw token in front
  // of every visitor of the page that shows when everything else is down.
  it("never renders an unsubstituted placeholder", async () => {
    await withSupportEmail(SUPPORT_EMAIL_PLACEHOLDER, async () => {
      const wrapper = await mountSuspended(App);
      expect(wrapper.text()).not.toContain(SUPPORT_EMAIL_PLACEHOLDER);
      expect(
        wrapper.find(`a[href="mailto:${emails.SUPPORT_EMAIL}"]`).exists(),
      ).toBe(true);
    });
  });

  it("prefers the configured support email over the vanilla one", async () => {
    await withSupportEmail("support@example.org", async () => {
      const wrapper = await mountSuspended(App);
      const link = wrapper.find('a[href="mailto:support@example.org"]');
      expect(link.exists()).toBe(true);
      expect(link.text()).toBe("support@example.org");
    });
  });

  it("renders the logo the metadata names", async () => {
    const wrapper = await mountSuspended(App);
    const img = wrapper.find("img.logo");
    expect(img.exists()).toBe(true);
    // Against metadata.LOGO, not a literal: a brand overlay repoints it at its own file, and this
    // suite has to pass on a branded working copy too. Vanilla LOGO is /img/custom/logo-squared.svg.
    expect(img.attributes("src")).toBe(metadata.LOGO);
  });

  it("renders OsCard component", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find(".os-card").exists()).toBe(true);
  });

  it("renders LocaleSwitch component", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find(".locale-switch").exists()).toBe(true);
  });
});
