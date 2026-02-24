<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { Search, ChevronDown, X, Check } from 'lucide-vue-next'

export interface SelectOption {
  value: number | string
  label: string
  description?: string
  icon?: Component
}

const props = defineProps<{
  modelValue: number | string | null
  options: SelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | string | null]
}>()

const isOpen = ref(false)
const searchQuery = ref('')
const triggerRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return null
  return props.options.find(opt => opt.value === props.modelValue) || null
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(
    opt => opt.label.toLowerCase().includes(query) || opt.description?.toLowerCase().includes(query)
  )
})

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
  }
}

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  isOpen.value = false
  searchQuery.value = ''
}

function clearSelection() {
  emit('update:modelValue', null)
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    triggerRef.value &&
    !triggerRef.value.contains(target) &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative">
    <!-- Trigger -->
    <button
      ref="triggerRef"
      type="button"
      :disabled="disabled"
      :class="[
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        isOpen ? 'ring-1 ring-ring' : ''
      ]"
      @click="toggleDropdown"
    >
      <span :class="['flex items-center gap-2', selectedOption ? 'text-foreground' : 'text-muted-foreground']">
        <component
          v-if="selectedOption?.icon"
          :is="selectedOption.icon"
          class="h-4 w-4 text-primary flex-shrink-0"
        />
        {{ selectedOption?.label || placeholder || 'Tanlang...' }}
      </span>
      <div class="flex items-center gap-1">
        <button
          v-if="selectedOption"
          type="button"
          class="h-4 w-4 rounded-sm hover:bg-accent flex items-center justify-center"
          @click.stop="clearSelection"
        >
          <X class="h-3 w-3 text-muted-foreground" />
        </button>
        <ChevronDown
          :class="[
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen ? 'rotate-180' : ''
          ]"
        />
      </div>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg"
      >
        <!-- Search input -->
        <div class="p-2 border-b border-border">
          <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder || 'Qidirish...'"
              class="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              @click.stop
            />
          </div>
        </div>

        <!-- Options list -->
        <div class="max-h-[200px] overflow-y-auto p-1">
          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-6 text-center text-sm text-muted-foreground"
          >
            Topilmadi
          </div>
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            type="button"
            :class="[
              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-left transition-colors',
              option.value === modelValue
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-accent'
            ]"
            @click="selectOption(option)"
          >
            <Check
              :class="[
                'h-4 w-4 flex-shrink-0',
                option.value === modelValue ? 'opacity-100' : 'opacity-0'
              ]"
            />
            <component
              v-if="option.icon"
              :is="option.icon"
              :class="[
                'h-4 w-4 flex-shrink-0',
                option.value === modelValue ? 'text-primary' : 'text-muted-foreground'
              ]"
            />
            <div class="flex-1 min-w-0">
              <div class="font-medium truncate">{{ option.label }}</div>
              <div v-if="option.description" class="text-xs text-muted-foreground truncate">
                {{ option.description }}
              </div>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
