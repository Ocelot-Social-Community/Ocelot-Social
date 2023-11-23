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
          The current value of the counter is: <b>{{ counter.count }}</b>
        </p>
      </div>
      <div v-else-if="page === 'inc'">
        <h1>Increase the Counter</h1>
        <v-btn elevation="2" @click="counter.increment()">{{ counter.count }}</v-btn>
      </div>
      <div v-else-if="page === 'reset'">
        <h1>Reset the Counter</h1>
        <v-btn elevation="2" @click="counter.reset()">{{ counter.count }}</v-btn>
      </div>
    </template>
  </DefaultLayout>
</template>

<script lang="ts" setup>
import { usePageContext } from '#context/usePageContext'
import DefaultLayout from '#layouts/DefaultLayout.vue'
import { useCounterStore } from '#stores/counter'

const counter = useCounterStore()

const {
  routeParams: { id: page },
} = usePageContext()
</script>
