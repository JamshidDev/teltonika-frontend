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

// Testimonial carousel
const activeTestimonial = ref(0)
const testimonials = [
  {
    text: 'Real-time vehicle tracking has transformed our fleet management. We reduced fuel costs by 23% in the first month.',
    author: 'Fleet Manager',
  },
  {
    text: 'The route history and stop detection features help us optimize delivery schedules and improve customer satisfaction.',
    author: 'Logistics Director',
  },
  {
    text: 'Simple, intuitive interface. Our drivers adapted quickly, and the live monitoring gives us complete visibility.',
    author: 'Operations Lead',
  },
]

let testimonialInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  testimonialInterval = setInterval(() => {
    activeTestimonial.value = (activeTestimonial.value + 1) % testimonials.length
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
              GPS Tracking
            </h1>
            <p class="text-muted-foreground text-sm mt-0.5">{{ t('app.subtitle') }}</p>
          </div>

          <!-- Welcome text -->
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-foreground">Welcome back</h2>
            <p class="text-muted-foreground text-sm mt-1">Log in to GPS Tracking</p>
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
        <!-- Testimonial -->
        <div class="mb-10">
          <div class="relative min-h-[120px]">
            <TransitionGroup
              enter-active-class="transition-all duration-500 ease-out"
              enter-from-class="opacity-0 translate-y-4"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-300 ease-in absolute"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-4"
            >
              <div
                v-for="(testimonial, i) in testimonials"
                v-show="activeTestimonial === i"
                :key="i"
              >
                <p class="text-2xl xl:text-3xl font-medium text-white leading-relaxed">
                  "{{ testimonial.text }}"
                </p>
                <p class="text-blue-200 mt-4 text-sm">— {{ testimonial.author }}</p>
              </div>
            </TransitionGroup>
          </div>

          <!-- Dots -->
          <div class="flex gap-2 mt-6">
            <button
              v-for="(_, i) in testimonials"
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
          <!-- Card 1: Live Tracking -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-green-400/20 flex items-center justify-center mb-3">
              <Navigation class="h-5 w-5 text-green-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">Live Tracking</h3>
            <p class="text-blue-200 text-xs mt-1">Real-time GPS monitoring for your entire fleet</p>
          </div>

          <!-- Card 2: Route History -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-blue-400/20 flex items-center justify-center mb-3">
              <Route class="h-5 w-5 text-blue-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">Route History</h3>
            <p class="text-blue-200 text-xs mt-1">Detailed trip history with stops and events</p>
          </div>

          <!-- Card 3: Fleet Management -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-purple-400/20 flex items-center justify-center mb-3">
              <Truck class="h-5 w-5 text-purple-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">Fleet Management</h3>
            <p class="text-blue-200 text-xs mt-1">Manage all vehicles from a single dashboard</p>
          </div>

          <!-- Card 4: Smart Alerts -->
          <div class="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div class="w-10 h-10 rounded-lg bg-orange-400/20 flex items-center justify-center mb-3">
              <MapPinned class="h-5 w-5 text-orange-300" />
            </div>
            <h3 class="text-white font-semibold text-sm">Smart Alerts</h3>
            <p class="text-blue-200 text-xs mt-1">Geofence and motion detection notifications</p>
          </div>
        </div>
      </div>

      <!-- Bottom decoration -->
      <div class="px-12 pb-6 relative z-10">
        <div class="flex items-center gap-3 text-blue-300/60 text-xs">
          <MapPin class="h-4 w-4" />
          <span>GPS Tracking — Vehicle Monitoring System</span>
        </div>
      </div>
    </div>
  </div>
</template>
