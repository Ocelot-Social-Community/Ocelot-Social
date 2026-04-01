<template>
  <VDropdown :distance="8" placement="bottom-start">
    <OsButton
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="t('localeSwitch.tooltip')"
      :title="t('localeSwitch.tooltip')"
    >
      <template #icon>
        <OsIcon :icon="languageIcon" size="lg" />
      </template>
    </OsButton>

    <template #popper="{ hide }">
      <OsMenu
        dropdown
        link-tag="button"
        :routes="sortedLocales"
        :name-parser="(r: Record<string, unknown>) => r.name as string"
        :matcher="
          (_url: string, r: Record<string, unknown>) => r.code === locale
        "
      >
        <template #menuitem="{ route, parents }">
          <OsMenuItem
            :route="route"
            :parents="parents"
            @click="
              (_e: Event, r: Record<string, unknown>) =>
                switchLocale(r.code as LocaleCode, hide)
            "
          />
        </template>
      </OsMenu>
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import { OsButton, OsIcon, OsMenu, OsMenuItem } from "@ocelot-social/ui";
import { ocelotIcons } from "@ocelot-social/ui/ocelot";

import type { GeneratedTypeConfig } from "@intlify/core-base";

type LocaleCode = GeneratedTypeConfig["locale"];

const { locale, locales, setLocale, t } = useI18n();

const languageIcon = ocelotIcons.language;

const sortedLocales = computed(() =>
  locales.value
    .filter((l) => typeof l !== "string" && l.name)
    .map((l) => ({
      code: (l as { code: LocaleCode }).code,
      name: (l as { name: string }).name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

async function switchLocale(code: LocaleCode, hide: () => void) {
  await setLocale(code);
  hide();
}
</script>
