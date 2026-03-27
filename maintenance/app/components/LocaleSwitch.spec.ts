import { mountSuspended } from "@nuxt/test-utils/runtime";
import { nextTick } from "vue";
import { describe, expect, it, vi } from "vitest";

import LocaleSwitch from "./LocaleSwitch.vue";

describe("LocaleSwitch", () => {
  it("renders a language icon button", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.attributes("title")).toBe("Choose language");
  });

  it("dropdown is closed by default", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    expect(wrapper.find(".locale-dropdown").exists()).toBe(false);
  });

  it("opens dropdown on button click", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    await wrapper.find("button").trigger("click");
    expect(wrapper.find(".locale-dropdown").exists()).toBe(true);
  });

  it("shows all 11 locales in dropdown", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    await wrapper.find("button").trigger("click");
    const items = wrapper.findAll(".locale-item");
    expect(items.length).toBe(11);
  });

  it("displays sorted locale names", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    await wrapper.find("button").trigger("click");
    const items = wrapper.findAll(".locale-item");
    const names = items.map((el) => el.text());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("marks current locale as active", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    await wrapper.find("button").trigger("click");
    const active = wrapper.find(".locale-item--active");
    expect(active.text()).toBe("English");
  });

  it("closes dropdown after selecting a locale", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    await wrapper.find("button").trigger("click");
    const deutsch = wrapper.findAll(".locale-item").find((el) => el.text() === "Deutsch");
    await deutsch!.trigger("click");
    // setLocale is async, wait for it
    await new Promise((r) => setTimeout(r, 50));
    expect(wrapper.find(".locale-dropdown").exists()).toBe(false);
  });

  it("closes dropdown on click outside", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, { attachTo: document.body });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find(".locale-dropdown").exists()).toBe(true);

    // Click outside the component
    document.body.click();
    await nextTick();
    expect(wrapper.find(".locale-dropdown").exists()).toBe(false);
    wrapper.unmount();
  });

  it("does not close dropdown on click inside", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, { attachTo: document.body });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find(".locale-dropdown").exists()).toBe(true);

    // Click inside the dropdown
    await wrapper.find(".locale-dropdown").trigger("click");
    expect(wrapper.find(".locale-dropdown").exists()).toBe(true);
    wrapper.unmount();
  });

  it("cleans up event listener on unmount", async () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const wrapper = await mountSuspended(LocaleSwitch, { attachTo: document.body });
    wrapper.unmount();
    expect(spy).toHaveBeenCalledWith("click", expect.any(Function));
    spy.mockRestore();
  });
});
