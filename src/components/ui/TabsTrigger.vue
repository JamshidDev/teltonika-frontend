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

function handleClick() {
  context?.setActiveTab(props.value)
}
</script>

<template>
  <button
    :class="
      cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        $props.class
      )
    "
    @click="handleClick"
  >
    <slot />
  </button>
</template>
