<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCarsStore } from '@/stores/cars.store'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Car,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import type { Car as CarType, CreateCarDto, UpdateCarDto } from '@/types'
import { formatDate, formatDateTime } from '@/lib/utils'

const { t } = useI18n()
const carsStore = useCarsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()

const isFormDialogOpen = ref(false)
const isViewDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isEditing = ref(false)
const selectedCar = ref<CarType | null>(null)
const isSubmitting = ref(false)
const pageSize = ref(Number(localStorage.getItem('vehicles_pageSize')) || 10)

const formData = ref({
  name: '',
  deviceImei: '',
  deviceModel: '',
})

const cars = computed(() => carsStore.filteredCars)

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

function handleSearch(value: string) {
  carsStore.setSearchQuery(value)
}

function openAddDialog() {
  isEditing.value = false
  formData.value = {
    name: '',
    deviceImei: '',
    deviceModel: '',
  }
  isFormDialogOpen.value = true
}

function openEditDialog(car: CarType) {
  isEditing.value = true
  selectedCar.value = car
  formData.value = {
    name: car.name,
    deviceImei: car.deviceImei,
    deviceModel: car.deviceModel || '',
  }
  isFormDialogOpen.value = true
}

function openViewDialog(car: CarType) {
  selectedCar.value = car
  isViewDialogOpen.value = true
}

function openDeleteDialog(car: CarType) {
  selectedCar.value = car
  isDeleteDialogOpen.value = true
}

async function handleSubmit() {
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    if (isEditing.value && selectedCar.value) {
      const updateData: UpdateCarDto = {
        name: formData.value.name,
        deviceModel: formData.value.deviceModel,
      }
      await carsStore.updateCar(selectedCar.value.id, updateData)
    } else {
      const createData: CreateCarDto = {
        userId: authStore.currentUser?.id || 1,
        name: formData.value.name,
        deviceImei: formData.value.deviceImei,
        deviceModel: formData.value.deviceModel,
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

async function handleDelete() {
  if (!selectedCar.value || isSubmitting.value) return
  isSubmitting.value = true

  try {
    await carsStore.deleteCar(selectedCar.value.id)
    isDeleteDialogOpen.value = false
    // Listni qayta yuklash
    await carsStore.fetchCars({ page: carsStore.currentPage, pageSize: pageSize.value })
  } catch (error) {
    console.error('Failed to delete car:', error)
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
    <Card class="flex-1 overflow-hidden flex flex-col">
      <div class="overflow-auto flex-1">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 sticky top-0">
            <tr>
              <th class="text-center px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-12">#</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.name') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.imei') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.model') }}</th>
              <th class="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">{{ t('vehicle.createdAt') }}</th>
              <th class="text-right px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-28"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr
              v-for="(car, index) in cars"
              :key="car.id"
              class="hover:bg-muted/30 transition-colors"
            >
              <td class="px-3 py-1.5 text-center text-muted-foreground">{{ (carsStore.currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="px-3 py-1.5 font-medium">{{ car.name }}</td>
              <td class="px-3 py-1.5 text-muted-foreground font-mono text-xs">{{ car.deviceImei }}</td>
              <td class="px-3 py-1.5 text-muted-foreground">{{ car.deviceModel || '-' }}</td>
              <td class="px-3 py-1.5 text-muted-foreground text-xs">{{ formatDate(car.createdAt, uiStore.language) }}</td>
              <td class="px-3 py-1.5">
                <div class="flex items-center justify-end gap-0.5">
                  <button
                    class="p-1.5 rounded hover:bg-accent transition-colors"
                    @click="openViewDialog(car)"
                    :title="t('vehicle.viewVehicle')"
                  >
                    <Eye class="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    class="p-1.5 rounded hover:bg-accent transition-colors"
                    @click="openEditDialog(car)"
                    :title="t('vehicle.editVehicle')"
                  >
                    <Pencil class="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    class="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                    @click="openDeleteDialog(car)"
                    :title="t('vehicle.deleteVehicle')"
                  >
                    <Trash2 class="h-3.5 w-3.5 text-destructive" />
                  </button>
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

        <!-- Loading state -->
        <div
          v-if="carsStore.loading"
          class="flex items-center justify-center py-8 text-muted-foreground text-sm"
        >
          {{ t('common.loading') }}
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
            <Label for="deviceImei">{{ t('vehicle.imei') }} *</Label>
            <Input
              id="deviceImei"
              v-model="formData.deviceImei"
              required
              :disabled="isEditing"
            />
          </div>
          <div class="space-y-2">
            <Label for="deviceModel">{{ t('vehicle.model') }}</Label>
            <Input
              id="deviceModel"
              v-model="formData.deviceModel"
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
            <p class="text-sm text-muted-foreground">{{ t('vehicle.imei') }}</p>
            <p class="font-mono text-sm">{{ selectedCar.deviceImei }}</p>
          </div>
          <div>
            <p class="text-sm text-muted-foreground">{{ t('vehicle.model') }}</p>
            <p class="font-medium">{{ selectedCar.deviceModel || '-' }}</p>
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

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:open="isDeleteDialogOpen"
      :title="t('vehicle.deleteVehicle')"
    >
      <div class="space-y-4">
        <p class="text-muted-foreground">
          {{ t('vehicle.confirmDelete') }}
        </p>
        <p v-if="selectedCar" class="font-medium">
          {{ selectedCar.name }} ({{ selectedCar.deviceImei }})
        </p>

        <div class="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            @click="isDeleteDialogOpen = false"
          >
            {{ t('common.cancel') }}
          </Button>
          <Button
            variant="destructive"
            @click="handleDelete"
            :disabled="isSubmitting"
          >
            {{ t('common.delete') }}
          </Button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
