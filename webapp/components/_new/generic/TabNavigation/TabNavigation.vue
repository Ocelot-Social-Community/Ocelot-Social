<template>
  <ds-grid-item class="tab-navigation" :row-span="tabs.length" column-span="fullWidth">
    <base-card class="ds-tab-nav">
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
            <ds-space margin="small">
              <client-only :placeholder="$t('client-only.loading')">
                <ds-number :label="tab.title">
                  <hc-count-to slot="count" :end-val="tab.count" />
                </ds-number>
              </client-only>
            </ds-space>
          </a>
        </li>
      </ul>
    </base-card>
  </ds-grid-item>
</template>

<script>
import HcCountTo from '~/components/CountTo.vue'

export default {
  components: {
    HcCountTo,
  },
  props: {
    tabs: {
      type: Array,
      required: true,
    },
    activeTab: {
      type: String,
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

<style lang="scss">
.pointer {
  cursor: pointer;
}

.Tabs {
  position: relative;
  background-color: #fff;
  height: 100%;
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;

  &__tab {
    text-align: center;
    height: 100%;
    flex-grow: 1;

    &:hover {
      border-bottom: 2px solid #c9c6ce;
    }

    &.--active {
      border-bottom: 2px solid #17b53f;
    }
    &.--disabled {
      opacity: $opacity-disabled;
      &:hover {
        border-bottom: none;
      }
    }
  }
}
.tab-navigation {
  position: sticky;
  top: 53px;
  z-index: 2;
}
.ds-tab-nav.base-card {
  padding: 0;

  .ds-tab-nav-item {
    &.ds-tab-nav-item-active {
      border-bottom: 3px solid #17b53f;
      &:first-child {
        border-bottom-left-radius: $border-radius-x-large;
      }
      &:last-child {
        border-bottom-right-radius: $border-radius-x-large;
      }
    }
  }
}
</style>
