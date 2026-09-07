<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Check } from 'lucide-vue-next'
import { mapTiles } from '@/config/mapTiles'
import { useUiStore } from '@/stores/ui.store'

const { t } = useI18n()
const uiStore = useUiStore()
</script>

<template>
  <div class="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
    <div class="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {{ t('map.layers') }}
    </div>
    <button
      v-for="(tile, key) in mapTiles"
      :key="key"
      class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
      :class="uiStore.mapTile === key ? 'bg-accent' : 'hover:bg-accent/60 active:bg-accent/60'"
      @click="uiStore.setMapTile(key)"
    >
      <span class="flex-1 text-sm font-medium">{{ tile.name }}</span>
      <Check v-if="uiStore.mapTile === key" class="h-4 w-4 text-primary" />
    </button>
  </div>
</template>
