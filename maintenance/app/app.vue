<template>
  <div class="container">
    <OsCard>
      <div class="card-inner">
        <div class="locale-switch">
          <LocaleSwitch />
        </div>
        <div class="layout">
          <div class="layout__image">
            <img
              class="logo"
              :alt="t('maintenance.title', metadata)"
              :src="logoUrl"
            />
          </div>
          <div class="layout__content">
            <h1 class="heading">{{ t("maintenance.title", metadata) }}</h1>
            <p class="text">{{ t("maintenance.explanation") }}</p>
            <p class="text">
              {{ t("maintenance.questions") }}
              <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>.
            </p>
          </div>
        </div>
      </div>
    </OsCard>
  </div>
</template>

<script setup lang="ts">
import { OsCard } from "@ocelot-social/ui";

import LocaleSwitch from "~/components/LocaleSwitch.vue";
import emails from "~/constants/emails";
import metadata from "~/constants/metadata";

const { t } = useI18n();

const supportEmail = emails.SUPPORT_EMAIL;
const logoUrl = "/img/custom/logo-squared.svg";

const pageTitle = computed(() => t("maintenance.title", metadata));

useHead({
  title: pageTitle,
  meta: [
    { name: "description", content: metadata.APPLICATION_DESCRIPTION },
    { name: "theme-color", content: metadata.THEME_COLOR },
    { property: "og:title", content: pageTitle },
    { property: "og:description", content: metadata.APPLICATION_DESCRIPTION },
    { property: "og:image", content: metadata.OG_IMAGE },
    { property: "og:image:alt", content: metadata.OG_IMAGE_ALT },
    { property: "og:image:width", content: metadata.OG_IMAGE_WIDTH },
    { property: "og:image:height", content: metadata.OG_IMAGE_HEIGHT },
    { property: "og:image:type", content: metadata.OG_IMAGE_TYPE },
    { property: "og:type", content: "website" },
  ],
});
</script>

<style scoped>
.container {
  max-width: 700px;
  margin: 80px auto;
  padding: 0 16px;
}

.card-inner {
  position: relative;
  min-height: 280px;
  display: flex;
  align-items: center;
}

.locale-switch {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
}

.layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  width: 100%;
}

.layout__image {
  display: flex;
  justify-content: center;
}

@media (min-width: 640px) {
  .layout {
    flex-direction: row;
    align-items: center;
  }

  .layout__image {
    flex: 0 0 35%;
  }

  .layout__content {
    flex: 1 1 0;
  }
}

.logo {
  width: 90%;
  max-width: 200px;
  height: auto;
}

.heading {
  font-family: LatoWeb, sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--color-text-base);
  margin: 0 0 1em;
}

.text {
  font-family: LatoWeb, sans-serif;
  color: var(--color-text-base);
  line-height: 1.3;
  margin: 0 0 1em;
}

.text a {
  color: var(--color-primary);
  text-decoration: none;
}

.text a:hover {
  text-decoration: underline;
}
</style>
