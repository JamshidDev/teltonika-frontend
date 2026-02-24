<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <RouterView />
  <Toaster
    position="top-right"
    :duration="4000"
    richColors
    dir="auto"
  />
</template>

<style>
[data-sonner-toaster] {
  position: fixed !important;
  z-index: 9999 !important;
  top: 16px !important;
  right: 16px !important;
}
</style>
