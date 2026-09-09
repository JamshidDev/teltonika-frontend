import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type TabType = 'dashboard' | 'vehicles' | 'drivers' | 'devices' | 'history' | 'reports' | 'settings' | 'engine-events' | 'users' | 'roles'
export type Language = 'uz' | 'ru' | 'en'

export const useUiStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(true)
  const sidebarCollapsed = ref(false)
  const selectedTab = ref<TabType>('dashboard')
  const language = ref<Language>(
    (localStorage.getItem('language') as Language) || 'uz'
  )
  // Sukut bo'yicha dark tema — foydalanuvchi tanlovi saqlangan bo'lsa, o'sha ustun.
  const darkMode = ref(localStorage.getItem('darkMode') !== 'false')
  // Sheet'dan xaritaga "barchasini ko'rsatish" signali — hisoblagich oshsa xarita reaksiya qiladi.
  const fitAllRequest = ref(0)
  // Xaritaga bosilganda pastki varaqni yig'ish signali.
  const sheetCollapseRequest = ref(0)
  // Yon navigatsiya paneli — header'dagi tugma boshqaradi.
  const navDrawerOpen = ref(false)
  // Xarita qatlami — pastki menyudagi "Ko'proq" boshqaradi.
  const mapTile = ref<string>('light')
  // Dashboard paneli — pastki suzuvchi menyu boshqaradi (desktop + mobil).
  const panelOpen = ref(false)
  const panelTab = ref<'live' | 'scheduled'>('live')

  const mapZoom = ref(12)
  const mapCenter = ref<[number, number]>([41.2995, 69.2401]) // Tashkent coordinates

  // Watch for dark mode changes and update document class
  watch(
    darkMode,
    (value) => {
      if (value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('darkMode', String(value))
    },
    { immediate: true }
  )

  // Watch for language changes
  watch(language, (value) => {
    localStorage.setItem('language', value)
  })

  // Actions
  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function setSidebarOpen(value: boolean): void {
    sidebarOpen.value = value
  }

  function toggleSidebarCollapse(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setSelectedTab(tab: TabType): void {
    selectedTab.value = tab
  }

  function setLanguage(lang: Language): void {
    language.value = lang
  }

  function toggleDarkMode(): void {
    darkMode.value = !darkMode.value
  }

  function setMapZoom(zoom: number): void {
    mapZoom.value = zoom
  }

  function setMapCenter(center: [number, number]): void {
    mapCenter.value = center
  }

  function requestFitAll() {
    fitAllRequest.value++
  }

  function requestSheetCollapse() {
    sheetCollapseRequest.value++
  }

  function setNavDrawerOpen(value: boolean) {
    navDrawerOpen.value = value
  }

  function setMapTile(key: string) {
    mapTile.value = key
  }

  function selectPanel(tab: 'live' | 'scheduled') {
    // Ochiq turgan bo'lim qayta bosilsa — yopiladi.
    if (panelOpen.value && panelTab.value === tab) {
      panelOpen.value = false
      return
    }
    panelTab.value = tab
    panelOpen.value = true
  }

  function closePanel() {
    panelOpen.value = false
  }

  return {
    // State
    sidebarOpen,
    sidebarCollapsed,
    selectedTab,
    language,
    darkMode,
    mapZoom,
    mapCenter,
    fitAllRequest,
    sheetCollapseRequest,
    navDrawerOpen,
    mapTile,
    panelOpen,
    panelTab,
    // Actions
    toggleSidebar,
    setSidebarOpen,
    toggleSidebarCollapse,
    setSelectedTab,
    setLanguage,
    toggleDarkMode,
    setMapZoom,
    setMapCenter,
    requestFitAll,
    requestSheetCollapse,
    setNavDrawerOpen,
    setMapTile,
    selectPanel,
    closePanel,
  }
})
