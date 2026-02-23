<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/ui.store'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import { formatRelativeTime, formatSpeed } from '@/lib/utils'
import { X, Car, MapPin, Gauge, Clock } from 'lucide-vue-next'
import type { Vehicle } from '@/types'

const props = defineProps<{
  vehicle: Vehicle
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const uiStore = useUiStore()

const statusBadgeVariant = computed(() => {
  switch (props.vehicle.status) {
    case 'moving':
      return 'success'
    case 'stopped':
    case 'idle':
      return 'warning'
    case 'offline':
      return 'secondary'
    default:
      return 'default'
  }
})

const statusText = computed(() => t(`vehicle.${props.vehicle.status}`))

const speed = computed(() => props.vehicle.position?.speed || 0)

const lastUpdate = computed(() => {
  if (!props.vehicle.last_update) return '-'
  return formatRelativeTime(props.vehicle.last_update, uiStore.language)
})

const coordinates = computed(() => {
  if (!props.vehicle.position) return '-'
  const { latitude, longitude } = props.vehicle.position
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
})
</script>

<template>
  <div class="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
    <Card class="w-72 p-4 shadow-xl">
      <!-- Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          <div
            :class="[
              'w-8 h-8 rounded-full flex items-center justify-center',
              vehicle.status === 'moving'
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-gray-100 dark:bg-gray-800',
            ]"
          >
            <Car
              :class="[
                'h-4 w-4',
                vehicle.status === 'moving'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500',
              ]"
            />
          </div>
          <div>
            <h3 class="font-semibold text-foreground">{{ vehicle.name }}</h3>
            <p v-if="vehicle.plate_number" class="text-xs text-muted-foreground">
              {{ vehicle.plate_number }}
            </p>
          </div>
        </div>

        <button
          class="p-1 rounded-md hover:bg-accent transition-colors"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Status badge -->
      <div class="mb-3">
        <Badge :variant="statusBadgeVariant">
          {{ statusText }}
        </Badge>
      </div>

      <!-- Details -->
      <div class="space-y-2 text-sm">
        <!-- Speed -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Gauge class="h-4 w-4" />
            <span>{{ t('vehicle.speed') }}</span>
          </div>
          <span
            :class="[
              'font-medium',
              speed > 0 ? 'text-green-600' : 'text-foreground',
            ]"
          >
            {{ formatSpeed(speed) }}
          </span>
        </div>

        <!-- Location -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-muted-foreground">
            <MapPin class="h-4 w-4" />
            <span>{{ t('vehicle.address') }}</span>
          </div>
          <span class="font-medium text-xs text-right max-w-[140px] truncate">
            {{ vehicle.position?.address || coordinates }}
          </span>
        </div>

        <!-- Last update -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-muted-foreground">
            <Clock class="h-4 w-4" />
            <span>{{ t('vehicle.lastUpdate') }}</span>
          </div>
          <span class="font-medium">{{ lastUpdate }}</span>
        </div>
      </div>
    </Card>
  </div>
</template>
