<template>
  <div class="container">
    <OsCard>
      <div class="locale-switch">
        <LocaleSwitch />
      </div>
      <div class="layout">
        <div class="layout__image">
          <img class="logo" :alt="t('maintenance.title', metadata)" :src="logoUrl" />
        </div>
        <div class="layout__content">
          <h3 class="heading">{{ t("maintenance.title", metadata) }}</h3>
          <p class="text">{{ t("maintenance.explanation") }}</p>
          <p class="text">
            {{ t("maintenance.questions") }}
            <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
          </p>
        </div>
      </div>
    </OsCard>
  </div>
</template>

<script setup lang="ts">
import { OsCard } from "@ocelot-social/ui";
import LocaleSwitch from "~/components/LocaleSwitch.vue";

const { t } = useI18n();

const metadata = {
  APPLICATION_NAME: "ocelot.social",
};

const supportEmail = "devops@ocelot.social";
const logoUrl = "/img/logo-squared.svg";
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 80px auto;
  padding: 0 16px;
}

.locale-switch {
  margin-bottom: 24px;
}

.layout {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.layout__image,
.layout__content {
  flex: 0 0 100%;
}

@media (min-width: 640px) {
  .layout__image,
  .layout__content {
    flex: 1 0 0;
  }
}

.logo {
  width: 75%;
  height: auto;
}

.heading {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-base);
  margin-bottom: 12px;
}

.text {
  color: var(--color-text-base);
  line-height: 1.5;
  margin-bottom: 8px;
}

.text a {
  color: var(--color-primary);
}
</style>
