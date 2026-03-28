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
        <OsIcon :icon="languageIcon" />
      </template>
    </OsButton>

    <template #popper="{ hide }">
      <ul class="locale-list">
        <li v-for="loc in sortedLocales" :key="loc.code">
          <button
            class="locale-item"
            :class="{ 'locale-item--active': loc.code === locale }"
            type="button"
            @click="switchLocale(loc.code, hide)"
          >
            {{ loc.name }}
          </button>
        </li>
      </ul>
    </template>
  </VDropdown>
</template>

<script setup lang="ts">
import { OsButton, OsIcon } from "@ocelot-social/ui";
import { ocelotIcons } from "@ocelot-social/ui/ocelot";

const { locale, locales, setLocale, t } = useI18n();

const languageIcon = ocelotIcons.language;

const sortedLocales = computed(() =>
  locales.value
    .filter((l): l is { code: string; name: string } => typeof l !== "string")
    .sort((a, b) => a.name.localeCompare(b.name)),
);

async function switchLocale(code: string, hide: () => void) {
  await setLocale(code);
  hide();
}
</script>

<style>
.locale-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.locale-item {
  display: block;
  width: 100%;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  padding: 8px 24px 8px 12px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--color-text-base);
  text-align: left;
  line-height: 1.3;
  transition:
    color 80ms ease-out,
    border-left-color 80ms ease-out;
}

.locale-item:hover {
  color: var(--color-primary);
  border-left-color: var(--color-primary);
}

.locale-item--active {
  color: var(--color-primary);
  font-weight: 600;
  border-left-color: var(--color-primary);
  background-color: var(--color-background-soft);
}
</style>
