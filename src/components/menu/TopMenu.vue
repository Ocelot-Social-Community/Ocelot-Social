<template>
  <v-app-bar flat>
    <v-row>
      <v-col>
        <LogoAvatar />
      </v-col>
      <v-col class="d-flex align-center justify-center grow">
        <VikeBtn href="/">{{ $t('menu.home') }}</VikeBtn>
        <VikeBtn href="/app">{{ $t('menu.app') }}</VikeBtn>
        <VikeBtn href="/about">{{ $t('menu.about') }}</VikeBtn>
      </v-col>
      <v-col>
        <v-switch
          v-model="isEnabled"
          class="d-flex justify-end mr-5"
          :label="$t('language.german')"
          color="success"
          @update:model-value="onChange"
        ></v-switch>
      </v-col>
    </v-row>
  </v-app-bar>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useLocale } from 'vuetify'

import VikeBtn from '#components/VikeBtn.vue'

import LogoAvatar from './LogoAvatar.vue'

const { current: locale } = useLocale()
const isEnabled = ref(locale.value === 'de')
const onChange = () => {
  locale.value = isEnabled.value ? 'de' : 'en'
}
</script>
