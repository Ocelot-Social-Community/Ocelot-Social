import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { mountSuspended } from "@nuxt/test-utils/runtime";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import LocaleSwitch from "./LocaleSwitch.vue";

const LOCALE_COUNT = readdirSync(resolve(__dirname, "../../locales")).filter(
  (f) => f.endsWith(".json"),
).length;

async function openDropdown(
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
) {
  await wrapper.find("button").trigger("click");
  await nextTick();
  // floating-vue needs time to complete its show transition
  await new Promise((r) => setTimeout(r, 50));
  await nextTick();
}

describe("LocaleSwitch", () => {
  // Clean up floating-vue teleported popper elements between tests
  afterEach(() => {
    document.querySelectorAll(".v-popper__popper").forEach((el) => el.remove());
  });

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
    const items = document.querySelectorAll(".os-menu-item-link");
    expect(items.length).toBeGreaterThan(0);
    wrapper.unmount();
  });

  it("shows all configured locales in dropdown", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const items = document.querySelectorAll(".os-menu-item-link");
    expect(items.length).toBe(LOCALE_COUNT);
    wrapper.unmount();
  });

  it("displays sorted locale names", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const items = document.querySelectorAll(".os-menu-item-link");
    const names = Array.from(items).map((el) => el.textContent?.trim() ?? "");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    wrapper.unmount();
  });

  it("marks current locale as active", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const active = document.querySelector(".os-menu-item--active");
    expect(active?.textContent?.trim()).toBe("English");
    wrapper.unmount();
  });

  it("switches locale on click", async () => {
    const wrapper = await mountSuspended(LocaleSwitch, {
      attachTo: document.body,
    });
    await openDropdown(wrapper);
    const deutsch = Array.from(
      document.querySelectorAll(".os-menu-item-link"),
    ).find((el) => el.textContent?.trim() === "Deutsch") as
      | HTMLButtonElement
      | undefined;
    expect(
      deutsch,
      'Expected "Deutsch" locale item to exist in dropdown',
    ).toBeDefined();
    deutsch!.click();
    // floating-vue needs time to close and update after locale switch
    await new Promise((r) => setTimeout(r, 100));
    await nextTick();

    // Re-open to check active state
    await openDropdown(wrapper);
    const active = document.querySelector(".os-menu-item--active");
    expect(active?.textContent?.trim()).toBe("Deutsch");
    wrapper.unmount();
  });
});
