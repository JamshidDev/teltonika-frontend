<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCarsStore } from '@/stores/cars.store'
import { useDevicesStore } from '@/stores/devices.store'
import { useDriversStore } from '@/stores/drivers.store'
import { useUiStore } from '@/stores/ui.store'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import type { SelectOption } from '@/components/ui/SearchableSelect.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Cpu,
  User,
  MoreVertical,
} from 'lucide-vue-next'
import type { Car as CarType, CreateCarDto, UpdateCarDto } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'

const { t } = useI18n()
const carsStore = useCarsStore()
const devicesStore = useDevicesStore()
const driversStore = useDriversStore()
const uiStore = useUiStore()

const isFormDialogOpen = ref(false)
const isViewDialogOpen = ref(false)
const isEditing = ref(false)
const selectedCar = ref<CarType | null>(null)
const isSubmitting = ref(false)
const pageSize = ref(Number(localStorage.getItem('vehicles_pageSize')) || 10)

const formData = ref({
  name: '',
  carNumber: '',
  deviceId: null as number | null,
  driverId: null as number | null,
})

const cars = computed(() => carsStore.filteredCars)

// Options for searchable selects
const deviceOptions = computed<SelectOption[]>(() =>
  devicesStore.devices.map(device => ({
    value: device.id,
    label: device.imei,
    description: device.model,
    icon: Cpu,
  }))
)

const driverOptions = computed<SelectOption[]>(() =>
  driversStore.drivers.map(driver => ({
    value: driver.id,
    label: driver.fullName,
    description: driver.phone,
    icon: User,
  }))
)

const visiblePages = computed(() => {
  const total = carsStore.totalPages || 1
  const current = carsStore.currentPage
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

function handleSearch(value: string | number) {
  carsStore.setSearchQuery(String(value))
}

async function openAddDialog() {
  isEditing.value = false
  formData.value = {
    name: '',
    carNumber: '',
    deviceId: null,
    driverId: null,
  }
  // Fetch devices and drivers for select options
  await Promise.all([
    devicesStore.fetchDevices(1, 100),
    driversStore.fetchDrivers(1, 100),
  ])
  isFormDialogOpen.value = true
}

async function openEditDialog(car: CarType) {
  isEditing.value = true
  selectedCar.value = car
  formData.value = {
    name: car.name,
    carNumber: car.carNumber || '',
    deviceId: car.device?.id || null,
    driverId: car.driver?.id || null,
  }
  // Fetch devices and drivers for select options
  await Promise.all([
    devicesStore.fetchDevices(1, 100),
    driversStore.fetchDrivers(1, 100),
  ])
  isFormDialogOpen.value = true
}

function openViewDialog(car: CarType) {
  selectedCar.value = car
  isViewDialogOpen.value = true
}

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    if (isEditing.value && selectedCar.value) {
      const updateData: UpdateCarDto = {
        name: formData.value.name,
        carNumber: formData.value.carNumber,
        deviceId: formData.value.deviceId || undefined,
        driverId: formData.value.driverId || undefined,
      }
      await carsStore.updateCar(selectedCar.value.id, updateData)
    } else {
      const createData: CreateCarDto = {
        name: formData.value.name,
        carNumber: formData.value.carNumber,
        deviceId: formData.value.deviceId || undefined,
        driverId: formData.value.driverId || undefined,
      }
      await carsStore.createCar(createData)
    }
    isFormDialogOpen.value = false
    // Listni qayta yuklash
    await carsStore.fetchCars({ page: carsStore.currentPage, pageSize: pageSize.value })
  } catch (error) {
    console.error('Failed to save car:', error)
  } finally {
    isSubmitting.value = false
  }
}

async function goToPage(page: number) {
  await carsStore.fetchCars({ page, pageSize: pageSize.value })
}

async function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('vehicles_pageSize', String(size))
  await carsStore.fetchCars({ page: 1, pageSize: size })
}

onMounted(() => {
  carsStore.fetchCars({ page: 1, pageSize: pageSize.value })
})
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('vehicle.list') }}
      </h1>
      <Car class="h-6 w-6 text-muted-foreground" />
    </div>

    <!-- Actions bar -->
    <div class="flex items-center gap-3 mb-4">
      <div class="relative flex-1 max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          :model-value="carsStore.searchQuery"
          :placeholder="t('sidebar.search')"
          class="pl-9"
          @update:model-value="handleSearch"
        />
      </div>
      <Button @click="openAddDialog" class="gap-2">
        <Plus class="h-4 w-4" />
        {{ t('vehicle.addVehicle') }}
      </Button>
    </div>

    <!-- Table -->
    <Card class="flex-1 overflow-hidden flex flex-col relative">
      <!-- Loading overlay -->
      <div
        v-if="carsStore.loading"
        class="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-2">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
        </div>
      </div>

      <div class="overflow-auto flex-1">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 sticky top-0 z-[5]">
            <tr>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-12">#</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.name') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.carNumber') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('nav.devices') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.driver') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.createdAt') }}</th>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-24">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(car, index) in cars"
              :key="car.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-3 py-1.5 text-center text-muted-foreground">{{ (carsStore.currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="px-3 py-1.5">
                <div class="font-medium">{{ car.name }}</div>
                <div class="text-[10px] font-medium text-muted-foreground">ID: {{ car.id }}</div>
              </td>
              <td class="px-3 py-1.5">
                <Badge v-if="car.carNumber" variant="secondary" class="font-mono text-xs">{{ car.carNumber }}</Badge>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5">
                <div v-if="car.device" class="flex items-center gap-1.5">
                  <Cpu class="h-3.5 w-3.5 text-primary" />
                  <Badge variant="secondary" class="font-mono text-xs">{{ car.device.imei }}</Badge>
                </div>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5">
                <div v-if="car.driver" class="flex items-center gap-1.5">
                  <User class="h-3.5 w-3.5 text-primary" />
                  <span class="text-sm">{{ car.driver.fullName }}</span>
                </div>
                <span v-else class="text-muted-foreground">-</span>
              </td>
              <td class="px-3 py-1.5 text-muted-foreground text-xs">{{ formatDate(car.createdAt, uiStore.language) }}</td>
              <td class="px-3 py-1.5">
                <div class="flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <button class="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent transition-colors">
                        <MoreVertical class="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="gap-2 cursor-pointer" @click="openViewDialog(car)">
                        <Eye class="h-4 w-4" />
                        {{ t('common.preview') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="gap-2 cursor-pointer" @click="openEditDialog(car)">
                        <Pencil class="h-4 w-4" />
                        {{ t('common.edit') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled class="gap-2 text-destructive focus:text-destructive">
                        <Trash2 class="h-4 w-4" />
                        {{ t('common.delete') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div
          v-if="cars.length === 0 && !carsStore.loading"
          class="flex items-center justify-center py-8 text-muted-foreground text-sm"
        >
          {{ t('sidebar.noVehicles') }}
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ carsStore.totalCars }}</strong></span>
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
            :disabled="!carsStore.hasPrevPage"
            @click="goToPage(carsStore.currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'h-9 min-w-[2.25rem] px-3 rounded-md text-sm font-medium transition-colors',
                page === carsStore.currentPage
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
            :disabled="!carsStore.hasNextPage"
            @click="goToPage(carsStore.currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Add/Edit Dialog -->
    <Dialog
      v-model:open="isFormDialogOpen"
      :title="isEditing ? t('vehicle.editVehicle') : t('vehicle.addVehicle')"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="name">{{ t('vehicle.name') }} *</Label>
            <Input
              id="name"
              v-model="formData.name"
              required
            />
          </div>
          <div class="space-y-2">
            <Label for="carNumber">{{ t('vehicle.carNumber') }} *</Label>
            <Input
              id="carNumber"
              v-model="formData.carNumber"
              placeholder="01A123BC"
              required
            />
          </div>
          <div class="space-y-2">
            <Label>{{ t('nav.devices') }}</Label>
            <SearchableSelect
              v-model="formData.deviceId"
              :options="deviceOptions"
              :placeholder="t('vehicle.selectDevice')"
              :search-placeholder="t('sidebar.search')"
            />
          </div>
          <div class="space-y-2">
            <Label>{{ t('vehicle.driver') }}</Label>
            <SearchableSelect
              v-model="formData.driverId"
              :options="driverOptions"
              :placeholder="t('vehicle.selectDriver')"
              :search-placeholder="t('sidebar.search')"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            @click="isFormDialogOpen = false"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
            {{ t('common.save') }}
          </Button>
        </div>
      </form>
    </Dialog>

    <!-- View Dialog -->
    <Dialog
      v-model:open="isViewDialogOpen"
      :title="t('vehicle.viewVehicle')"
    >
      <div v-if="selectedCar" class="space-y-4">
        <div class="space-y-3">
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.name') }}</p>
            <p class="font-medium">{{ selectedCar.name }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.carNumber') }}</p>
            <p class="font-mono text-sm">{{ selectedCar.carNumber || '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('nav.devices') }}</p>
            <p class="font-mono text-sm">{{ selectedCar.device ? `${selectedCar.device.imei} (${selectedCar.device.model})` : '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.driver') }}</p>
            <p class="font-medium">{{ selectedCar.driver?.fullName || '-' }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.createdAt') }}</p>
            <p class="font-medium">{{ formatDateTime(selectedCar.createdAt, uiStore.language) }}</p>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <Button variant="outline" @click="isViewDialogOpen = false">
            {{ t('common.close') }}
          </Button>
        </div>
      </div>
    </Dialog>

  </div>
</template>
