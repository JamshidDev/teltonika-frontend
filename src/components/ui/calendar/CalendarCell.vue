<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { CalendarCell, type CalendarCellProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <CalendarCell
    :class="cn('relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([data-selected])]:bg-accent first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md [&:has([data-selected][data-outside-month])]:bg-accent/50', props.class)"
    v-bind="props"
  >
    <slot />
  </CalendarCell>
</template>
