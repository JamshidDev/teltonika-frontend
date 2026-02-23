<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
import MapContainer from '@/components/map/MapContainer.vue'
import Card from '@/components/ui/Card.vue'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Car, Wifi, WifiOff, Gauge } from 'lucide-vue-next'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()

const stats = computed(() => vehiclesStore.vehicleStats)
</script>

<template>
  <div class="h-full relative">
    <!-- Map as background -->
    <MapContainer class="absolute inset-0" />

    <!-- Stats overlay - top right -->
    <div class="absolute top-4 right-4 flex gap-2 z-10">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Card class="px-3 py-2 flex items-center gap-2 cursor-default">
              <Car class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">{{ stats.total }}</span>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ t('sidebar.all') }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Card class="px-3 py-2 flex items-center gap-2 cursor-default">
              <Wifi class="h-4 w-4 text-green-500" />
              <span class="text-sm font-medium text-green-600">{{ stats.online }}</span>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ t('sidebar.online') }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Card class="px-3 py-2 flex items-center gap-2 cursor-default">
              <WifiOff class="h-4 w-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-500">{{ stats.offline }}</span>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ t('sidebar.offline') }}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <Card class="px-3 py-2 flex items-center gap-2 cursor-default">
              <Gauge class="h-4 w-4 text-blue-500" />
              <span class="text-sm font-medium text-blue-600">{{ stats.moving }}</span>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ t('vehicle.moving') }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
