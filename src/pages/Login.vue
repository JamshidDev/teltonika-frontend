<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import Input from '@/components/ui/Input.vue'
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher.vue'
import MapShowcase from '@/components/auth/MapShowcase.vue'
import { MapPin, User, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()
// Initialize UI store to ensure dark mode class is applied on document
const uiStore = useUiStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)

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
  <div class="h-[100dvh] overflow-y-auto lg:overflow-hidden flex bg-background">
    <!-- Left Column — Login Form -->
    <div class="w-full lg:w-[36%] xl:w-[32%] flex flex-col relative bg-background">
      <!-- Language switcher -->
      <div class="absolute top-5 right-5 z-20 flex items-center gap-1">
        <button
          type="button"
          class="h-9 w-9 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          :aria-label="uiStore.darkMode ? 'Light' : 'Dark'"
          @click="uiStore.toggleDarkMode()"
        >
          <Sun v-if="uiStore.darkMode" class="h-[18px] w-[18px]" />
          <Moon v-else class="h-[18px] w-[18px]" />
        </button>
        <LanguageSwitcher />
      </div>

      <!-- Form centered -->
      <div class="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-10 xl:px-12">
        <div class="w-full max-w-[360px]">
          <!-- Logo -->
          <div class="flex flex-col items-center mb-10">
            <div class="relative mb-4">
              <div class="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                <MapPin class="h-8 w-8 text-primary-foreground" />
              </div>
              <div class="absolute -inset-1 bg-primary/25 rounded-2xl blur-sm -z-10"></div>
            </div>
            <h1 class="text-xl font-bold tracking-wide text-foreground">
              {{ t('app.title') }}
            </h1>
            <p class="text-muted-foreground text-sm mt-0.5">{{ t('app.subtitle') }}</p>
          </div>

          <!-- Welcome text -->
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-foreground">{{ t('auth.loginSubtitle') }}</h2>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Error message -->
            <div
              v-if="authStore.error"
              class="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive dark:text-red-400 text-sm"
            >
              {{ authStore.error }}
            </div>

            <!-- Email -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">
                {{ t('auth.email') }}
              </label>
              <div class="relative">
                <User class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="email"
                  type="email"
                  :placeholder="t('auth.email')"
                  class="pl-10 h-12 rounded-xl bg-secondary/60 dark:bg-muted border-transparent dark:border-white/10 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">
                {{ t('auth.password') }}
              </label>
              <div class="relative">
                <Lock class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="t('auth.password')"
                  class="pl-10 pr-10 h-12 rounded-xl bg-secondary/60 dark:bg-muted border-transparent dark:border-white/10 focus-visible:ring-offset-0"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                </button>
              </div>
            </div>

            <!-- Submit — o'chiq holatda ham matn o'qilarli bo'lishi uchun alohida uslub -->
            <button
              type="submit"
              :disabled="authStore.loading"
              class="w-full h-12 rounded-xl text-[15px] font-semibold inline-flex items-center justify-center gap-2 transition-colors
                     bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                     disabled:cursor-wait"
            >
              <svg
                v-if="authStore.loading"
                class="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ t('auth.loginButton') }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Right Column — Showcase (hidden on mobile) -->
    <div class="hidden lg:flex lg:w-[64%] xl:w-[68%] bg-showcase text-showcase-foreground flex-col relative overflow-hidden">
      <!-- To'liq fon — jonli xarita illyustratsiyasi -->
      <MapShowcase />

    </div>
  </div>
</template>
