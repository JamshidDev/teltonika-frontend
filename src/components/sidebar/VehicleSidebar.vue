<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import VehicleItem from './VehicleItem.vue'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Loader2,
  Radio,
  Activity,
  CalendarClock,
  History,
  ChevronUp,
  ChevronDown,
} from 'lucide-vue-next'
import { formatRelativeTime } from '@/lib/utils'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

// Tabs
type SidebarTab = 'live' | 'motion' | 'scheduled' | 'history'
const activeTab = ref<SidebarTab>('live')
const isBodyCollapsed = ref(false)

const tabs = computed(() => [
  { key: 'live' as SidebarTab, label: t('sidebar.live'), icon: Radio },
  { key: 'motion' as SidebarTab, label: t('sidebar.motion'), icon: Activity },
  { key: 'scheduled' as SidebarTab, label: t('sidebar.scheduled'), icon: CalendarClock },
  { key: 'history' as SidebarTab, label: t('sidebar.history'), icon: History },
])

// Motion events list
const motionEvents = computed(() => {
  const events = Array.from(vehiclesStore.carMotions.values())
  // Sort by most recent first
  return events.sort((a, b) => new Date(b.since).getTime() - new Date(a.since).getTime())
})

// Get status display info
function getStatusInfo(status: string) {
  switch (status) {
    case 'moving':
      return { color: '#22c55e', bgColor: 'bg-green-100 dark:bg-green-900', icon: '🚗' }
    case 'stop_candidate':
      return { color: '#eab308', bgColor: 'bg-yellow-100 dark:bg-yellow-900', icon: '🚗' }
    case 'stopped':
      return { color: '#f97316', bgColor: 'bg-orange-100 dark:bg-orange-900', icon: '⏸️' }
    case 'parking_candidate':
      return { color: '#eab308', bgColor: 'bg-yellow-100 dark:bg-yellow-900', icon: '🚗' }
    case 'parking':
      return { color: '#ef4444', bgColor: 'bg-red-100 dark:bg-red-900', icon: '🅿️' }
    default:
      return { color: '#6b7280', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: '🚗' }
  }
}

function selectVehicleFromMotion(carId: number) {
  vehiclesStore.selectVehicle(carId)
}

const vehicles = computed(() => vehiclesStore.filteredVehicles)

const localSearchQuery = ref('')

function handleSearch(event: Event) {
  const value = (event.target as HTMLInputElement).value
  localSearchQuery.value = value
  vehiclesStore.setSearchQuery(value)
}

// Infinite scroll
function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target

  // Load more when scrolled to bottom (with 100px threshold)
  if (scrollHeight - scrollTop - clientHeight < 100) {
    vehiclesStore.loadMore()
  }
}

onMounted(() => {
  vehiclesStore.fetchVehicles()
})
</script>

<template>
  <aside class="w-80 h-full bg-background flex flex-col">
    <!-- Header with Tabs -->
    <div class="border-b border-border">
      <TooltipProvider :delay-duration="0">
        <div class="flex">
          <Tooltip v-for="tab in tabs" :key="tab.key">
            <TooltipTrigger as-child>
              <button
                :class="[
                  'flex-1 py-3 flex items-center justify-center transition-colors border-b-2',
                  activeTab === tab.key
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                ]"
                @click="activeTab = tab.key"
              >
                <component :is="tab.icon" class="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {{ tab.label }}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>

    <!-- Body -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Coming Soon for scheduled/history tabs -->
      <div v-if="activeTab === 'scheduled' || activeTab === 'history'" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center text-muted-foreground">
          <div class="text-4xl mb-3">🚧</div>
          <p class="text-sm">{{ t('common.comingSoon') }}</p>
        </div>
      </div>

      <!-- Motion tab content -->
      <template v-else-if="activeTab === 'motion'">
        <div class="flex-1 overflow-y-auto">
          <div v-if="motionEvents.length === 0" class="p-4 text-center text-muted-foreground">
            <Activity class="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">{{ t('sidebar.noMotionEvents') }}</p>
          </div>
          <div v-else class="flex flex-col gap-2 p-2">
            <div
              v-for="motion in motionEvents"
              :key="motion.carId"
              class="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
              @click="selectVehicleFromMotion(motion.carId)"
            >
              <div class="flex items-center gap-3">
                <!-- Status Icon -->
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg',
                    getStatusInfo(motion.status).bgColor
                  ]"
                >
                  {{ getStatusInfo(motion.status).icon }}
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm truncate">{{ motion.carName }}</span>
                    <span
                      v-if="motion.carNumber"
                      class="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono"
                    >
                      {{ motion.carNumber }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between mt-1">
                    <span
                      class="text-xs font-medium"
                      :style="{ color: getStatusInfo(motion.status).color }"
                    >
                      {{ t(`motion.${motion.status}`) }}
                    </span>
                    <span class="text-[10px] text-muted-foreground">
                      {{ formatRelativeTime(motion.since, uiStore.language) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Live tab content -->
      <template v-else-if="activeTab === 'live'">
        <!-- Search -->
        <div class="p-3 flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              v-model="localSearchQuery"
              :placeholder="t('sidebar.search')"
              class="pl-9 shadow-none"
              @input="handleSearch"
              @focus="isBodyCollapsed && (isBodyCollapsed = false)"
            />
          </div>
          <button
            class="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent transition-colors"
            @click="isBodyCollapsed = !isBodyCollapsed"
          >
            <ChevronUp v-if="!isBodyCollapsed" class="h-4 w-4 text-muted-foreground" />
            <ChevronDown v-else class="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <!-- Collapsible body -->
        <template v-if="!isBodyCollapsed">
          <!-- Loading state -->
          <div
            v-if="vehiclesStore.loading"
            class="flex-1 flex items-center justify-center"
          >
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

          <!-- Vehicles List -->
          <div
            v-else
            class="flex-1 overflow-y-auto"
            @scroll="handleScroll"
          >
            <div v-if="vehicles.length === 0" class="p-4 text-center text-muted-foreground">
              {{ t('sidebar.noVehicles') }}
            </div>
            <div v-else class="flex flex-col gap-2 p-2">
              <VehicleItem
                v-for="vehicle in vehicles"
                :key="vehicle.carId"
                :vehicle="vehicle"
              />
            </div>

            <!-- Load more indicator -->
            <div
              v-if="vehiclesStore.loadingMore"
              class="py-3 flex items-center justify-center"
            >
              <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>
