<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  disabled?: boolean
  class?: string
}>()
</script>

<template>
  <button
    :class="
      cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
        disabled && 'pointer-events-none opacity-50',
        $props.class
      )
    "
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
