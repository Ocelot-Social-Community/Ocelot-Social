import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";

import App from "./app.vue";

describe("app", () => {
  it("renders maintenance heading", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find("h3").text()).toContain("is under maintenance");
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

  it("renders logo", async () => {
    const wrapper = await mountSuspended(App);
    const img = wrapper.find("img.logo");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/img/logo-squared.svg");
  });

  it("renders OsCard component", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find(".os-card").exists()).toBe(true);
  });

  it("renders LocaleSwitch component", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find(".os-menu").exists()).toBe(true);
  });
});
