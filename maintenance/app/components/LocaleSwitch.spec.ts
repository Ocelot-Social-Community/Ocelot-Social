import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it } from "vitest";
import { nextTick } from "vue";

import LocaleSwitch from "./LocaleSwitch.vue";

async function openDropdown(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
) {
  await wrapper.find("button").trigger("click");
  await nextTick();
  await new Promise((r) => setTimeout(r, 50));
  await nextTick();
}

describe("LocaleSwitch", () => {
  it("renders a language icon button", async () => {
    const wrapper = await mountSuspended(LocaleSwitch);
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-label")).toBe("Choose language");
  });

  it("opens dropdown on button click", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const items = document.querySelectorAll(".locale-item");
    expect(items.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it("shows all 11 locales in dropdown", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const items = document.querySelectorAll(".locale-item");
    expect(items.length).toBe(11);
    wrapper.unmount();
  });

  it("displays sorted locale names", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const items = document.querySelectorAll(".locale-item");
    const names = Array.from(items).map((el) => el.textContent?.trim() ?? "");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    wrapper.unmount();
  });

  it("marks current locale as active", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const active = document.querySelector(".locale-item--active");
    expect(active?.textContent?.trim()).toBe("English");
    wrapper.unmount();
  });

  it("switches locale on click", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const deutsch = Array.from(document.querySelectorAll(".locale-item")).find(
      (el) => el.textContent?.trim() === "Deutsch",
    ) as HTMLButtonElement | undefined;
    expect(deutsch).toBeDefined();
    deutsch!.click();
    await new Promise((r) => setTimeout(r, 100));
    await nextTick();

    // Re-open to check active state
    await openDropdown(wrapper);
    const active = document.querySelector(".locale-item--active");
    expect(active?.textContent?.trim()).toBe("Deutsch");
    wrapper.unmount();
  });
});
