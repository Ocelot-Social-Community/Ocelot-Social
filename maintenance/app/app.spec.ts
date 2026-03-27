import { mountSuspended } from "@nuxt/test-utils/runtime";
import { describe, expect, it, vi } from "vitest";

import App from "./app.vue";

describe("app", () => {
  it("renders maintenance heading", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find("h1").text()).toBe("Maintenance");
  });

  it("renders reload button", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find("button").text()).toBe("Reload");
  });

  it("renders OsCard component", async () => {
    const wrapper = await mountSuspended(App);
    expect(wrapper.find(".os-card").exists()).toBe(true);
  });

  it("calls window.location.reload on button click", async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });
    const wrapper = await mountSuspended(App);
    await wrapper.find("button").trigger("click");
    expect(reloadMock).toHaveBeenCalled();
  });
});
