<template>
  <div class="locale-switch" ref="container">
    <OsButton
      variant="primary"
      appearance="ghost"
      circle
      :aria-label="t('localeSwitch.tooltip')"
      :title="t('localeSwitch.tooltip')"
      @click="open = !open"
    >
      <template #icon>
        <OsIcon :icon="languageIcon" />
      </template>
    </OsButton>
    <div v-if="open" class="locale-dropdown">
      <ul class="locale-list">
        <li v-for="loc in sortedLocales" :key="loc.code">
          <button
            class="locale-item"
            :class="{ 'locale-item--active': loc.code === locale }"
            type="button"
            @click="switchLocale(loc.code)"
          >
            {{ loc.name }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { OsButton, OsIcon } from "@ocelot-social/ui";
import { ocelotIcons } from "@ocelot-social/ui/ocelot";

const { locale, locales, setLocale, t } = useI18n();

const container = ref<HTMLElement | null>(null);
const open = ref(false);
const languageIcon = ocelotIcons.language;

const sortedLocales = computed(() =>
  locales.value
    .filter((l): l is { code: string; name: string } => typeof l !== "string")
    .sort((a, b) => a.name.localeCompare(b.name)),
);

async function switchLocale(code: string) {
  await setLocale(code);
  open.value = false;
}

function onClickOutside(event: MouseEvent) {
  if (container.value && !container.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("click", onClickOutside));
onUnmounted(() => document.removeEventListener("click", onClickOutside));
</script>

<style scoped>
.locale-switch {
  position: relative;
  display: inline-block;
}

.locale-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 10;
  margin-top: 4px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
}

.locale-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.locale-item {
  display: block;
  width: 100%;
  background: none;
  border: none;
  border-left: 2px solid transparent;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-base);
  text-align: left;
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
