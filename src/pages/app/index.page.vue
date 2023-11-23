<template>
  <DefaultLayout>
    <template #sidemenu>
      <v-list rounded>
        <v-list-item
          link
          :title="$t('app.value.menu')"
          :active="page === null"
          href="/app"
        ></v-list-item>
        <v-list-item
          link
          :title="$t('app.inc.menu')"
          :active="page === 'inc'"
          href="/app/inc"
        ></v-list-item>

        <v-divider class="my-2"></v-divider>
        <v-list-item
          link
          :title="$t('app.reset.menu')"
          :active="page === 'reset'"
          href="/app/reset"
        ></v-list-item>
      </v-list>
    </template>

    <template #default>
      <div v-if="page === null">
        <h1>{{ $t('app.value.h1') }}</h1>
        <i18n-t scope="global" keypath="app.value.text" tag="p">
          <template #count>
            <ClientOnly>
              <b>{{ counter.count }}</b>
            </ClientOnly>
          </template>
        </i18n-t>
      </div>
      <div v-else-if="page === 'inc'">
        <h1>{{ $t('app.inc.h1') }}</h1>
        <ClientOnly>
          <v-btn elevation="2" @click="counter.increment()">{{
            $t('app.inc.text', { count: counter.count })
          }}</v-btn>
        </ClientOnly>
      </div>
      <div v-else-if="page === 'reset'">
        <h1>{{ $t('app.reset.h1') }}</h1>
        <ClientOnly>
          <v-btn elevation="2" @click="counter.reset()">{{
            $t('app.reset.text', { count: counter.count })
          }}</v-btn>
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
defineProps({ page: { type: String, default: null } })
</script>
