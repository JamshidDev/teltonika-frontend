<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher.vue'
import { MapPin, User, Lock, Eye, EyeOff, Navigation, Truck, MapPinned, Route } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()

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

// Testimonial carousel — horizontal slide
const activeTestimonial = ref(0)
const testimonialKeys = [
  { text: 'auth.testimonial1', author: 'auth.testimonial1Author' },
  { text: 'auth.testimonial2', author: 'auth.testimonial2Author' },
  { text: 'auth.testimonial3', author: 'auth.testimonial3Author' },
]

let testimonialInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  testimonialInterval = setInterval(() => {
    activeTestimonial.value = (activeTestimonial.value + 1) % testimonialKeys.length
  }, 5000)
})

onBeforeUnmount(() => {
  if (testimonialInterval) clearInterval(testimonialInterval)
})
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Left Column — Login Form -->
    <div class="w-full lg:w-[45%] flex flex-col relative bg-white">
      <!-- Language switcher -->
      <div class="absolute top-5 right-5 z-20">
        <LanguageSwitcher />
      </div>

      <!-- Form centered -->
      <div class="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16">
        <div class="w-full max-w-[400px]">
          <!-- Logo -->
          <div class="flex flex-col items-center mb-10">
            <div class="relative mb-4">
              <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <MapPin class="h-8 w-8 text-white" />
              </div>
              <div class="absolute -inset-1 bg-blue-500/20 rounded-2xl blur-sm -z-10"></div>
            </div>
            <h1 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {{ t('app.title') }}
            </h1>
            <p class="text-muted-foreground text-sm mt-0.5">{{ t('app.subtitle') }}</p>
          </div>

          <!-- Welcome text -->
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-foreground">{{ t('auth.welcomeBack') }}</h2>
            <p class="text-muted-foreground text-sm mt-1">{{ t('auth.loginSubtitle') }}</p>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Error message -->
            <div
              v-if="authStore.error"
              class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
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
                  class="pl-10 h-11"
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
                  class="pl-10 pr-10 h-11"
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

            <!-- Submit -->
            <Button
              type="submit"
              class="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 text-[15px]"
              :loading="authStore.loading"
              :disabled="!isFormValid"
            >
              {{ t('auth.loginButton') }}
            </Button>
          </form>
        </div>
      </div>
    </div>

    <!-- Right Column — Showcase (hidden on mobile) -->
    <div class="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 flex-col relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0); background-size: 40px 40px;"></div>
      </div>

      <!-- Floating GPS icons -->
      <div class="absolute top-[10%] left-[8%] text-white/10">
        <Navigation class="h-16 w-16" />
      </div>
      <div class="absolute top-[25%] right-[12%] text-white/10">
        <MapPinned class="h-12 w-12" />
      </div>
      <div class="absolute bottom-[15%] left-[15%] text-white/10">
        <Route class="h-14 w-14" />
      </div>
      <div class="absolute bottom-[30%] right-[8%] text-white/10">
        <Truck class="h-16 w-16" />
      </div>

      <!-- Content -->
      <div class="flex-1 flex flex-col justify-center px-12 xl:px-16 relative z-10">
        <!-- Testimonial — horizontal slide -->
        <div class="mb-10">
          <div class="relative min-h-[140px] overflow-hidden">
            <div
              v-for="(tk, i) in testimonialKeys"
              :key="i"
              class="absolute inset-0 transition-all duration-500 ease-in-out"
              :style="{
                transform: `translateX(${(i - activeTestimonial) * 100}%)`,
                opacity: i === activeTestimonial ? 1 : 0,
              }"
            >
              <p class="text-2xl xl:text-3xl font-medium text-white leading-relaxed">
                "{{ t(tk.text) }}"
              </p>
              <p class="text-blue-200 mt-4 text-sm">— {{ t(tk.author) }}</p>
            </div>
          </div>

          <!-- Dots -->
          <div class="flex gap-2 mt-6">
            <button
              v-for="(_, i) in testimonialKeys"
              :key="i"
              :class="[
                'w-2.5 h-2.5 rounded-full transition-all duration-300',
                activeTestimonial === i ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              ]"
              @click="activeTestimonial = i"
            />
          </div>
        </div>

        <!-- Feature cards -->
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center mb-3">
              <Navigation class="h-5 w-5 text-green-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">{{ t('auth.featureLiveTracking') }}</h3>
            <p class="text-blue-200 text-xs mt-1">{{ t('auth.featureLiveTrackingDesc') }}</p>
          </div>

          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-blue-400/20 flex items-center justify-center mb-3">
              <Route class="h-5 w-5 text-blue-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">{{ t('auth.featureRouteHistory') }}</h3>
            <p class="text-blue-200 text-xs mt-1">{{ t('auth.featureRouteHistoryDesc') }}</p>
          </div>

          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-purple-400/20 flex items-center justify-center mb-3">
              <Truck class="h-5 w-5 text-purple-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">{{ t('auth.featureFleetManagement') }}</h3>
            <p class="text-blue-200 text-xs mt-1">{{ t('auth.featureFleetManagementDesc') }}</p>
          </div>

          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-orange-400/20 flex items-center justify-center mb-3">
              <MapPinned class="h-5 w-5 text-orange-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">{{ t('auth.featureSmartAlerts') }}</h3>
            <p class="text-blue-200 text-xs mt-1">{{ t('auth.featureSmartAlertsDesc') }}</p>
          </div>
        </div>
      </div>

      <!-- Bottom decoration -->
      <div class="px-12 pb-6 relative z-10">
        <div class="flex items-center gap-3 text-blue-300/60 text-xs">
          <MapPin class="h-4 w-4" />
          <span>{{ t('app.title') }} — {{ t('app.subtitle') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
