<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import { formatRelativeTime, formatSpeed } from '@/lib/utils'
import { Gauge, LocateFixed, Navigation, CirclePlay, CirclePause, CircleParking } from 'lucide-vue-next'
import carIcon from '@/assets/car-icon.svg'
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

const isFollowing = computed(
  () => vehiclesStore.followedVehicleId === props.vehicle.carId
)

const speed = computed(() => {
  return props.vehicle.speed || 0
})

const motionDisplay = computed(() => {
  const s = props.vehicle.status
  if (!s) return null
  if (s === 'moving' || s === 'stop_candidate') {
    return { label: 'MOVING', color: 'text-green-600 bg-green-100 dark:bg-green-900/50', icon: 'play' }
  }
  if (s === 'stopped' || s === 'parking_candidate') {
    return { label: 'STOP', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/50', icon: 'pause' }
  }
  if (s === 'parking') {
    return { label: 'PARKING', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/50', icon: 'parking' }
  }
  return null
})

const lastUpdate = computed(() => {
  if (!props.vehicle.recordedAt) return '-'
  return formatRelativeTime(props.vehicle.recordedAt, uiStore.language)
})


function selectVehicle() {
  // Boshqa car select bo'lsa kuzatuvni bekor qil
  if (vehiclesStore.followedVehicleId && vehiclesStore.followedVehicleId !== props.vehicle.carId) {
    vehiclesStore.unfollowVehicle()
  }
  // Tarix (route) ko'rsatilayotgan bo'lsa bekor qil
  if (vehiclesStore.routePoints.length > 0) {
    vehiclesStore.clearRoute()
  }
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
  // Tarix bosilsa kuzatuvni bekor qil
  if (vehiclesStore.followedVehicleId) {
    vehiclesStore.unfollowVehicle()
  }
  const { from, to } = getDateRange(type)
  vehiclesStore.fetchRoute(props.vehicle.carId, from, to)
}

function toggleFollow() {
  if (isFollowing.value) {
    vehiclesStore.unfollowVehicle()
  } else {
    // Kuzatuv boshlansa tarixni bekor qil
    if (vehiclesStore.routePoints.length > 0) {
      vehiclesStore.clearRoute()
    }
    vehiclesStore.followVehicle(props.vehicle.carId)
  }
}

</script>

<template>
  <div
    class="p-2 cursor-pointer hover:bg-accent transition-colors rounded-lg border border-border"
    :style="isSelected ? { borderLeftWidth: '6px', borderLeftColor: '#3b82f6', backgroundColor: 'hsl(var(--accent))' } : {}"
    @click="selectVehicle"
  >
    <!-- Collapsed view -->
    <div v-if="collapsed" class="flex justify-center">
      <img :src="carIcon" alt="car" class="h-5 w-5" />
    </div>

    <!-- Expanded view -->
    <div v-else class="flex items-center gap-2">
      <!-- Icon -->
      <div class="flex-shrink-0">
        <div
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center',
            motionDisplay?.icon === 'play'
              ? 'bg-green-100 dark:bg-green-900'
              : motionDisplay?.icon === 'pause'
                ? 'bg-orange-100 dark:bg-orange-900'
                : motionDisplay?.icon === 'parking'
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'bg-gray-100 dark:bg-gray-800',
          ]"
        >
          <img :src="carIcon" alt="car" class="h-6 w-6" />
        </div>
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 truncate">
            <h3 class="text-xs font-medium text-foreground truncate">
              {{ vehicle.name }}
            </h3>
            <span v-if="vehicle.carNumber" class="text-[10px] px-1 py-0.5 bg-muted rounded font-mono text-muted-foreground flex-shrink-0">
              {{ vehicle.carNumber }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <!-- Follow button -->
            <button
              :class="[
                'p-1 rounded-md transition-colors',
                isFollowing
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              ]"
              :title="isFollowing ? t('map.unfollow') : t('map.follow')"
              @click.stop="toggleFollow"
            >
              <Navigation :class="['h-[18px] w-[18px]', isFollowing ? '' : 'text-muted-foreground hover:text-primary']" />
            </button>
            <!-- Route button — show today's route -->
            <button
              class="p-1 rounded-md hover:bg-accent transition-colors"
              :title="t('history.today')"
              @click.stop="showRoute('today')"
            >
              <LocateFixed class="h-[18px] w-[18px] text-muted-foreground hover:text-primary" />
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <!-- Motion status badge -->
            <span
              v-if="motionDisplay"
              :class="['inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold', motionDisplay.color]"
            >
              <CirclePlay v-if="motionDisplay.icon === 'play'" class="h-2.5 w-2.5" />
              <CirclePause v-if="motionDisplay.icon === 'pause'" class="h-2.5 w-2.5" />
              <CircleParking v-if="motionDisplay.icon === 'parking'" class="h-2.5 w-2.5" />
              {{ motionDisplay.label }}
            </span>

            <!-- Speed -->
            <div class="flex items-center gap-0.5">
              <Gauge
                :class="[
                  'h-3 w-3',
                  speed > 0 ? 'text-green-600' : 'text-muted-foreground',
                ]"
              />
              <span
                :class="[
                  'font-medium text-[9px]',
                  speed > 0 ? 'text-green-600' : 'text-muted-foreground',
                ]"
              >
                {{ formatSpeed(speed) }}
              </span>
            </div>
          </div>

          <!-- Last update -->
          <span class="text-[9px] text-muted-foreground">
            {{ lastUpdate }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
