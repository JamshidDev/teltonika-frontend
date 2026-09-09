<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ShieldAlert } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

const { t } = useI18n()
const auth = useAuthStore()
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
    <div class="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
      <ShieldAlert class="h-7 w-7 text-destructive" />
    </div>
    <h1 class="text-xl font-bold">{{ t('access.title') }}</h1>
    <p class="max-w-md text-sm text-muted-foreground">
      {{ t('access.description', { role: auth.roleName }) }}
    </p>
  </div>
</template>
