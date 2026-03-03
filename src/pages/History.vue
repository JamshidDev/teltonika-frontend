<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import { Button } from '@/components/ui/button'
import { carsApi } from '@/api/cars'
import { formatDateTime } from '@/lib/utils'
import { useUiStore } from '@/stores/ui.store'
import {
  History,
  ChevronLeft,
  ChevronRight,
  Flame,
  FlameKindling,
  Filter,
  Eye,
  Loader2,
} from 'lucide-vue-next'
import type { HistoryPosition, PaginationMeta, Car } from '@/types'

const { t } = useI18n()
const route = useRoute()
const uiStore = useUiStore()

const positions = ref<HistoryPosition[]>([])
const cars = ref<Car[]>([])
const meta = ref<PaginationMeta | null>(null)
const loading = ref(false)
const carsLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(Number(localStorage.getItem('history_pageSize')) || 10)
const selectedCarId = ref<number | null>(null)
const selectedPosition = ref<HistoryPosition | null>(null)
const isPreviewOpen = ref(false)

function openPreview(pos: HistoryPosition) {
  selectedPosition.value = pos
  isPreviewOpen.value = true
}

const totalPages = computed(() => meta.value?.totalPages || 1)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
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

const hasPrevPage = computed(() => meta.value?.hasPrev ?? false)
const hasNextPage = computed(() => meta.value?.hasNext ?? false)

async function fetchCars() {
  carsLoading.value = true
  try {
    const response = await carsApi.getAll({ page: 1, pageSize: 100 })
    cars.value = response.data
  } catch (error) {
    console.error('Failed to fetch cars:', error)
  } finally {
    carsLoading.value = false
  }
}

async function fetchPositions() {
  loading.value = true
  try {
    const params: { page: number; pageSize: number; carId?: number } = {
      page: currentPage.value,
      pageSize: pageSize.value,
    }
    if (selectedCarId.value) {
      params.carId = selectedCarId.value
    }
    const response = await carsApi.getHistoryPositions(params)
    positions.value = response.data
    meta.value = response.meta
  } catch (error) {
    console.error('Failed to fetch history positions:', error)
  } finally {
    loading.value = false
  }
}

async function goToPage(page: number) {
  currentPage.value = page
  await fetchPositions()
}

async function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('history_pageSize', String(size))
  currentPage.value = 1
  await fetchPositions()
}

async function onCarFilterChange(carId: string) {
  selectedCarId.value = carId ? Number(carId) : null
  currentPage.value = 1
  await fetchPositions()
}

onMounted(() => {
  // Check for query params
  const carIdParam = route.query.carId
  if (carIdParam) {
    selectedCarId.value = Number(carIdParam)
  }

  fetchCars()
  fetchPositions()
})
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('history.title') }}
      </h1>
      <History class="h-6 w-6 text-muted-foreground" />
    </div>

    <!-- Filter -->
    <div class="flex items-center gap-3 mb-4">
      <div class="flex items-center gap-2">
        <Filter class="h-4 w-4 text-muted-foreground" />
        <select
          :value="selectedCarId ?? ''"
          class="h-9 min-w-[200px] rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
          @change="onCarFilterChange(($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('history.selectVehicle') }}</option>
          <option v-for="car in cars" :key="car.id" :value="car.id">
            {{ car.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <Card class="flex-1 overflow-hidden flex flex-col relative">
      <!-- Loading overlay -->
      <div
        v-if="loading"
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
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.name') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.driver') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.imei') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Lat / Long</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.speed') }}</th>
              <th class="text-right px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Distance</th>
              <th class="text-right px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Bytes</th>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ignition</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('history.recordedAt') }}</th>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-16"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(pos, index) in positions"
              :key="pos.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-3 py-1.5 text-center text-muted-foreground">
                {{ (currentPage - 1) * pageSize + index + 1 }}
              </td>
              <td class="px-3 py-1.5">
                <div class="font-medium">{{ pos.carName }}</div>
                <span v-if="pos.carNumber" class="text-[10px] px-1 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                  {{ pos.carNumber }}
                </span>
              </td>
              <td class="px-3 py-1.5">
                <span v-if="pos.driver" class="text-sm">{{ pos.driver.fullName }}</span>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5">
                <div v-if="pos.device">
                  <Badge variant="secondary" class="font-mono text-xs">
                    {{ pos.device.imei }}
                  </Badge>
                  <div class="text-[10px] text-muted-foreground">{{ pos.device.model }}</div>
                </div>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5">
                <div class="font-mono text-xs">
                  <div>{{ pos.latitude.toFixed(6) }}</div>
                  <div class="text-muted-foreground">{{ pos.longitude.toFixed(6) }}</div>
                </div>
              </td>
              <td class="px-3 py-1.5">
                <span :class="pos.speed > 0 ? 'text-green-600' : 'text-muted-foreground'">
                  {{ pos.speed }} km/h
                </span>
              </td>
              <td class="px-3 py-1.5 text-right font-mono text-xs">
                <span v-if="pos.distanceFromPrev != null">{{ pos.distanceFromPrev.toFixed(2) }} m</span>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5 text-right font-mono text-xs">
                <span v-if="pos.bytesReceived != null">{{ pos.bytesReceived }}</span>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5 text-center">
                <div class="flex justify-center">
                  <Flame v-if="pos.ignition" class="h-4 w-4 text-orange-500" />
                  <FlameKindling v-else class="h-4 w-4 text-muted-foreground" />
                </div>
              </td>
              <td class="px-3 py-1.5 text-muted-foreground text-xs">
                {{ formatDateTime(pos.recordedAt, uiStore.language) }}
              </td>
              <td class="px-3 py-1.5 text-center">
                <button
                  class="p-1.5 rounded hover:bg-accent transition-colors"
                  @click="openPreview(pos)"
                >
                  <Eye class="h-4 w-4 text-muted-foreground" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div
          v-if="positions.length === 0 && !loading"
          class="flex items-center justify-center py-8 text-muted-foreground text-sm"
        >
          {{ t('common.noData') }}
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ meta?.total || 0 }}</strong></span>
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
            :disabled="!hasPrevPage"
            @click="goToPage(currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'h-9 min-w-[2.25rem] px-3 rounded-md text-sm font-medium transition-colors',
                page === currentPage
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
            :disabled="!hasNextPage"
            @click="goToPage(currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Preview Dialog -->
    <Dialog
      v-model:open="isPreviewOpen"
      :title="t('common.preview')"
    >
      <div v-if="selectedPosition" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.name') }}</p>
            <p class="font-medium">{{ selectedPosition.carName }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.driver') }}</p>
            <p class="font-medium">{{ selectedPosition.driver?.fullName || '-' }}</p>
            <p v-if="selectedPosition.driver" class="text-xs text-muted-foreground">{{ selectedPosition.driver.phone }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.imei') }}</p>
            <p class="font-mono text-sm">{{ selectedPosition.device?.imei || '-' }}</p>
            <p v-if="selectedPosition.device" class="text-xs text-muted-foreground">{{ selectedPosition.device.model }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Koordinatalar</p>
            <p class="font-mono text-sm">{{ selectedPosition.latitude }}, {{ selectedPosition.longitude }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.speed') }}</p>
            <p class="font-medium" :class="selectedPosition.speed > 0 ? 'text-green-600' : ''">
              {{ selectedPosition.speed }} km/h
            </p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Angle</p>
            <p class="font-medium">{{ selectedPosition.angle }}°</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Satellites</p>
            <p class="font-medium">{{ selectedPosition.satellites }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Ignition</p>
            <div class="flex items-center gap-2">
              <Flame v-if="selectedPosition.ignition" class="h-4 w-4 text-orange-500" />
              <FlameKindling v-else class="h-4 w-4 text-muted-foreground" />
              <span>{{ selectedPosition.ignition ? 'On' : 'Off' }}</span>
            </div>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('history.recordedAt') }}</p>
            <p class="font-medium">{{ formatDateTime(selectedPosition.recordedAt, uiStore.language) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.createdAt') }}</p>
            <p class="font-medium">{{ formatDateTime(selectedPosition.createdAt, uiStore.language) }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Distance from Prev</p>
            <p class="font-medium font-mono">
              {{ selectedPosition.distanceFromPrev != null ? selectedPosition.distanceFromPrev.toFixed(2) + ' m' : '-' }}
            </p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">Bytes Received</p>
            <p class="font-medium font-mono">{{ selectedPosition.bytesReceived ?? '-' }}</p>
          </div>
        </div>

        <!-- Raw IO Data -->
        <div v-if="selectedPosition.rawIo" class="mt-4 p-3 border border-border rounded-md bg-muted/30">
          <p class="text-sm font-medium text-muted-foreground mb-2">Raw IO (Device Data)</p>
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <div
              v-for="(value, key) in selectedPosition.rawIo"
              :key="key"
              class="flex items-center gap-1 text-xs font-mono bg-background px-2 py-1 rounded"
            >
              <span class="text-muted-foreground">{{ key }}:</span>
              <span class="font-medium">{{ value }}</span>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <Button variant="outline" @click="isPreviewOpen = false">
            {{ t('common.close') }}
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
