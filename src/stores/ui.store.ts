import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type TabType = 'dashboard' | 'vehicles' | 'drivers' | 'devices' | 'history' | 'events' | 'reports' | 'settings' | 'stop-events' | 'engine-events'
export type Language = 'uz' | 'ru' | 'en'

export const useUiStore = defineStore('ui', () => {
  // State
  const sidebarOpen = ref(true)
  const sidebarCollapsed = ref(false)
  const selectedTab = ref<TabType>('dashboard')
  const language = ref<Language>(
    (localStorage.getItem('language') as Language) || 'uz'
  )
  const darkMode = ref(
    localStorage.getItem('darkMode') === 'true' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
  )
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

  return {
    // State
    sidebarOpen,
    sidebarCollapsed,
    selectedTab,
    language,
    darkMode,
    mapZoom,
    mapCenter,
    // Actions
    toggleSidebar,
    setSidebarOpen,
    toggleSidebarCollapse,
    setSelectedTab,
    setLanguage,
    toggleDarkMode,
    setMapZoom,
    setMapCenter,
  }
})
