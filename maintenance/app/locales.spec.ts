import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const LOCALES_DIR = resolve(__dirname, "../locales");
const WEBAPP_LOCALES_DIR = resolve(__dirname, "../../webapp/locales");

function loadJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

function getLocaleFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const maintenanceLocales = getLocaleFiles(LOCALES_DIR);
const webappLocales = getLocaleFiles(WEBAPP_LOCALES_DIR);
const referenceKeys = getKeys(loadJson(resolve(LOCALES_DIR, "en.json")));

describe("locales", () => {
  it("has all webapp languages available", () => {
    expect(maintenanceLocales).toEqual(webappLocales);
  });

  describe("completeness", () => {
    for (const locale of maintenanceLocales) {
      it(`${locale}.json has all keys from en.json`, () => {
        const localeData = loadJson(resolve(LOCALES_DIR, `${locale}.json`));
        const keys = getKeys(localeData);
        expect(keys).toEqual(referenceKeys);
      });
    }
  });

  describe("no empty values", () => {
    for (const locale of maintenanceLocales) {
      it(`${locale}.json has no empty strings`, () => {
        const content = readFileSync(
          resolve(LOCALES_DIR, `${locale}.json`),
          "utf-8",
        );
        expect(content).not.toMatch(/:\s*""\s*[,}]/);
      });
    }
  });
});
