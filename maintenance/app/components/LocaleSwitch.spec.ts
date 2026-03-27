import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { describe, expect, it } from "vitest";

import LocaleSwitch from "./LocaleSwitch.vue";

describe("LocaleSwitch", () => {
  it("renders all 11 locale buttons", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    const buttons = wrapper.findAll("button");
    expect(buttons.length).toBe(11);
  });

  it("displays locale names", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    expect(wrapper.text()).toContain("English");
    expect(wrapper.text()).toContain("Deutsch");
    expect(wrapper.text()).toContain("Français");
  });

  it("marks current locale as active", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    const activeButton = wrapper.find(".locale-button--active");
    expect(activeButton.exists()).toBe(true);
    expect(activeButton.text()).toBe("English");
  });

  it("switches locale on click", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    const deutschButton = wrapper.findAll("button").find((el) => el.text() === "Deutsch");
    expect(deutschButton).toBeDefined();
    await deutschButton!.trigger("click");
    // Wait for async setLocale (lazy locale loading)
    await new Promise((r) => setTimeout(r, 100));
    await nextTick();

    // After click, Deutsch should be active
    const activeButton = wrapper.find(".locale-button--active");
    expect(activeButton.text()).toBe("Deutsch");
  });
});
