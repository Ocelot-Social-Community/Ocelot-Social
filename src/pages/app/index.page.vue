<template>
  <DefaultLayout>
    <template #sidemenu>
      <v-list rounded>
        <v-list-item link title="Value" :active="page === undefined" href="/app"></v-list-item>
        <v-list-item link title="Increase" :active="page === 'inc'" href="/app/inc"></v-list-item>

        <v-divider class="my-2"></v-divider>
        <v-list-item link title="Reset" :active="page === 'reset'" href="/app/reset"></v-list-item>
      </v-list>
    </template>

    <template #default>
      <div v-if="page === undefined">
        <h1>The Counter</h1>
        <p>
          The current value of the counter is:
          <ClientOnly
            ><b>{{ counter.count }}</b></ClientOnly
          >
        </p>
      </div>
      <div v-else-if="page === 'inc'">
        <h1>Increase the Counter</h1>
        <ClientOnly>
          <v-btn elevation="2" @click="counter.increment()">{{ counter.count }}</v-btn>
        </ClientOnly>
      </div>
      <div v-else-if="page === 'reset'">
        <h1>Reset the Counter</h1>
        <ClientOnly>
          <v-btn elevation="2" @click="counter.reset()">{{ counter.count }}</v-btn>
        </ClientOnly>
      </div>
    </template>
  </DefaultLayout>
</template>

<script lang="ts" setup>
import ClientOnly from '#components/ClientOnly.vue'
import DefaultLayout from '#layouts/DefaultLayout.vue'
import { useCounterStore } from '#stores/counter'

const counter = useCounterStore()
defineProps(['page'])
</script>
