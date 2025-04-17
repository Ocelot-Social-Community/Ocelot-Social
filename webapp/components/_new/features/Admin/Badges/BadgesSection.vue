<template>
  <div class="badge-section">
    <h4>{{ title }}</h4>
    <div class="badge-container">
      <button
        v-for="badge in badges"
        :key="badge.id"
        @click="toggleBadge(badge)"
        :class="{ badge, inactive: !badge.isActive }"
      >
        <img :src="badge.icon" :alt="badge.description" />
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
    },
    badges: {
      type: Array,
    },
  },
  methods: {
    toggleBadge(badge) {
      this.$emit('toggleBadge', badge)
    },
  },
}
</script>

<style scoped>
.badge-section h4 {
  margin-bottom: 10px;
}
.badge-container {
  display: flex;
  margin-bottom: 20px;
  flex-flow: row wrap;
  gap: 4px;
}
.badge:hover {
  cursor: pointer;
}
.badge img {
  width: 30px;
}
.badge.inactive {
  opacity: 0.5;
}
</style>
