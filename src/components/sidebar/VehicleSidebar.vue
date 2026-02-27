<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useCarsStore } from '@/stores/cars.store'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Search,
  Loader2,
  Radio,
  Activity,
  Route,
  History,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Play,
  Square,
} from 'lucide-vue-next'
import carIconSvg from '@/assets/car-icon.svg'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { formatRelativeTime } from '@/lib/utils'
import { carsApi } from '@/api/cars'
import type { TimelineItem, RouteWithEventsResponse } from '@/types'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const carsStore = useCarsStore()
const uiStore = useUiStore()

// Tabs
type SidebarTab = 'live' | 'motion' | 'scheduled' | 'history'
const activeTab = ref<SidebarTab>('live')
const isBodyCollapsed = ref(false)

const tabs = computed(() => [
  { key: 'live' as SidebarTab, label: t('sidebar.live'), icon: Radio },
  { key: 'motion' as SidebarTab, label: t('sidebar.motion'), icon: Activity },
  { key: 'scheduled' as SidebarTab, label: t('sidebar.scheduled'), icon: Route },
  { key: 'history' as SidebarTab, label: t('sidebar.history'), icon: History },
])

// Clear map elements when switching tabs
watch(activeTab, (newTab, oldTab) => {
  // Clear live tab elements when leaving
  if (oldTab === 'live') {
    vehiclesStore.selectVehicle(null)
    vehiclesStore.unfollowVehicle()
    vehiclesStore.clearRoute()
  }

  // Clear scheduled tab elements when leaving
  if (oldTab === 'scheduled') {
    // Clear any scheduled route if exists
    vehiclesStore.clearRoute()
    vehiclesStore.clearSpotMarker()
    selectedTimelineIndex.value = null
  }

  // Clear motion tab elements when leaving
  if (oldTab === 'motion') {
    vehiclesStore.selectVehicle(null)
  }
})

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

// Scheduled tab - Date picker
const selectedDate = ref(new Date())
const dateScrollRef = ref<HTMLElement | null>(null)
const calendarOpen = ref(false)

// Convert Date to CalendarDate for the calendar component
const calendarValue = computed({
  get: () => {
    const d = selectedDate.value
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
  },
  set: (val: DateValue | undefined) => {
    if (val) {
      selectedDate.value = new Date(val.year, val.month - 1, val.day)
      calendarOpen.value = false
    }
  },
})

// Car selector for scheduled tab
const carSelectorOpen = ref(false)
const selectedScheduledCarId = ref<number | null>(null)

const selectedScheduledCar = computed(() => {
  if (!selectedScheduledCarId.value) return null
  return carsStore.cars.find(c => c.id === selectedScheduledCarId.value) || null
})

function selectScheduledCar(carId: number) {
  selectedScheduledCarId.value = carId
  carSelectorOpen.value = false
}

// Set first car as default when cars are loaded
watch(
  () => carsStore.cars,
  (cars) => {
    if (cars.length > 0 && !selectedScheduledCarId.value) {
      selectedScheduledCarId.value = cars[0].id
    }
  },
  { immediate: true }
)

// Timeline state
const timeline = ref<TimelineItem[]>([])
const timelineLoading = ref(false)
const selectedTimelineIndex = ref<number | null>(null)

// Format date to YYYY-MM-DD for API
function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Fetch timeline when car or date changes
async function fetchTimeline() {
  if (!selectedScheduledCarId.value) return

  timelineLoading.value = true
  selectedTimelineIndex.value = null // Clear selection when fetching new data
  try {
    const response = await carsApi.getRouteWithEvents({
      carId: selectedScheduledCarId.value,
      date: formatDateForApi(selectedDate.value),
    })
    timeline.value = response.timeline
  } catch (err) {
    console.error('Failed to fetch timeline:', err)
    timeline.value = []
  } finally {
    timelineLoading.value = false
  }
}

// Watch for car or date changes to fetch timeline
watch(
  [selectedScheduledCarId, selectedDate],
  () => {
    if (selectedScheduledCarId.value) {
      fetchTimeline()
    }
  },
  { immediate: true }
)

// Format duration in seconds to human readable
function formatDuration(seconds: number): string {
  if (seconds < 0) return '-'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}${t('time.hourShort')} ${minutes}${t('time.minShort')}`
  }
  return `${minutes}${t('time.minShort')}`
}

// Format time from ISO string
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString(uiStore.language, { hour: '2-digit', minute: '2-digit' })
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Calculate total route distance in km
function calculateRouteDistance(points: { lat: number; lng: number }[]): string {
  if (points.length < 2) return '0'

  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    totalDistance += calculateDistance(
      points[i - 1].lat,
      points[i - 1].lng,
      points[i].lat,
      points[i].lng
    )
  }

  return totalDistance.toFixed(1)
}

// Get route duration and times
function getRouteTimes(points: { lat: number; lng: number; recordedAt: string }[]) {
  if (points.length === 0) return { start: '-', end: '-', duration: '-', distance: '0' }

  const startTime = new Date(points[0].recordedAt)
  const endTime = new Date(points[points.length - 1].recordedAt)
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000

  return {
    start: formatTime(points[0].recordedAt),
    end: formatTime(points[points.length - 1].recordedAt),
    duration: formatDuration(durationSeconds),
    distance: calculateRouteDistance(points),
  }
}

// Handle timeline item click to show on map
function handleTimelineClick(item: TimelineItem, index: number) {
  selectedTimelineIndex.value = index

  if (item.type === 'parking' || item.type === 'stop') {
    // Clear any existing route first
    vehiclesStore.clearRoute()
    vehiclesStore.showSpotMarker({
      lat: item.lat,
      lng: item.lng,
      type: item.type,
      startAt: item.startAt,
      endAt: item.endAt,
    })
  } else if (item.type === 'route') {
    // Clear any existing spot marker first
    vehiclesStore.clearSpotMarker()
    // Use timeline route points directly (they have speed and angle)
    vehiclesStore.setRoutePoints(item.points, selectedScheduledCarId.value || undefined)
  }
}

// Get border color for selected timeline item
function getTimelineBorderColor(item: TimelineItem): string {
  switch (item.type) {
    case 'parking':
      return '#dc2626' // red-600
    case 'stop':
      return '#ea580c' // orange-600
    case 'route':
      return '#22c55e' // green-500
    default:
      return '#3b82f6' // blue-500
  }
}

// Handle route animation play/stop
function toggleRouteAnimation(event: Event, item: TimelineItem, index: number) {
  event.stopPropagation()

  if (item.type !== 'route') return

  // If already animating, stop it
  if (vehiclesStore.routeAnimating) {
    vehiclesStore.stopRouteAnimation()
    return
  }

  // First select the route card and draw the route
  if (selectedTimelineIndex.value !== index) {
    handleTimelineClick(item, index)
  }

  // Start animation after a small delay to ensure route is drawn
  setTimeout(() => {
    vehiclesStore.startRouteAnimation()
  }, 100)
}

// Generate dates array (today + 30 days back)
const scheduledDates = computed(() => {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    dates.push(date)
  }
  return dates
})

function formatDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) {
    return t('common.today')
  }
  if (isSameDay(date, yesterday)) {
    return t('common.yesterday')
  }

  // Short format: "25 Fev"
  const day = date.getDate()
  const monthNames: Record<string, string[]> = {
    uz: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'],
    ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  }
  const months = monthNames[uiStore.language] || monthNames.en
  return `${day} ${months[date.getMonth()]}`
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

function selectDate(date: Date) {
  selectedDate.value = date
}

function scrollDates(direction: 'left' | 'right') {
  if (dateScrollRef.value) {
    const scrollAmount = 150
    dateScrollRef.value.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }
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
  carsStore.fetchCars()
})
</script>

<template>
  <aside class="w-[420px] h-full bg-background flex flex-col">
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
      <!-- Coming Soon for history tab -->
      <div v-if="activeTab === 'history'" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center text-muted-foreground">
          <div class="text-4xl mb-3">🚧</div>
          <p class="text-sm">{{ t('common.comingSoon') }}</p>
        </div>
      </div>

      <!-- Scheduled tab content -->
      <div v-else-if="activeTab === 'scheduled'" class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- Car Selector Row -->
        <div class="border-b border-border flex-shrink-0">
          <div class="flex items-center justify-between p-2">
            <!-- Left: Selected car info -->
            <div class="flex-1 min-w-0">
              <template v-if="selectedScheduledCar">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-medium truncate">{{ selectedScheduledCar.name }}</span>
                  <span v-if="selectedScheduledCar.carNumber" class="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{{ selectedScheduledCar.carNumber }}</span>
                </div>
              </template>
              <template v-else>
                <p class="text-xs text-muted-foreground">{{ t('sidebar.selectCar') }}</p>
              </template>
            </div>

            <!-- Right: Car selector button -->
            <Popover v-model:open="carSelectorOpen">
              <PopoverTrigger as-child>
                <button
                  class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md bg-muted hover:bg-accent transition-colors"
                >
                  <img :src="carIconSvg" alt="car" class="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-72 p-0" align="end">
                <div class="max-h-64 overflow-y-auto">
                  <div
                    v-for="car in carsStore.cars"
                    :key="car.id"
                    :class="[
                      'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors',
                      selectedScheduledCarId === car.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent',
                    ]"
                    @click="selectScheduledCar(car.id)"
                  >
                    <img :src="carIconSvg" alt="car" class="h-5 w-5 flex-shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{{ car.name }}</p>
                      <p v-if="car.carNumber" class="text-xs text-muted-foreground font-mono">{{ car.carNumber }}</p>
                    </div>
                  </div>
                  <div v-if="carsStore.cars.length === 0" class="p-4 text-center text-sm text-muted-foreground">
                    {{ t('sidebar.noVehicles') }}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <!-- Date Picker -->
        <div class="border-b border-border flex-shrink-0">
          <div class="flex items-center gap-1 p-2">
            <!-- Left scroll button -->
            <button
              class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              @click="scrollDates('left')"
            >
              <ChevronLeft class="h-4 w-4 text-muted-foreground" />
            </button>

            <!-- Scrollable dates -->
            <div
              ref="dateScrollRef"
              class="flex-1 flex gap-1 overflow-x-auto scrollbar-hide"
              style="scroll-behavior: smooth;"
            >
              <button
                v-for="date in scheduledDates"
                :key="date.toISOString()"
                :class="[
                  'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0',
                  isSameDay(date, selectedDate)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-accent text-muted-foreground hover:text-foreground',
                ]"
                @click="selectDate(date)"
              >
                {{ formatDateLabel(date) }}
              </button>
            </div>

            <!-- Right scroll button -->
            <button
              class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              @click="scrollDates('right')"
            >
              <ChevronRight class="h-4 w-4 text-muted-foreground" />
            </button>

            <!-- Calendar picker -->
            <Popover v-model:open="calendarOpen">
              <PopoverTrigger as-child>
                <button
                  class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <CalendarIcon class="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="end">
                <Calendar v-model="calendarValue" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <!-- Timeline content -->
        <div class="flex-1 min-h-0 overflow-y-auto">
          <!-- Loading state -->
          <div v-if="timelineLoading" class="flex items-center justify-center p-8">
            <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
          </div>

          <!-- Empty state -->
          <div v-else-if="timeline.length === 0" class="flex items-center justify-center p-8">
            <div class="text-center text-muted-foreground">
              <Route class="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p class="text-sm">{{ t('sidebar.noRouteData') }}</p>
            </div>
          </div>

          <!-- Timeline cards -->
          <div v-else class="flex flex-col gap-2 p-2">
            <div
              v-for="(item, index) in timeline"
              :key="index"
              class="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
              :style="selectedTimelineIndex === index ? {
                borderLeftWidth: '4px',
                borderLeftColor: getTimelineBorderColor(item),
                backgroundColor: 'hsl(var(--accent))'
              } : {}"
              @click="handleTimelineClick(item, index)"
            >
              <!-- Parking Card -->
              <template v-if="item.type === 'parking'">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center flex-shrink-0">
                    <span class="text-lg font-bold text-red-600 dark:text-red-400">P</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-red-600 dark:text-red-400">{{ t('timeline.parking') }}</span>
                      <span class="text-xs font-bold">{{ formatDuration(item.duration) }}</span>
                    </div>
                    <div class="mt-1 text-[10px] text-muted-foreground">
                      <div><span class="font-bold text-foreground">{{ formatTime(item.startAt) }}</span> - <span class="font-bold text-foreground">{{ formatTime(item.endAt) }}</span></div>
                      <div class="font-mono mt-0.5">{{ item.lat.toFixed(6) }}, {{ item.lng.toFixed(6) }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Stop Card -->
              <template v-else-if="item.type === 'stop'">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                    <span class="text-lg font-bold text-orange-600 dark:text-orange-400">S</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-orange-600 dark:text-orange-400">{{ t('timeline.stop') }}</span>
                      <span class="text-xs font-bold">{{ formatDuration(item.duration) }}</span>
                    </div>
                    <div class="mt-1 text-[10px] text-muted-foreground">
                      <div><span class="font-bold text-foreground">{{ formatTime(item.startAt) }}</span> - <span class="font-bold text-foreground">{{ formatTime(item.endAt) }}</span></div>
                      <div class="font-mono mt-0.5">{{ item.lat.toFixed(6) }}, {{ item.lng.toFixed(6) }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Route Card -->
              <template v-else-if="item.type === 'route'">
                <div class="flex items-start gap-3">
                  <div class="flex flex-col items-center gap-1 flex-shrink-0">
                    <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span class="text-sm font-bold text-green-600 dark:text-green-400">A</span>
                    </div>
                    <div class="w-0.5 h-4 bg-green-300 dark:bg-green-700"></div>
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span class="text-sm font-bold text-blue-600 dark:text-blue-400">B</span>
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-green-600 dark:text-green-400">{{ t('timeline.route') }}</span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs font-bold">{{ getRouteTimes(item.points).distance }} km</span>
                        <span class="text-xs font-bold text-muted-foreground">{{ getRouteTimes(item.points).duration }}</span>
                        <!-- Play/Stop animation button -->
                        <button
                          class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                          :class="vehiclesStore.routeAnimating && selectedTimelineIndex === index
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'"
                          @click="toggleRouteAnimation($event, item, index)"
                        >
                          <Square v-if="vehiclesStore.routeAnimating && selectedTimelineIndex === index" class="h-3 w-3" />
                          <Play v-else class="h-3 w-3 ml-0.5" />
                        </button>
                      </div>
                    </div>
                    <!-- Start point -->
                    <div class="mt-1.5 text-[10px]">
                      <div class="flex items-center gap-1">
                        <span class="text-green-600 dark:text-green-400 font-medium">A:</span>
                        <span class="font-bold">{{ getRouteTimes(item.points).start }}</span>
                      </div>
                      <div class="font-mono text-muted-foreground">
                        {{ item.points[0]?.lat.toFixed(6) }}, {{ item.points[0]?.lng.toFixed(6) }}
                      </div>
                    </div>
                    <!-- End point -->
                    <div class="mt-1.5 text-[10px]">
                      <div class="flex items-center gap-1">
                        <span class="text-blue-600 dark:text-blue-400 font-medium">B:</span>
                        <span class="font-bold">{{ getRouteTimes(item.points).end }}</span>
                      </div>
                      <div class="font-mono text-muted-foreground">
                        {{ item.points[item.points.length - 1]?.lat.toFixed(6) }}, {{ item.points[item.points.length - 1]?.lng.toFixed(6) }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Unknown type fallback -->
              <template v-else>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <span class="text-lg font-bold text-gray-600 dark:text-gray-400">?</span>
                  </div>
                  <div class="flex-1">
                    <span class="text-sm font-medium">Unknown: {{ (item as any).type }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
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
