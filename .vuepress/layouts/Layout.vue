<script setup>
import ParentLayout from '@vuepress/theme-default/layouts/Layout.vue'
</script>

<template>
  <ParentLayout>
    <template #page-bottom>
      <div class="my-footer">CC BY busFaktor() e.V. & Authors</div>
    </template>
  </ParentLayout>
</template>

<style lang="css">
.my-footer {
  text-align: center;
  height: 50px;
  position: relative;
  bottom: 0;
  width: 100%;
}
</style>