<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Card from '@/components/ui/Card.vue'
import { Bell } from 'lucide-vue-next'

const { t } = useI18n()
</script>

<template>
  <div class="h-full flex flex-col p-4 overflow-auto">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold text-foreground">
        {{ t('events.title') }}
      </h1>
      <Bell class="h-6 w-6 text-muted-foreground" />
    </div>

    <Card class="flex-1 flex items-center justify-center">
      <p class="text-muted-foreground">{{ t('common.noData') }}</p>
    </Card>
  </div>
</template>
