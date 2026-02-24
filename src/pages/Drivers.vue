<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDriversStore, type Driver, type CreateDriverDto } from '@/stores/drivers.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  User,
  MoreVertical,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatDate } from '@/lib/utils'

const { t } = useI18n()
const driversStore = useDriversStore()

const pageSize = ref(Number(localStorage.getItem('drivers_pageSize')) || 10)

function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('drivers_pageSize', String(size))
  driversStore.setPageSize(size)
}

// Dialog states
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isEditing = ref(false)
const selectedDriver = ref<Driver | null>(null)

// Form data
const formData = ref<CreateDriverDto>({
  fullName: '',
  phone: '',
  licenseNumber: '',
})

function resetForm() {
  formData.value = {
    fullName: '',
    phone: '',
    licenseNumber: '',
  }
}

function openCreateDialog() {
  resetForm()
  isEditing.value = false
  isFormDialogOpen.value = true
}

function openEditDialog(driver: Driver) {
  selectedDriver.value = driver
  formData.value = {
    fullName: driver.fullName,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
  }
  isEditing.value = true
  isFormDialogOpen.value = true
}

function openDeleteDialog(driver: Driver) {
  selectedDriver.value = driver
  isDeleteDialogOpen.value = true
}

async function handleSubmit() {
  if (isEditing.value && selectedDriver.value) {
    const success = await driversStore.updateDriver(selectedDriver.value.id, formData.value)
    if (success) {
      toast.success(t('driver.updateSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  } else {
    const success = await driversStore.createDriver(formData.value)
    if (success) {
      toast.success(t('driver.createSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  }
}

async function handleDelete() {
  if (!selectedDriver.value) return

  const success = await driversStore.deleteDriver(selectedDriver.value.id)
  if (success) {
    toast.success(t('driver.deleteSuccess'))
    isDeleteDialogOpen.value = false
    selectedDriver.value = null
  }
}

// Visible page numbers for pagination
const visiblePages = computed(() => {
  const total = driversStore.totalPages || 1
  const current = driversStore.currentPage
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

onMounted(() => {
  driversStore.fetchDrivers()
})
</script>

<template>
  <div class="h-full flex flex-col p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Users class="h-5 w-5 text-primary" />
        </div>
        <h1 class="text-2xl font-bold">{{ t('driver.title') }}</h1>
      </div>

      <Button @click="openCreateDialog">
        <Plus class="h-4 w-4 mr-2" />
        {{ t('driver.add') }}
      </Button>
    </div>

    <!-- Table -->
    <Card class="flex-1 flex flex-col overflow-hidden relative">
      <!-- Loading overlay -->
      <div
        v-if="driversStore.loading"
        class="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-2">
          <Loader2 class="h-8 w-8 animate-spin text-primary" />
          <span class="text-sm text-muted-foreground">{{ t('common.loading') }}</span>
        </div>
      </div>

      <!-- Table content -->
      <div class="flex-1 overflow-auto">
        <table class="w-full table-fixed">
          <thead class="bg-muted/50 sticky top-0 z-[5]">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-sm w-[80px] min-w-[80px]">ID</th>
              <th class="text-left px-4 py-3 font-medium text-sm">{{ t('driver.fullName') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[260px] min-w-[260px]">{{ t('driver.phone') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[260px] min-w-[260px]">{{ t('driver.licenseNumber') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[120px] min-w-[120px]">{{ t('driver.createdAt') }}</th>
              <th class="text-center px-4 py-3 font-medium text-sm w-[100px] min-w-[100px]">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
              <tr
                v-for="driver in driversStore.drivers"
                :key="driver.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 text-sm">{{ driver.id }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User class="h-4 w-4 text-primary" />
                    </div>
                    <span class="font-medium">{{ driver.fullName }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm">{{ driver.phone }}</td>
                <td class="px-4 py-3 text-sm">
                  <Badge v-if="driver.licenseNumber" variant="default" class="font-mono">{{ driver.licenseNumber }}</Badge>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDate(driver.createdAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <button class="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent transition-colors">
                        <MoreVertical class="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="gap-2 cursor-pointer" @click="openEditDialog(driver)">
                        <Pencil class="h-4 w-4" />
                        {{ t('common.edit') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="gap-2 cursor-pointer text-destructive focus:text-destructive" @click="openDeleteDialog(driver)">
                        <Trash2 class="h-4 w-4" />
                        {{ t('common.delete') }}
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>

            <!-- Empty state -->
            <tr v-if="driversStore.drivers.length === 0 && !driversStore.loading">
              <td colspan="6" class="px-4 py-12 text-center text-muted-foreground">
                {{ t('driver.noDrivers') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 flex-shrink-0">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ driversStore.totalDrivers }}</strong></span>
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
            :disabled="!driversStore.meta.hasPrev || driversStore.loading"
            @click="driversStore.setPage(driversStore.currentPage - 1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>

          <!-- Page numbers -->
          <div class="flex items-center gap-1">
            <button
              v-for="page in visiblePages"
              :key="page"
              :class="[
                'h-9 min-w-[2.25rem] px-3 rounded-md text-sm font-medium transition-colors',
                page === driversStore.currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-background hover:bg-accent'
              ]"
              :disabled="driversStore.loading"
              @click="driversStore.setPage(page)"
            >
              {{ page }}
            </button>
          </div>

          <button
            class="h-9 w-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!driversStore.meta.hasNext || driversStore.loading"
            @click="driversStore.setPage(driversStore.currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Form Dialog (Create/Edit) -->
    <Dialog v-model:open="isFormDialogOpen" :title="isEditing ? t('driver.edit') : t('driver.add')">
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('driver.fullName') }}</Label>
          <Input v-model="formData.fullName" :placeholder="t('driver.fullNamePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('driver.phone') }}</Label>
          <Input v-model="formData.phone" :placeholder="t('driver.phonePlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('driver.licenseNumber') }}</Label>
          <Input v-model="formData.licenseNumber" :placeholder="t('driver.licensePlaceholder')" />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isFormDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="driversStore.loading" @click="handleSubmit">
          <Loader2 v-if="driversStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.save') }}
        </Button>
      </div>
    </Dialog>

    <!-- Delete Dialog -->
    <Dialog v-model:open="isDeleteDialogOpen" :title="t('driver.delete')">
      <p class="text-sm text-muted-foreground mb-4">
        {{ t('driver.deleteConfirm') }}
      </p>
      <p class="font-medium">{{ selectedDriver?.fullName }}</p>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isDeleteDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button variant="destructive" :disabled="driversStore.loading" @click="handleDelete">
          <Loader2 v-if="driversStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </Dialog>
  </div>
</template>
