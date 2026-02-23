<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useUiStore, type Language } from '@/stores/ui.store'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  Settings as SettingsIcon,
  Languages,
  Moon,
  Sun,
  Map,
  Bell,
  Globe,
  Check,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const uiStore = useUiStore()

const languages = [
  { code: 'uz' as Language, name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru' as Language, name: 'Русский', flag: '🇷🇺' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
]

function setLanguage(lang: Language) {
  uiStore.setLanguage(lang)
  locale.value = lang
}
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('settings.title') }}
      </h1>
      <SettingsIcon class="h-6 w-6 text-muted-foreground" />
    </div>

    <div class="space-y-4 max-w-2xl">
      <!-- Language Settings -->
      <Card class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <Languages class="h-5 w-5 text-primary" />
          <h3 class="text-lg font-semibold">{{ t('settings.language') }}</h3>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="lang in languages"
            :key="lang.code"
            :class="[
              'p-4 rounded-lg border-2 transition-all text-center',
              uiStore.language === lang.code
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            ]"
            @click="setLanguage(lang.code)"
          >
            <span class="text-2xl mb-2 block">{{ lang.flag }}</span>
            <span class="font-medium">{{ lang.name }}</span>
            <Check
              v-if="uiStore.language === lang.code"
              class="h-4 w-4 text-primary mx-auto mt-2"
            />
          </button>
        </div>
      </Card>

      <!-- Theme Settings -->
      <Card class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <Moon class="h-5 w-5 text-primary" />
          <h3 class="text-lg font-semibold">{{ t('settings.theme') }}</h3>
        </div>

        <div class="flex gap-4">
          <button
            :class="[
              'flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3',
              !uiStore.darkMode
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            ]"
            @click="uiStore.darkMode && uiStore.toggleDarkMode()"
          >
            <Sun class="h-5 w-5" />
            <span class="font-medium">{{ t('settings.lightMode') }}</span>
          </button>

          <button
            :class="[
              'flex-1 p-4 rounded-lg border-2 transition-all flex items-center justify-center gap-3',
              uiStore.darkMode
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50',
            ]"
            @click="!uiStore.darkMode && uiStore.toggleDarkMode()"
          >
            <Moon class="h-5 w-5" />
            <span class="font-medium">{{ t('settings.darkMode') }}</span>
          </button>
        </div>
      </Card>

      <!-- Map Settings -->
      <Card class="p-6">
        <div class="flex items-center gap-3 mb-4">
          <Map class="h-5 w-5 text-primary" />
          <h3 class="text-lg font-semibold">{{ t('settings.mapType') }}</h3>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            class="p-4 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center gap-2"
          >
            <Globe class="h-5 w-5" />
            <span class="font-medium">{{ t('map.street') }}</span>
          </button>

          <button
            class="p-4 rounded-lg border-2 border-border hover:border-primary/50 flex items-center justify-center gap-2"
          >
            <Map class="h-5 w-5" />
            <span class="font-medium">{{ t('map.satellite') }}</span>
          </button>
        </div>
      </Card>

      <!-- Notifications -->
      <Card class="p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Bell class="h-5 w-5 text-primary" />
            <div>
              <h3 class="text-lg font-semibold">{{ t('settings.notifications') }}</h3>
              <p class="text-sm text-muted-foreground">
                Enable push notifications
              </p>
            </div>
          </div>

          <Badge variant="success">ON</Badge>
        </div>
      </Card>
    </div>
  </div>
</template>
