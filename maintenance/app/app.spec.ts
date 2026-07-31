import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";

import App from "./app.vue";
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

  it("renders support email link", async () => {
    const wrapper = await mountSuspended(App);
    const link = wrapper.find('a[href="mailto:devops@ocelot.social"]');
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("devops@ocelot.social");
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
