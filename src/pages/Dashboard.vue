<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import MapContainer from '@/components/map/MapContainer.vue'
import VehicleBottomSheet from '@/components/sidebar/VehicleBottomSheet.vue'
import VehiclePanel from '@/components/sidebar/VehiclePanel.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Car, Wifi, WifiOff, Gauge } from 'lucide-vue-next'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

const { isDesktop } = useBreakpoint()

const stats = computed(() => vehiclesStore.vehicleStats)

// Sahifa ma'lumot egasi — yon panel yoki varaq render bo'lishidan qat'i nazar yuklanadi.
onMounted(() => {
  vehiclesStore.fetchVehicles()
})
const mapZoom = computed(() => uiStore.mapZoom)

</script>

<template>
  <div class="h-full relative">
    <!-- Map as background -->
    <MapContainer class="absolute inset-0" />

    <!-- Desktop: suzuvchi kartochka — pastki menyudan ochiladi -->
    <div
      v-if="isDesktop && uiStore.panelOpen"
      class="absolute left-5 top-5 z-10 h-[calc(100vh-190px)] w-[420px]"
    >
      <div class="brand-card flex h-full flex-col overflow-hidden rounded-xl bg-card">
        <VehiclePanel />
      </div>
    </div>

    <!-- Suzuvchi pastki menyu (ikkala rejimda) + mobil varaq -->
    <VehicleBottomSheet />

    <!-- Top right controls - vertical -->
    <div class="absolute top-3 right-3 md:top-5 md:right-5 flex flex-col items-center gap-2 z-10">
      <!-- Stats — mobilda pastki varaqda ko'rsatiladi -->
      <TooltipProvider v-if="isDesktop">
        <Tooltip>
          <TooltipTrigger as-child>
            <button class="w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center cursor-default">
              <Car class="h-4 w-4 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('sidebar.all') }}: {{ stats.total }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <button class="w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center cursor-default">
              <Wifi class="h-4 w-4 text-green-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('sidebar.online') }}: {{ stats.online }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <button class="w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center cursor-default">
              <WifiOff class="h-4 w-4 text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('sidebar.offline') }}: {{ stats.offline }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <button class="w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center cursor-default">
              <Gauge class="h-4 w-4 text-blue-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('vehicle.moving') }}: {{ stats.moving }}
          </TooltipContent>
        </Tooltip>

        <!-- Zoom Level Indicator -->
        <Tooltip>
          <TooltipTrigger as-child>
            <button class="w-10 h-10 rounded-full bg-background shadow-lg flex items-center justify-center cursor-default">
              <span class="text-xs font-bold text-muted-foreground">{{ mapZoom }}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {{ t('map.zoom') }}: {{ mapZoom }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
