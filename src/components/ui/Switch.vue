<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: boolean
    disabled?: boolean
  }>(),
  { modelValue: false, disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
           focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
    :class="modelValue ? 'bg-primary' : 'bg-muted-foreground/30'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform"
      :class="modelValue ? 'translate-x-[14px]' : 'translate-x-[2px]'"
    />
  </button>
</template>
