<template>
  <div style="max-width: 600px; margin: 80px auto; padding: 0 16px">
    <OsCard>
      <h1>Maintenance</h1>
      <p>We are currently performing scheduled maintenance. Please try again later.</p>
      <OsButton variant="primary" @click="reload">Reload</OsButton>
    </OsCard>
  </div>
</template>

<script setup lang="ts">
import { OsButton, OsCard } from "@ocelot-social/ui";

function reload() {
  window.location.reload();
}
</script>
