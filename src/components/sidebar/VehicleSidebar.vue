<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore, type TabType } from '@/stores/ui.store'
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
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  History,
  Bell,
  FileText,
  Car,
  Loader2,
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

const listRef = ref<HTMLElement | null>(null)

const vehicles = computed(() => vehiclesStore.filteredVehicles)

// Navigation items
const navItems = computed(() => [
  { key: 'dashboard' as TabType, label: t('nav.dashboard'), icon: LayoutDashboard, route: '/dashboard' },
  { key: 'vehicles' as TabType, label: t('nav.vehicles'), icon: Car, route: '/vehicles' },
  { key: 'history' as TabType, label: t('nav.history'), icon: History, route: '/history' },
  { key: 'events' as TabType, label: t('nav.events'), icon: Bell, route: '/events' },
  { key: 'reports' as TabType, label: t('nav.reports'), icon: FileText, route: '/reports' },
])

const activeTab = computed(() => {
  const path = route.path
  if (path.includes('vehicles')) return 'vehicles'
  if (path.includes('history')) return 'history'
  if (path.includes('events')) return 'events'
  if (path.includes('reports')) return 'reports'
  if (path.includes('settings')) return 'settings'
  return 'dashboard'
})

function handleSearch(value: string) {
  vehiclesStore.setSearchQuery(value)
}

function toggleCollapse() {
  uiStore.toggleSidebarCollapse()
}

function navigateTo(item: (typeof navItems.value)[0]) {
  uiStore.setSelectedTab(item.key)
  router.push(item.route)
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
  <aside
    :class="[
      'h-full bg-background border-r border-border flex flex-col transition-all duration-300',
      uiStore.sidebarCollapsed ? 'w-16' : 'w-80',
    ]"
  >
    <!-- Header with Search -->
    <div class="p-3 border-b border-border flex items-center gap-2">
      <div v-if="!uiStore.sidebarCollapsed" class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          :model-value="vehiclesStore.searchQuery"
          :placeholder="t('sidebar.search')"
          class="pl-9"
          @update:model-value="handleSearch"
        />
      </div>
      <button
        class="p-1.5 rounded-md hover:bg-accent transition-colors flex-shrink-0"
        @click="toggleCollapse"
      >
        <ChevronLeft v-if="!uiStore.sidebarCollapsed" class="h-5 w-5" />
        <ChevronRight v-else class="h-5 w-5" />
      </button>
    </div>

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
      ref="listRef"
      class="flex-1 overflow-y-auto"
      @scroll="handleScroll"
    >
      <div v-if="vehicles.length === 0" class="p-4 text-center text-muted-foreground">
        <span v-if="!uiStore.sidebarCollapsed">{{ t('sidebar.noVehicles') }}</span>
      </div>
      <div v-else class="divide-y divide-border">
        <VehicleItem
          v-for="vehicle in vehicles"
          :key="vehicle.carId"
          :vehicle="vehicle"
          :collapsed="uiStore.sidebarCollapsed"
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

    <!-- Bottom Navigation -->
    <nav class="border-t border-border p-2">
      <TooltipProvider>
        <div
          :class="[
            'flex gap-1',
            uiStore.sidebarCollapsed ? 'flex-col items-center' : 'justify-center',
          ]"
        >
          <Tooltip v-for="item in navItems" :key="item.key">
            <TooltipTrigger as-child>
              <button
                :class="[
                  'p-2.5 rounded-lg transition-colors',
                  activeTab === item.key
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                ]"
                @click="navigateTo(item)"
              >
                <component :is="item.icon" class="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent :side="uiStore.sidebarCollapsed ? 'right' : 'top'">
              {{ item.label }}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </nav>
  </aside>
</template>
