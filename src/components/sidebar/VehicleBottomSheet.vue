<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { DrawerRoot, DrawerContent, DrawerHandle, DrawerPortal } from 'vaul-vue'
import { Car, Route, History, X } from 'lucide-vue-next'
import VehicleSidebar from '@/components/sidebar/VehicleSidebar.vue'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'

type SheetTab = 'live' | 'scheduled' | 'history'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()

// vaul offsetni (1 - snap) * oyna balandligi deb hisoblaydi — varaq 100dvh bo'lishi shart.
const SNAP_PEEK = 0.1
const SNAP_OPEN = 0.9
const snapPoints: (string | number)[] = [SNAP_PEEK, SNAP_OPEN]

const activeSnapPoint = ref<number | string | null>(SNAP_PEEK)
const isPeek = computed(() => activeSnapPoint.value === SNAP_PEEK)

const activeTab = ref<SheetTab>('live')

const menu = computed(() => [
  { key: 'live' as SheetTab, icon: Car, label: t('mobileNav.vehicles') },
  { key: 'scheduled' as SheetTab, icon: Route, label: t('mobileNav.route') },
  { key: 'history' as SheetTab, icon: History, label: t('mobileNav.history') },
])

function collapse() {
  if (!isPeek.value) activeSnapPoint.value = SNAP_PEEK
}

function toggle() {
  activeSnapPoint.value = isPeek.value ? SNAP_OPEN : SNAP_PEEK
}

// Xaritada natija ko'rinishi kerak bo'lgan har qanday amaldan keyin varaq yopiladi.
watch(
  () => [
    vehiclesStore.selectedVehicleId,
    vehiclesStore.followedVehicleId,
    vehiclesStore.routePoints.length,
    vehiclesStore.spotMarker,
  ],
  ([carId, followId, routeLen, spot], old) => {
    if (!old) return
    const [oldCar, oldFollow, oldRouteLen, oldSpot] = old
    const tanlandi = carId && carId !== oldCar
    const kuzatildi = followId && followId !== oldFollow
    const marshrutChizildi = routeLen && routeLen !== oldRouteLen
    const nuqtaTanlandi = spot && spot !== oldSpot
    if (tanlandi || kuzatildi || marshrutChizildi || nuqtaTanlandi) collapse()
  }
)

// Xaritaga bosilganda ham yig'iladi.
watch(() => uiStore.sheetCollapseRequest, collapse)

function select(key: SheetTab) {
  // Ochiq turgan menyu qayta bosilsa — yopiladi.
  if (!isPeek.value && activeTab.value === key) {
    activeSnapPoint.value = SNAP_PEEK
    return
  }
  activeTab.value = key
  activeSnapPoint.value = SNAP_OPEN
}
</script>

<template>
  <!-- modal=false → xarita bilan ishlash to'xtamaydi; dismissible=false → varaq butunlay yopilmaydi -->
  <DrawerRoot
    :open="true"
    :modal="false"
    :dismissible="false"
    :snap-points="snapPoints"
    v-model:active-snap-point="activeSnapPoint"
  >
    <DrawerPortal>
      <DrawerContent
        class="sheet-root fixed inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl outline-none"
        style="height: 100dvh"
      >
        <!-- Tortish dastagi — bosilsa ham ochiladi/yopiladi -->
        <button
          class="shrink-0 w-full py-2 flex items-center justify-center"
          :aria-label="isPeek ? t('common.open') : t('common.close')"
          @click="toggle"
        >
          <DrawerHandle class="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </button>

        <!-- Pastki menyu — peek holatida shu ko'rinadi -->
        <nav
          class="shrink-0 flex items-stretch border-b border-border"
          :class="isPeek ? 'border-transparent' : ''"
          data-vaul-no-drag
        >
          <button
            v-for="item in menu"
            :key="item.key"
            class="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
            :class="
              !isPeek && activeTab === item.key
                ? 'text-primary'
                : 'text-muted-foreground active:text-foreground'
            "
            @click="select(item.key)"
          >
            <component :is="item.icon" class="h-5 w-5" />
            <span class="text-[11px] font-medium leading-none">{{ item.label }}</span>
          </button>

          <!-- Ko'rinadigan yopish tugmasi (faqat ochiq holatda) -->
          <button
            v-show="!isPeek"
            class="shrink-0 w-12 flex items-center justify-center text-muted-foreground active:text-foreground"
            :aria-label="t('common.close')"
            @click="collapse"
          >
            <X class="h-5 w-5" />
          </button>
        </nav>

        <!-- Tanlangan menyu mazmuni — sidebar o'z tab panelisiz -->
        <VehicleSidebar
          v-show="!isPeek"
          :tab="activeTab"
          hide-tabs
          class="min-h-0 flex-1 overflow-hidden"
        />
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style>
/* Ichki ro'yxat scroll'i sahifaga uzatilmasin — aks holda varaq beixtiyor tortiladi. */
.sheet-root [class*='overflow-y-auto'],
.sheet-root [class*='overflow-auto'] {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
</style>
