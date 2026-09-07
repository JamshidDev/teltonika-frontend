<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { DrawerRoot, DrawerContent, DrawerHandle, DrawerPortal } from 'vaul-vue'
import { Car, Route, MoreHorizontal } from 'lucide-vue-next'
import VehiclePanel from '@/components/sidebar/VehiclePanel.vue'
import MapLayersList from '@/components/sidebar/MapLayersList.vue'
import { useVehiclesStore } from '@/stores/vehicles.store'
import { useUiStore } from '@/stores/ui.store'
import { useBreakpoint } from '@/composables/useBreakpoint'

const { t } = useI18n()
const vehiclesStore = useVehiclesStore()
const uiStore = useUiStore()
const { isDesktop } = useBreakpoint()

const menu = computed(() => [
  { key: 'live' as const, icon: Car, label: t('mobileNav.vehicles') },
  { key: 'scheduled' as const, icon: Route, label: t('mobileNav.route') },
  { key: 'more' as const, icon: MoreHorizontal, label: t('mobileNav.more') },
])

// "Ko'proq" — navbar ustidagi alohida menyu (kartochka/varaqdan mustaqil)
const moreOpen = ref(false)

function onMenu(key: 'live' | 'scheduled' | 'more') {
  if (key === 'more') {
    // Kartochka/varaq yopiladi, o'rniga tugma ustida menyu chiqadi
    uiStore.closePanel()
    moreOpen.value = !moreOpen.value
    return
  }
  moreOpen.value = false
  uiStore.selectPanel(key)
}

// Tashqariga bosilsa menyu yopiladi
function onDocPointer(e: PointerEvent) {
  const el = e.target as HTMLElement
  if (!el.closest('.more-menu') && !el.closest('.floating-nav')) moreOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', onDocPointer))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointer))

// Varaq faqat mobilda; desktopda panel suzuvchi kartochkada ochiladi.
const open = computed({
  get: () => !isDesktop.value && uiStore.panelOpen,
  set: (v: boolean) => { if (!v) uiStore.closePanel() },
})

// Mobilda varaq xaritani to'sadi — amaldan keyin yopiladi.
// Desktopda kartochka xarita yonida turadi, yopish shart emas.
watch(
  () => [
    vehiclesStore.selectedVehicleId,
    vehiclesStore.followedVehicleId,
    vehiclesStore.routePoints.length,
    vehiclesStore.spotMarker,
  ],
  (cur, old) => {
    if (isDesktop.value || !old) return
    if (cur.some((v, i) => v && v !== old[i])) uiStore.closePanel()
  }
)

// Xaritaga bosilganda — faqat mobilda.
watch(() => uiStore.sheetCollapseRequest, () => {
  if (!isDesktop.value) uiStore.closePanel()
})
</script>

<template>
  <!-- Suzuvchi pastki menyu — desktopda ham, mobilda ham -->
  <nav
    class="floating-nav fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[420px] z-[1150] flex items-stretch overflow-hidden rounded-full"
    data-vaul-no-drag
  >
    <button
      v-for="item in menu"
      :key="item.key"
      class="flex-1 m-1 rounded-full flex flex-col items-center justify-center gap-1 py-2 transition-colors"
      :class="
        (item.key === 'more' ? moreOpen : uiStore.panelOpen && uiStore.panelTab === item.key)
          ? 'text-foreground bg-primary font-semibold'
          : 'text-foreground hover:bg-accent/60 active:bg-accent/60'
      "
      @click="onMenu(item.key)"
    >
      <component :is="item.icon" class="h-5 w-5" />
      <span class="text-[11px] font-medium leading-none">{{ item.label }}</span>
    </button>
  </nav>

  <!-- "Ko'proq" menyusi — navbar ustida, undan ajralgan holda -->
  <Transition name="more-menu">
    <div
      v-if="moreOpen"
      class="more-menu-wrap fixed left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-[420px] z-[1160] flex justify-end"
    >
      <div class="more-menu w-[260px] overflow-hidden rounded-2xl">
        <MapLayersList class="max-h-[50dvh] pb-3" />
      </div>
    </div>
  </Transition>

  <!-- Mobil varaq. modal=false → xarita bilan ishlash to'xtamaydi -->
  <DrawerRoot v-if="!isDesktop" v-model:open="open" :modal="false">
    <DrawerPortal>
      <DrawerContent
        class="sheet-root fixed inset-x-0 bottom-0 z-[1100] flex flex-col rounded-t-2xl border-t border-border bg-background shadow-2xl outline-none"
        style="height: 90dvh"
      >
        <div class="shrink-0 pt-2">
          <DrawerHandle class="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <!-- Suzuvchi menyu mazmunni to'smasligi uchun joy qoldiriladi -->
        <VehiclePanel class="sheet-body" />
      </DrawerContent>
    </DrawerPortal>
  </DrawerRoot>
</template>

<style>
/* Oyna effekti: pastdan 10px, kuchli blur, past shaffoflik */
.floating-nav {
  bottom: calc(10px + env(safe-area-inset-bottom));
  background-color: hsl(var(--background) / 0.45);
  /* saturate — orqadagi xarita ranglari oyna orqali jonli ko'rinadi */
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid hsl(var(--border) / 0.6);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.10);
}

.dark .floating-nav {
  background-color: hsl(var(--background) / 0.5);
  border-color: hsl(0 0% 100% / 0.12);
  box-shadow: 0 8px 28px rgb(0 0 0 / 0.6), 0 2px 8px rgb(0 0 0 / 0.45);
}

/* "Ko'proq" menyusi — navbardan 10px yuqorida, xuddi shunday oyna effekti */
.more-menu-wrap {
  bottom: calc(10px + 61px + 10px + env(safe-area-inset-bottom));
}

.more-menu {
  background-color: hsl(var(--background) / 0.85);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid hsl(var(--border) / 0.6);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18), 0 2px 6px rgb(0 0 0 / 0.10);
}

.dark .more-menu {
  background-color: hsl(var(--background) / 0.9);
  border-color: hsl(0 0% 100% / 0.12);
}

.more-menu-enter-active,
.more-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.more-menu-enter-from,
.more-menu-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

/* Suzuvchi menyu sheet ustida turadi — mazmun uning ostida qolmasin */
.sheet-body {
  padding-bottom: calc(78px + env(safe-area-inset-bottom));
}

/* Ichki ro'yxat scroll'i sahifaga uzatilmasin */
.sheet-root [class*='overflow-y-auto'],
.sheet-root [class*='overflow-auto'] {
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
</style>
