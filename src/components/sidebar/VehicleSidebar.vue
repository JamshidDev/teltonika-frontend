<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useVehiclesStore } from '@/stores/vehicles.store'
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
  CircleStop,
  CalendarClock,
  History,
  ChevronUp,
  ChevronDown,
} from 'lucide-vue-next'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()

// Tabs
type SidebarTab = 'live' | 'stopped' | 'scheduled' | 'history'
const activeTab = ref<SidebarTab>('live')
const isBodyCollapsed = ref(false)

const tabs = computed(() => [
  { key: 'live' as SidebarTab, label: t('sidebar.live'), icon: Radio },
  { key: 'stopped' as SidebarTab, label: t('sidebar.stopped'), icon: CircleStop },
  { key: 'scheduled' as SidebarTab, label: t('sidebar.scheduled'), icon: CalendarClock },
  { key: 'history' as SidebarTab, label: t('sidebar.history'), icon: History },
])

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
      <!-- Coming Soon for non-live tabs -->
      <div v-if="activeTab !== 'live'" class="flex-1 flex items-center justify-center p-4">
        <div class="text-center text-muted-foreground">
          <div class="text-4xl mb-3">🚧</div>
          <p class="text-sm">{{ t('common.comingSoon') }}</p>
        </div>
      </div>

      <!-- Live tab content -->
      <template v-else>
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
