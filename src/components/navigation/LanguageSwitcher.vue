<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore, type Language } from '@/stores/ui.store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const { locale } = useI18n()
const uiStore = useUiStore()

const languages = [
  { code: 'uz' as Language, flag: '🇺🇿' },
  { code: 'ru' as Language, flag: '🇷🇺' },
  { code: 'en' as Language, flag: '🇬🇧' },
]

const currentLanguage = computed(() =>
  languages.find((l) => l.code === uiStore.language)
)

function setLanguage(lang: Language) {
  uiStore.setLanguage(lang)
  locale.value = lang
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="sm" class="gap-1.5">
        <span class="text-base">{{ currentLanguage?.flag }}</span>
        <span class="text-sm font-medium uppercase">{{ currentLanguage?.code }}</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="min-w-[100px]">
      <DropdownMenuItem
        v-for="lang in languages"
        :key="lang.code"
        class="gap-2 cursor-pointer"
        :class="{ 'bg-accent': uiStore.language === lang.code }"
        @click="setLanguage(lang.code)"
      >
        <span class="text-base">{{ lang.flag }}</span>
        <span class="uppercase">{{ lang.code }}</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
