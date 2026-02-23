<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore, type TabType } from '@/stores/ui.store'
import {
  LayoutDashboard,
  History,
  Bell,
  FileText,
  Settings,
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

// Navigation items
const navItems = computed(() => [
  {
    key: 'dashboard' as TabType,
    label: t('nav.dashboard'),
    icon: LayoutDashboard,
    route: '/dashboard',
  },
  {
    key: 'history' as TabType,
    label: t('nav.history'),
    icon: History,
    route: '/history',
  },
  {
    key: 'events' as TabType,
    label: t('nav.events'),
    icon: Bell,
    route: '/events',
  },
  {
    key: 'reports' as TabType,
    label: t('nav.reports'),
    icon: FileText,
    route: '/reports',
  },
  {
    key: 'settings' as TabType,
    label: t('nav.settings'),
    icon: Settings,
    route: '/settings',
  },
])

// Active tab based on current route
const activeTab = computed(() => {
  const path = route.path
  if (path.includes('history')) return 'history'
  if (path.includes('events')) return 'events'
  if (path.includes('reports')) return 'reports'
  if (path.includes('settings')) return 'settings'
  return 'dashboard'
})

function navigateTo(item: (typeof navItems.value)[0]) {
  uiStore.setSelectedTab(item.key)
  router.push(item.route)
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border flex items-center justify-around px-4 z-50"
  >
    <button
      v-for="item in navItems"
      :key="item.key"
      :class="[
        'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors',
        activeTab === item.key
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      ]"
      @click="navigateTo(item)"
    >
      <component
        :is="item.icon"
        :class="['h-5 w-5', activeTab === item.key && 'text-primary']"
      />
      <span class="text-xs font-medium">{{ item.label }}</span>
    </button>
  </nav>
</template>
