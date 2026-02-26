<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore, type TabType } from '@/stores/ui.store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Car,
  Users,
  Cpu,
  History,
  Bell,
  FileText,
  Settings,
  MapPin,
  ParkingCircle,
  Power,
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

// Navigation items
const navItems = computed(() => [
  { key: 'dashboard' as TabType, label: t('nav.dashboard'), icon: LayoutDashboard, route: '/dashboard' },
  { key: 'vehicles' as TabType, label: t('nav.vehicles'), icon: Car, route: '/vehicles' },
  { key: 'drivers' as TabType, label: t('nav.drivers'), icon: Users, route: '/drivers' },
  { key: 'devices' as TabType, label: t('nav.devices'), icon: Cpu, route: '/devices' },
  { key: 'history' as TabType, label: t('nav.history'), icon: History, route: '/history' },
  { key: 'stop-events' as TabType, label: t('nav.stopEvents'), icon: ParkingCircle, route: '/stop-events' },
  { key: 'engine-events' as TabType, label: t('nav.engineEvents'), icon: Power, route: '/engine-events' },
  { key: 'events' as TabType, label: t('nav.events'), icon: Bell, route: '/events' },
  { key: 'reports' as TabType, label: t('nav.reports'), icon: FileText, route: '/reports' },
])

const bottomItems = computed(() => [
  { key: 'settings' as TabType, label: t('nav.settings'), icon: Settings, route: '/settings' },
])

const activeTab = computed(() => {
  const path = route.path
  if (path.includes('vehicles')) return 'vehicles'
  if (path.includes('drivers')) return 'drivers'
  if (path.includes('devices')) return 'devices'
  if (path.includes('history')) return 'history'
  if (path.includes('stop-events')) return 'stop-events'
  if (path.includes('engine-events')) return 'engine-events'
  if (path.includes('events')) return 'events'
  if (path.includes('reports')) return 'reports'
  if (path.includes('settings')) return 'settings'
  return 'dashboard'
})

function navigateTo(item: { key: TabType; route: string }) {
  uiStore.setSelectedTab(item.key)
  router.push(item.route)
}
</script>

<template>
  <aside class="w-16 h-full bg-[#1e3a5f] flex flex-col items-center py-3 flex-shrink-0">
    <!-- Logo -->
    <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mb-6">
      <MapPin class="h-5 w-5 text-primary-foreground" />
    </div>

    <!-- Main Navigation -->
    <nav class="flex-1 flex flex-col items-center gap-1">
      <TooltipProvider :delay-duration="0">
        <Tooltip v-for="item in navItems" :key="item.key">
          <TooltipTrigger as-child>
            <button
              :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                activeTab === item.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/10',
              ]"
              @click="navigateTo(item)"
            >
              <component :is="item.icon" class="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" :side-offset="8">
            {{ item.label }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </nav>

    <!-- Bottom Navigation (Settings) -->
    <nav class="flex flex-col items-center gap-1">
      <TooltipProvider :delay-duration="0">
        <Tooltip v-for="item in bottomItems" :key="item.key">
          <TooltipTrigger as-child>
            <button
              :class="[
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                activeTab === item.key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/10',
              ]"
              @click="navigateTo(item)"
            >
              <component :is="item.icon" class="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" :side-offset="8">
            {{ item.label }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </nav>
  </aside>
</template>
