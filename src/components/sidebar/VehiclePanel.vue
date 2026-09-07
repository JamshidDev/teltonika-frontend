<script setup lang="ts">
import VehicleSidebar from '@/components/sidebar/VehicleSidebar.vue'
import { useUiStore } from '@/stores/ui.store'

const uiStore = useUiStore()
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <VehicleSidebar
      :tab="uiStore.panelTab"
      hide-tabs
      class="min-h-0 flex-1 overflow-hidden"
    />
  </div>
</template>
