<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore, type Language } from '@/stores/ui.store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, User, LogOut, Moon, Sun, Settings, Check } from 'lucide-vue-next'

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

const languages = [
  { code: 'uz' as Language, flag: '🇺🇿', label: "O'zbekcha" },
  { code: 'ru' as Language, flag: '🇷🇺', label: 'Русский' },
  { code: 'en' as Language, flag: '🇬🇧', label: 'English' },
]

function setLanguage(lang: Language) {
  uiStore.setLanguage(lang)
  locale.value = lang
}

function handleLogout() {
  authStore.logout()
}

function goToSettings() {
  router.push('/settings')
}
</script>

<template>
  <header
    class="app-header h-14 shrink-0 relative z-40 bg-background flex items-center justify-between px-2 md:px-4"
  >
    <!-- Chap: yon panel tugmasi -->
    <div class="flex-1 flex items-center">
      <button
        class="h-11 w-11 rounded-full flex items-center justify-center text-foreground active:bg-accent hover:bg-accent transition-colors"
        :aria-label="t('common.open')"
        @click="uiStore.setNavDrawerOpen(true)"
      >
        <Menu class="h-5 w-5" />
      </button>
    </div>

    <!-- Markaz: logo + nom -->
    <div class="shrink-0">
      <span class="font-semibold text-base md:text-lg tracking-wide text-foreground whitespace-nowrap">
        {{ t('app.title') }}
      </span>
    </div>

    <!-- O'ng: til, tema (desktop) va profil avatari -->
    <div class="flex-1 flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            class="h-10 w-10 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/85 transition-colors"
            :aria-label="authStore.currentUser?.name ?? 'profile'"
          >
            <User class="h-5 w-5 text-background" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" :side-offset="8" class="z-[1300] w-[min(18rem,calc(100vw-1.5rem))]">
          <div class="px-2 py-1.5">
            <div class="text-sm font-medium">{{ authStore.currentUser?.name }}</div>
            <div class="text-xs text-muted-foreground">{{ authStore.currentUser?.email }}</div>
          </div>
          <DropdownMenuSeparator />

          <!-- Tema -->
          <DropdownMenuItem class="gap-2.5 cursor-pointer py-2.5 md:py-1.5" @click="uiStore.toggleDarkMode()">
            <Moon v-if="!uiStore.darkMode" class="h-4 w-4" />
            <Sun v-else class="h-4 w-4" />
            {{ uiStore.darkMode ? 'Light' : 'Dark' }}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <!-- Til -->
          <DropdownMenuItem
            v-for="lang in languages"
            :key="lang.code"
            class="gap-2.5 cursor-pointer py-2.5 md:py-1.5"
            @click="setLanguage(lang.code)"
          >
            <span class="text-base">{{ lang.flag }}</span>
            <span class="flex-1">{{ lang.label }}</span>
            <Check v-if="uiStore.language === lang.code" class="h-4 w-4 text-primary" />
          </DropdownMenuItem>

          <DropdownMenuItem class="gap-2.5 cursor-pointer py-2.5 md:py-1.5" @click="goToSettings">
            <Settings class="h-4 w-4" />
            {{ t('nav.settings') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="gap-2.5 cursor-pointer py-2.5 md:py-1.5 text-destructive focus:text-destructive"
            @click="handleLogout"
          >
            <LogOut class="h-4 w-4" />
            {{ t('auth.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<style scoped>
/* Xarita ustida ajralib tursin — pastga yo'nalgan yumshoq soya */
.app-header {
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06);
}

:global(.dark) .app-header {
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.4);
}
</style>

