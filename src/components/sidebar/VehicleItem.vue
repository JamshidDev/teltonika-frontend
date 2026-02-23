<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import { formatRelativeTime, formatSpeed } from '@/lib/utils'
import { Car, Gauge, LocateFixed } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { VehicleWithPosition } from '@/types'

const props = defineProps<{
  vehicle: VehicleWithPosition
  collapsed?: boolean
}>()

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

const isSelected = computed(
  () => vehiclesStore.selectedVehicleId === props.vehicle.carId
)

const status = computed(() => vehiclesStore.getVehicleStatus(props.vehicle))

const speed = computed(() => {
  return props.vehicle.speed || 0
})

const lastUpdate = computed(() => {
  if (!props.vehicle.recordedAt) return '-'
  return formatRelativeTime(props.vehicle.recordedAt, uiStore.language)
})

const fromDate = ref('')
const toDate = ref('')

function selectVehicle() {
  vehiclesStore.selectVehicle(props.vehicle.carId)
}

function getDateRange(type: 'today' | 'yesterday'): { from: string; to: string } {
  const now = new Date()
  let from: Date
  let to: Date

  if (type === 'today') {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  } else {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0)
    to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

function showRoute(type: 'today' | 'yesterday') {
  const { from, to } = getDateRange(type)
  vehiclesStore.fetchRoute(props.vehicle.carId, from, to)
}

function showRouteCustom() {
  if (!fromDate.value || !toDate.value) return

  const from = new Date(fromDate.value)
  const to = new Date(toDate.value)

  vehiclesStore.fetchRoute(props.vehicle.carId, from.toISOString(), to.toISOString())
}

</script>

<template>
  <div
    :class="[
      'p-3 cursor-pointer hover:bg-accent transition-colors',
      isSelected && 'bg-accent',
    ]"
    @click="selectVehicle"
  >
    <!-- Collapsed view -->
    <div v-if="collapsed" class="flex justify-center">
      <Car
        :class="[
          'h-6 w-6',
          status === 'online' || status === 'moving'
            ? 'text-green-500'
            : 'text-muted-foreground',
        ]"
      />
    </div>

    <!-- Expanded view -->
    <div v-else class="flex items-start gap-3">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center',
            status === 'online' || status === 'moving'
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-gray-100 dark:bg-gray-800',
          ]"
        >
          <Car
            :class="[
              'h-5 w-5',
              status === 'online' || status === 'moving'
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500',
            ]"
          />
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-foreground truncate">
            {{ vehicle.name }}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <button
                class="p-1 rounded hover:bg-background transition-colors"
                :title="t('nav.history')"
                @click.stop
              >
                <LocateFixed class="h-4 w-4 text-muted-foreground hover:text-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="w-56">
              <DropdownMenuItem @click="showRoute('today')">
                {{ t('history.today') }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="showRoute('yesterday')">
                {{ t('history.yesterday') }}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel class="text-xs">{{ t('history.customDate') }}</DropdownMenuLabel>
              <div class="px-2 pb-2 space-y-2" @click.stop>
                <div>
                  <label class="text-xs text-muted-foreground">{{ t('history.from') }}</label>
                  <input
                    v-model="fromDate"
                    type="datetime-local"
                    class="w-full h-8 px-2 text-sm rounded border border-input bg-background"
                  />
                </div>
                <div>
                  <label class="text-xs text-muted-foreground">{{ t('history.to') }}</label>
                  <input
                    v-model="toDate"
                    type="datetime-local"
                    class="w-full h-8 px-2 text-sm rounded border border-input bg-background"
                  />
                </div>
                <button
                  class="w-full h-8 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                  @click="showRouteCustom"
                >
                  {{ t('common.confirm') }}
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p class="text-sm text-muted-foreground truncate font-mono text-xs">
          {{ vehicle.deviceImei }}
        </p>

        <div class="flex items-center justify-between mt-1">
          <!-- Speed -->
          <div class="flex items-center gap-1">
            <Gauge
              :class="[
                'h-3.5 w-3.5',
                speed > 0 ? 'text-green-600' : 'text-muted-foreground',
              ]"
            />
            <span
              :class="[
                'font-medium text-[10px]',
                speed > 0 ? 'text-green-600' : 'text-muted-foreground',
              ]"
            >
              {{ formatSpeed(speed) }}
            </span>
          </div>

          <!-- Last update -->
          <span class="text-[10px] text-muted-foreground">
            {{ lastUpdate }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
