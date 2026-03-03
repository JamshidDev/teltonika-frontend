<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStopEventsStore } from '@/stores/stopEvents.store'
import { useCarsStore } from '@/stores/cars.store'
import { useUiStore } from '@/stores/ui.store'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { SelectOption } from '@/components/ui/SearchableSelect.vue'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import LocationMapModal from '@/components/LocationMapModal.vue'
import {
  ParkingCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Car,
  Clock,
  MapPin,
} from 'lucide-vue-next'
import { formatDateTime } from '@/lib/utils'

const { t } = useI18n()

// Map modal state
const mapModalOpen = ref(false)
const selectedLocation = ref({ lat: 0, lng: 0 })

function openMapModal(lat: number, lng: number) {
  selectedLocation.value = { lat, lng }
  mapModalOpen.value = true
}
const stopEventsStore = useStopEventsStore()
const carsStore = useCarsStore()
const uiStore = useUiStore()

const pageSize = ref(Number(localStorage.getItem('stopEvents_pageSize')) || 10)
const selectedCarId = ref<number | null>(null)
const selectedDate = ref(new Date().toLocaleDateString('en-CA'))

// Car options for select
const carOptions = computed<SelectOption[]>(() =>
  carsStore.cars.map(car => ({
    value: car.id,
    label: car.name,
    description: car.carNumber || '',
    icon: Car,
  }))
)

const visiblePages = computed(() => {
  const total = stopEventsStore.totalPages || 1
  const current = stopEventsStore.currentPage
  const pages: number[] = []

  if (total <= 5) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, 5)
    } else if (current >= total - 2) {
      pages.push(total - 4, total - 3, total - 2, total - 1, total)
    } else {
      pages.push(current - 2, current - 1, current, current + 1, current + 2)
    }
  }

  return pages.filter(p => p >= 1 && p <= total)
})

function formatDuration(seconds: number | null): string {
  if (!seconds) return '00:00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

async function loadData() {
  await stopEventsStore.fetchEvents({ page: 1, pageSize: pageSize.value })
}

async function goToPage(page: number) {
  await stopEventsStore.fetchEvents({ page, pageSize: pageSize.value })
}

async function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('stopEvents_pageSize', String(size))
  await stopEventsStore.fetchEvents({ page: 1, pageSize: size })
}

watch(selectedCarId, (newVal) => {
  stopEventsStore.setCarId(newVal)
  loadData()
})

watch(selectedDate, (newVal) => {
  stopEventsStore.setDate(newVal)
  loadData()
})

onMounted(async () => {
  await carsStore.fetchCars({ page: 1, pageSize: 100 })
  await loadData()
})
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('stopEvents.title') }}
      </h1>
      <ParkingCircle class="h-6 w-6 text-muted-foreground" />
    </div>

    <!-- Filters -->
    <div class="flex items-end gap-4 mb-4">
      <div class="w-64">
        <Label class="mb-2 block">{{ t('stopEvents.selectCar') }}</Label>
        <SearchableSelect
          v-model="selectedCarId"
          :options="carOptions"
          :placeholder="t('stopEvents.allCars')"
          :search-placeholder="t('sidebar.search')"
        />
      </div>
      <div class="w-48">
        <Label class="mb-2 block">{{ t('stopEvents.date') }}</Label>
        <DatePicker
          v-model="selectedDate"
          :placeholder="t('stopEvents.selectDate')"
        />
      </div>
    </div>

    <!-- Table -->
    <Card class="flex-1 overflow-hidden flex flex-col relative">
      <!-- Loading overlay -->
      <div
        v-if="stopEventsStore.loading"
        class="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-2">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
        </div>
      </div>

      <div class="overflow-auto flex-1">
        <table class="w-full text-sm">
          <thead class="bg-muted sticky top-0 z-[5]">
            <tr>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-12">#</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.vehicle') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.type') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.startTime') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.endTime') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.duration') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('stopEvents.location') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(event, index) in stopEventsStore.events"
              :key="event.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-3 py-2 text-center text-muted-foreground">
                {{ (stopEventsStore.currentPage - 1) * pageSize + index + 1 }}
              </td>
              <td class="px-3 py-2">
                <div class="font-medium text-xs">{{ event.carName }}</div>
                <span v-if="event.carNumber" class="text-[10px] px-1 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                  {{ event.carNumber }}
                </span>
              </td>
              <td class="px-3 py-2">
                <Badge :variant="event.type.toLowerCase() === 'parking' ? 'warning' : 'destructive'">
                  {{ event.type.toUpperCase() }}
                </Badge>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Clock class="h-3.5 w-3.5" />
                  <span class="text-xs">{{ formatDateTime(event.startAt, uiStore.language) }}</span>
                </div>
              </td>
              <td class="px-3 py-2">
                <div v-if="event.endAt" class="flex items-center gap-1.5 text-muted-foreground">
                  <Clock class="h-3.5 w-3.5" />
                  <span class="text-xs">{{ formatDateTime(event.endAt, uiStore.language) }}</span>
                </div>
                <Badge v-else variant="outline" class="text-xs">{{ t('stopEvents.ongoing') }}</Badge>
              </td>
              <td class="px-3 py-2">
                <span class="font-mono text-sm">{{ formatDuration(event.durationSeconds) }}</span>
              </td>
              <td class="px-3 py-2">
                <button
                  class="flex items-center gap-1.5 text-muted-foreground text-xs hover:text-primary transition-colors cursor-pointer"
                  @click="openMapModal(event.latitude, event.longitude)"
                >
                  <MapPin class="h-3.5 w-3.5" />
                  <span>{{ event.latitude.toFixed(6) }}, {{ event.longitude.toFixed(6) }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div
          v-if="stopEventsStore.events.length === 0 && !stopEventsStore.loading"
          class="flex items-center justify-center py-8 text-muted-foreground text-sm"
        >
          {{ t('common.noData') }}
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ stopEventsStore.totalEvents }}</strong></span>
          <span class="text-border">|</span>
          <div class="flex items-center gap-2">
            <span>{{ t('common.pageSize') }}:</span>
            <select
              :value="pageSize"
              class="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
              @change="changePageSize(Number(($event.target as HTMLSelectElement).value))"
            >
              <option value="10">10</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button
            class="h-9 w-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!stopEventsStore.hasPrevPage"
            @click="goToPage(stopEventsStore.currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'h-9 min-w-[2.25rem] px-3 rounded-md text-sm font-medium transition-colors',
                page === stopEventsStore.currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-background hover:bg-accent'
              ]"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </div>
          <button
            class="h-9 w-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!stopEventsStore.hasNextPage"
            @click="goToPage(stopEventsStore.currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Location Map Modal -->
    <LocationMapModal
      v-model:open="mapModalOpen"
      :latitude="selectedLocation.lat"
      :longitude="selectedLocation.lng"
      :title="t('stopEvents.location')"
    />
  </div>
</template>
