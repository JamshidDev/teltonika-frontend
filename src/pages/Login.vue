<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher.vue'
import { MapPin, User, Lock, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

const email = ref('admin@test.com')
const password = ref('admin12345')

const isFormValid = computed(
  () => email.value.trim() !== '' && password.value !== ''
)

async function handleSubmit() {
  if (!isFormValid.value) return

  await authStore.login({
    email: email.value,
    password: password.value,
  })
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-background p-4"
  >
    <!-- Language switcher in top right -->
    <div class="absolute top-4 right-4">
      <LanguageSwitcher />
    </div>

    <Card class="w-full max-w-md p-8">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div
          class="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4"
        >
          <MapPin class="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 class="text-2xl font-bold text-foreground">{{ t('app.title') }}</h1>
        <p class="text-muted-foreground text-sm">{{ t('app.subtitle') }}</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Email -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            {{ t('auth.email') }}
          </label>
          <div class="relative">
            <User
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              v-model="email"
              type="email"
              :placeholder="t('auth.email')"
              class="pl-10"
              :error="!!authStore.error"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            {{ t('auth.password') }}
          </label>
          <div class="relative">
            <Lock
              class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              v-model="password"
              type="password"
              :placeholder="t('auth.password')"
              class="pl-10"
              :error="!!authStore.error"
            />
          </div>
        </div>

        <!-- Error message -->
        <div
          v-if="authStore.error"
          class="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm"
        >
          <AlertCircle class="h-4 w-4 flex-shrink-0" />
          <span>{{ t('auth.loginError') }}</span>
        </div>

        <!-- Submit button -->
        <Button
          type="submit"
          class="w-full"
          :loading="authStore.loading"
          :disabled="!isFormValid"
        >
          {{ t('auth.loginButton') }}
        </Button>
      </form>
    </Card>
  </div>
</template>
