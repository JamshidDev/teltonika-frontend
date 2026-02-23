<script setup lang="ts">
import { inject, computed } from 'vue'
import { TabsContextKey, type TabsContext } from './tabs-context'
import { cn } from '@/lib/utils'

const props = defineProps<{
  value: string
  class?: string
}>()

const context = inject<TabsContext>(TabsContextKey)

const isActive = computed(() => context?.activeTab.value === props.value)
</script>

<template>
  <div
    v-if="isActive"
    :class="
      cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        $props.class
      )
    "
  >
    <slot />
  </div>
</template>
