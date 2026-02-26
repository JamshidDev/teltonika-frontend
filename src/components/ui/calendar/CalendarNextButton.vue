<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { CalendarNext, type CalendarNextProps } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronRight } from "lucide-vue-next"

const props = defineProps<CalendarNextProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <CalendarNext
    :class="cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
      props.class,
    )"
    v-bind="props"
  >
    <slot>
      <ChevronRight class="h-4 w-4" />
    </slot>
  </CalendarNext>
</template>
