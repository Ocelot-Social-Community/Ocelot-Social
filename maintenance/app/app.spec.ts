import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";

import App from "./app.vue";
import emails from "./constants/emails";
import metadata from "./constants/metadata";

describe("app", () => {
  it("renders maintenance heading", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find("h1").text()).toContain("is under maintenance");
  });

  it("renders explanation text", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.text()).toContain("scheduled maintenance");
  });

  // The address is deployment config baked in at build time ($SUPPORT_EMAIL → runtimeConfig), NOT
  // branding — no brand archive carries an e-mail. Unset, the vanilla constant answers.
  it("renders the vanilla support email when none is configured", async () => {
    const wrapper = await mountSuspended(App);
    const link = wrapper.find(`a[href="mailto:${emails.SUPPORT_EMAIL}"]`);
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe(emails.SUPPORT_EMAIL);
  });

  it("prefers the configured support email over the vanilla one", async () => {
    const config = useRuntimeConfig();
    const original = config.public.supportEmail;
    config.public.supportEmail = "support@example.org";
    try {
      const wrapper = await mountSuspended(App);
      const link = wrapper.find('a[href="mailto:support@example.org"]');
      expect(link.exists()).toBe(true);
      expect(link.text()).toBe("support@example.org");
    } finally {
      config.public.supportEmail = original;
    }
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
