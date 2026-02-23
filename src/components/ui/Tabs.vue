<script setup lang="ts">
import { provide, ref, computed } from 'vue'
import { TabsContextKey, type TabsContext } from './tabs-context'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    defaultValue?: string
  }>(),
  {
    defaultValue: '',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = ref(props.modelValue || props.defaultValue)

const context = computed<TabsContext>(() => ({
  activeTab,
  setActiveTab: (value: string) => {
    activeTab.value = value
    emit('update:modelValue', value)
  },
}))

provide(TabsContextKey, context.value)
</script>

<template>
  <div class="w-full">
    <slot />
  </div>
</template>
