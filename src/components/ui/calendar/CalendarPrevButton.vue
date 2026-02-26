<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { CalendarPrev, type CalendarPrevProps } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ChevronLeft } from "lucide-vue-next"

const props = defineProps<CalendarPrevProps & { class?: HTMLAttributes["class"] }>()
</script>

<template>
  <CalendarPrev
    :class="cn(
      buttonVariants({ variant: 'outline' }),
      'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
      props.class,
    )"
    v-bind="props"
  >
    <slot>
      <ChevronLeft class="h-4 w-4" />
    </slot>
  </CalendarPrev>
</template>
