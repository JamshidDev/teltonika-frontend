<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue"
import { CalendarDate, type DateValue } from "@internationalized/date"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-vue-next"

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"]
    placeholder?: string
  }>(),
  {
    placeholder: "Pick a date",
  },
)

const modelValue = defineModel<string>()

const dateValue = computed<DateValue | undefined>({
  get() {
    if (!modelValue.value) return undefined
    const [year, month, day] = modelValue.value.split("-").map(Number)
    return new CalendarDate(year!, month!, day!)
  },
  set(val) {
    if (val) {
      modelValue.value = `${val.year}-${String(val.month).padStart(2, "0")}-${String(val.day).padStart(2, "0")}`
    } else {
      modelValue.value = ""
    }
  },
})

const formattedDate = computed(() => {
  if (!dateValue.value) return props.placeholder
  const day = String(dateValue.value.day).padStart(2, "0")
  const month = String(dateValue.value.month).padStart(2, "0")
  const year = dateValue.value.year
  return `${day}.${month}.${year}`
})
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !dateValue && 'text-muted-foreground',
          props.class,
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ formattedDate }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="dateValue" />
    </PopoverContent>
  </Popover>
</template>
