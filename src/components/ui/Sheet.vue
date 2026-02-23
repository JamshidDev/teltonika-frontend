<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    open?: boolean
    side?: 'left' | 'right' | 'top' | 'bottom'
    title?: string
  }>(),
  {
    open: false,
    side: 'right',
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

function close() {
  isOpen.value = false
}

const sideClasses = {
  left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
  right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
  top: 'inset-x-0 top-0 border-b',
  bottom: 'inset-x-0 bottom-0 border-t',
}

// Slide classes can be added to enhance animations if needed
// const slideClasses = { left: '...', right: '...', top: '...', bottom: '...' }
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50"
      >
        <!-- Backdrop -->
        <div
          class="fixed inset-0 bg-black/80"
          @click="close"
        />

        <!-- Sheet content -->
        <div
          :class="
            cn(
              'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out duration-300',
              sideClasses[side]
            )
          "
        >
          <!-- Header -->
          <div v-if="title" class="flex flex-col space-y-2 mb-4">
            <h2 class="text-lg font-semibold text-foreground">
              {{ title }}
            </h2>
          </div>

          <!-- Content -->
          <slot />

          <!-- Close button -->
          <button
            class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            @click="close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span class="sr-only">Close</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
</style>
