<template>
  <nav class="locale-switch">
    <ul class="locale-list">
      <li v-for="loc in availableLocales" :key="loc.code" class="locale-item">
        <button
          class="locale-button"
          :class="{ 'locale-button--active': loc.code === locale }"
          type="button"
          @click="switchLocale(loc.code)"
        >
          {{ loc.name }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n();

const availableLocales = computed(() =>
  locales.value.filter((l): l is { code: string; name: string } => typeof l !== "string"),
);

async function switchLocale(code: string) {
  await setLocale(code);
}
</script>

<style scoped>
.locale-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.locale-button {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-base);
  transition: all 80ms ease-out;
}

.locale-button:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.locale-button--active {
  color: var(--color-primary);
  font-weight: 600;
  border-color: var(--color-primary);
}
</style>
