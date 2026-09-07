<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { DrawerRoot, DrawerContent, DrawerOverlay, DrawerPortal } from 'vaul-vue'
import { useUiStore, type TabType } from '@/stores/ui.store'
import {
  Menu, X, MapPin,
  LayoutDashboard, Car, Users, Cpu, History,
  ParkingCircle, Power, Bell, FileText, Settings,
} from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()

const open = ref(false)

// IconNavbar bilan bir xil ro'yxat — mobilda hammasi shu yerdan ochiladi.
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
  { key: 'settings' as TabType, label: t('nav.settings'), icon: Settings, route: '/settings' },
])

const activeKey = computed(() => {
  const p = route.path
  return navItems.value.find((i) => i.route !== '/dashboard' && p.startsWith(i.route))?.key ?? 'dashboard'
})

// Sahifa almashsa panel yopiladi.
watch(() => route.path, () => { open.value = false })

function go(item: { key: TabType; route: string }) {
  uiStore.setSelectedTab(item.key)
  router.push(item.route)
  open.value = false
}
</script>

<template>
  <!-- Ochish tugmasi — xarita ustida ham ko'rinadi -->
  <button
    class="fixed top-3 left-3 z-[1050] h-11 w-11 rounded-full bg-background shadow-lg flex items-center justify-center md:hidden"
    :aria-label="t('common.open')"
    @click="open = true"
  >
    <Menu class="h-5 w-5" />
  </button>

  <DrawerRoot v-model:open="open" direction="left">
    <DrawerPortal>
      <DrawerOverlay class="fixed inset-0 z-[1200] bg-black/40" />
      <DrawerContent
        class="fixed inset-y-0 left-0 z-[1201] flex w-[82%] max-w-xs flex-col bg-background shadow-2xl outline-none"
      >
        <!-- Sarlavha -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <MapPin class="h-5 w-5 text-primary-foreground" />
            </div>
            <span class="font-semibold">{{ t('app.title') }}</span>
          </div>
          <button
            class="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground active:bg-accent"
            :aria-label="t('common.close')"
            @click="open = false"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Sahifalar -->
        <nav class="flex-1 overflow-y-auto p-2">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors"
            :class="
              activeKey === item.key
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground active:bg-accent'
            "
            @click="go(item)"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0" />
            <span class="text-sm font-medium">{{ item.label }}</span>
          </button>
        </nav>
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style>
/* Ro'yxat scroll'i panelni tortib yubormasin */
[data-vaul-drawer-direction='left'] [class*='overflow-y-auto'] {
  overscroll-behavior: contain;
}
</style>
