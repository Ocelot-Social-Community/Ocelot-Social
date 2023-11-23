<template>
  <TopMenu />
  <v-main class="bg-grey-lighten-3">
    <v-container>
      <v-row>
        <v-col v-if="slots.sidemenu" cols="2">
          <v-sheet rounded>
            <slot name="sidemenu"></slot>
          </v-sheet>
        </v-col>

        <v-col>
          <v-sheet rounded class="pa-3">
            <slot />
          </v-sheet>
        </v-col>
      </v-row>
    </v-container>
  </v-main>
</template>

<script lang="ts" setup>
import { useSlots } from 'vue'

import TopMenu from '#components/menu/TopMenu.vue'

const slots = useSlots()
</script>
