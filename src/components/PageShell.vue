<template>
  <v-app>
    <v-container>
      <div class="layout">
        <div class="navigation">
          <a href="/" class="logo">
            <img src="./logo.svg" height="64" width="64" alt="logo" />
          </a>
          <VikeLink href="/">Home</VikeLink>
          <VikeLink href="/about">About</VikeLink>
        </div>
        <div class="content"><slot /></div>
      </div>
    </v-container>
  </v-app>
</template>

<script lang="ts" setup>
import VikeLink from './VikeLink.vue'
</script>

<style>
body {
  margin: 0;
  font-family: sans-serif;
}

* {
  box-sizing: border-box;
}

a {
  text-decoration: none;
}
</style>

<style scoped>
.layout {
  display: flex;
  max-width: 900px;
  margin: auto;
}

.content {
  min-height: 100vh;
  padding: 20px;
  padding-bottom: 50px;
  border-left: 2px solid #eee;
}

.navigation {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  padding: 20px;
  line-height: 1.8em;
}

.logo {
  margin-top: 20px;
  margin-bottom: 10px;
}
</style>
