<template>
  <div class="tab-navigation">
    <os-card class="ds-tab-nav">
      <ul class="Tabs">
        <li
          v-for="tab in tabs"
          :key="tab.type"
          :class="[
            'Tabs__tab',
            'pointer',
            activeTab === tab.type && '--active',
            tab.disabled && '--disabled',
          ]"
          :data-test="tab.type + '-tab'"
        >
          <a :data-test="tab.type + '-tab-click'" @click="switchTab(tab)">
            <div class="ds-my-small">
              <client-only :placeholder="$t('client-only.loading')">
                <os-number :count="tab.count" :label="tab.title" :animated="true" />
              </client-only>
            </div>
          </a>
        </li>
      </ul>
    </os-card>
  </div>
</template>

<script>
import { OsCard, OsNumber } from '@ocelot-social/ui'

export default {
  components: {
    OsCard,
    OsNumber,
  },
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    activeTab: {
      type: String,
      default: null,
    },
  },
  methods: {
    switchTab(tab) {
      if (!tab.disabled) {
        this.$emit('switch-tab', tab.type)
      }
    },
  },
}
</script>

<style>
.pointer {
  cursor: pointer;
}

.Tabs {
  position: relative;
  height: 100%;
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

.Tabs__tab {
  text-align: center;
  height: 100%;
  flex-grow: 1;

  &:hover {
    border-bottom: 2px solid var(--color-neutral-70);
  }

  &.--active {
    border-bottom: 2px solid var(--color-primary);
  }
  &.--disabled {
    opacity: var(--opacity-disabled);
    &:hover {
      border-bottom: none;
    }
  }
}
.tab-navigation {
  position: sticky;
  top: var(--header-height);
  z-index: var(--z-index-sticky);
  transition: top 0.15s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
.ds-tab-nav.os-card {
  padding: 0 !important;

  .ds-tab-nav-item {
    &.ds-tab-nav-item-active {
      border-bottom: 3px solid var(--color-primary);
      &:first-child {
        border-bottom-left-radius: var(--border-radius-x-large);
      }
      &:last-child {
        border-bottom-right-radius: var(--border-radius-x-large);
      }
    }
  }
}
@supports (container-type: scroll-state) {
  .tab-navigation {
    container-type: scroll-state;
    container-name: tab-nav;
  }
  .ds-tab-nav.os-card {
    border-radius: var(--border-radius-x-large) var(--border-radius-x-large) 0 0 !important;
    transition: border-radius 0.15s ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
  @container tab-nav scroll-state(stuck: top) {
    .ds-tab-nav.os-card {
      border-radius: 0 !important;
    }
  }
}
</style>
