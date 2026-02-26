<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDevicesStore, type Device, type CreateDeviceDto } from '@/stores/devices.store'
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
  Cpu,
  MoreVertical,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { formatDate } from '@/lib/utils'

const { t } = useI18n()
const devicesStore = useDevicesStore()

const pageSize = ref(Number(localStorage.getItem('devices_pageSize')) || 10)

function changePageSize(size: number) {
  pageSize.value = size
  localStorage.setItem('devices_pageSize', String(size))
  devicesStore.setPageSize(size)
}

// Dialog states
const isFormDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const isEditing = ref(false)
const selectedDevice = ref<Device | null>(null)

// Form data
const formData = ref<CreateDeviceDto>({
  imei: '',
  model: '',
})

function resetForm() {
  formData.value = {
    imei: '',
    model: '',
  }
}

function openCreateDialog() {
  resetForm()
  isEditing.value = false
  isFormDialogOpen.value = true
}

function openEditDialog(device: Device) {
  selectedDevice.value = device
  formData.value = {
    imei: device.imei,
    model: device.model,
  }
  isEditing.value = true
  isFormDialogOpen.value = true
}

function openDeleteDialog(device: Device) {
  selectedDevice.value = device
  isDeleteDialogOpen.value = true
}

async function handleSubmit() {
  if (isEditing.value && selectedDevice.value) {
    const success = await devicesStore.updateDevice(selectedDevice.value.id, formData.value)
    if (success) {
      toast.success(t('device.updateSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  } else {
    const success = await devicesStore.createDevice(formData.value)
    if (success) {
      toast.success(t('device.createSuccess'))
      isFormDialogOpen.value = false
      resetForm()
    }
  }
}

async function handleDelete() {
  if (!selectedDevice.value) return

  const success = await devicesStore.deleteDevice(selectedDevice.value.id)
  if (success) {
    toast.success(t('device.deleteSuccess'))
    isDeleteDialogOpen.value = false
    selectedDevice.value = null
  }
}

// Visible page numbers for pagination
const visiblePages = computed(() => {
  const total = devicesStore.totalPages || 1
  const current = devicesStore.currentPage
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
  devicesStore.fetchDevices()
})
</script>

<template>
  <div class="h-full flex flex-col p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Cpu class="h-5 w-5 text-primary" />
        </div>
        <h1 class="text-2xl font-bold">{{ t('device.title') }}</h1>
      </div>

      <Button @click="openCreateDialog">
        <Plus class="h-4 w-4 mr-2" />
        {{ t('device.add') }}
      </Button>
    </div>

    <!-- Table -->
    <Card class="flex-1 flex flex-col overflow-hidden relative">
      <!-- Loading overlay -->
      <div
        v-if="devicesStore.loading"
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
          <thead class="bg-muted sticky top-0 z-[5]">
            <tr>
              <th class="text-left px-4 py-3 font-medium text-sm w-[80px] min-w-[80px]">ID</th>
              <th class="text-left px-4 py-3 font-medium text-sm">{{ t('device.imei') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[200px] min-w-[200px]">{{ t('device.model') }}</th>
              <th class="text-left px-4 py-3 font-medium text-sm w-[120px] min-w-[120px]">{{ t('device.createdAt') }}</th>
              <th class="text-center px-4 py-3 font-medium text-sm w-[100px] min-w-[100px]">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
              <tr
                v-for="device in devicesStore.devices"
                :key="device.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 text-sm">{{ device.id }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Cpu class="h-4 w-4 text-primary" />
                    </div>
                    <Badge variant="secondary" class="font-mono">{{ device.imei }}</Badge>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm">
                  <Badge v-if="device.model" variant="default">{{ device.model }}</Badge>
                  <span v-else class="text-muted-foreground">-</span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">{{ formatDate(device.createdAt) }}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <button class="h-8 w-8 rounded-md border border-input flex items-center justify-center hover:bg-accent transition-colors">
                        <MoreVertical class="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem class="gap-2 cursor-pointer" @click="openEditDialog(device)">
                        <Pencil class="h-4 w-4" />
                        {{ t('common.edit') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem class="gap-2 cursor-pointer text-destructive focus:text-destructive" @click="openDeleteDialog(device)">
                        <Trash2 class="h-4 w-4" />
                        {{ t('common.delete') }}
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>

            <!-- Empty state -->
            <tr v-if="devicesStore.devices.length === 0 && !devicesStore.loading">
              <td colspan="5" class="px-4 py-12 text-center text-muted-foreground">
                {{ t('device.noDevices') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30 flex-shrink-0">
        <div class="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{{ t('common.total') }}: <strong class="text-foreground">{{ devicesStore.totalDevices }}</strong></span>
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
            :disabled="!devicesStore.meta.hasPrev || devicesStore.loading"
            @click="devicesStore.setPage(devicesStore.currentPage - 1)"
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
                page === devicesStore.currentPage
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-background hover:bg-accent'
              ]"
              :disabled="devicesStore.loading"
              @click="devicesStore.setPage(page)"
            >
              {{ page }}
            </button>
          </div>

          <button
            class="h-9 w-9 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!devicesStore.meta.hasNext || devicesStore.loading"
            @click="devicesStore.setPage(devicesStore.currentPage + 1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>

    <!-- Form Dialog (Create/Edit) -->
    <Dialog v-model:open="isFormDialogOpen" :title="isEditing ? t('device.edit') : t('device.add')">
      <div class="space-y-4">
        <div class="space-y-2">
          <Label>{{ t('device.imei') }}</Label>
          <Input v-model="formData.imei" :placeholder="t('device.imeiPlaceholder')" />
        </div>
        <div class="space-y-2">
          <Label>{{ t('device.model') }}</Label>
          <Input v-model="formData.model" :placeholder="t('device.modelPlaceholder')" />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isFormDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button :disabled="devicesStore.loading" @click="handleSubmit">
          <Loader2 v-if="devicesStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.save') }}
        </Button>
      </div>
    </Dialog>

    <!-- Delete Dialog -->
    <Dialog v-model:open="isDeleteDialogOpen" :title="t('device.delete')">
      <p class="text-sm text-muted-foreground mb-4">
        {{ t('device.deleteConfirm') }}
      </p>
      <p class="font-medium font-mono">{{ selectedDevice?.imei }}</p>

      <div class="flex justify-end gap-2 mt-6">
        <Button variant="outline" @click="isDeleteDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button variant="destructive" :disabled="devicesStore.loading" @click="handleDelete">
          <Loader2 v-if="devicesStore.loading" class="h-4 w-4 mr-2 animate-spin" />
          {{ t('common.delete') }}
        </Button>
      </div>
    </Dialog>
  </div>
</template>
