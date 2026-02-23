<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import LanguageSwitcher from './LanguageSwitcher.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MapPin, User, LogOut, Moon, Sun, Settings } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()

function handleLogout() {
  authStore.logout()
}

function goToSettings() {
  router.push('/settings')
}
</script>

<template>
  <header
    class="h-14 bg-background border-b border-border flex items-center justify-between px-4 z-40"
  >
    <!-- Logo -->
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
        <MapPin class="h-5 w-5 text-primary-foreground" />
      </div>
      <span class="font-bold text-lg text-foreground">{{ t('app.title') }}</span>
    </div>

    <!-- Right side actions -->
    <div class="flex items-center gap-2">
      <!-- Dark mode toggle -->
      <Button variant="ghost" size="icon" @click="uiStore.toggleDarkMode()">
        <Moon v-if="!uiStore.darkMode" class="h-5 w-5" />
        <Sun v-else class="h-5 w-5" />
      </Button>

      <!-- Language switcher -->
      <LanguageSwitcher />

      <!-- User menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="gap-2 px-2">
            <div
              class="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center"
            >
              <User class="h-4 w-4 text-primary" />
            </div>
            <span class="text-sm font-medium hidden sm:inline">
              {{ authStore.currentUser?.name }}
            </span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" class="w-48">
          <div class="px-2 py-1.5 text-sm font-medium">
            {{ authStore.currentUser?.email }}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="gap-2 cursor-pointer" @click="goToSettings">
            <Settings class="h-4 w-4" />
            {{ t('nav.settings') }}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="gap-2 cursor-pointer text-destructive focus:text-destructive"
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
