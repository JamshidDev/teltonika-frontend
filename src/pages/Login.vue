<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import LanguageSwitcher from '@/components/navigation/LanguageSwitcher.vue'
import { MapPin, User, Lock, Eye, EyeOff } from 'lucide-vue-next'

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
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-slate-50">
    <!-- Animated background -->
    <div class="absolute inset-0">
      <!-- Grid pattern -->
      <div class="absolute inset-0 bg-grid-pattern opacity-10"></div>

      <!-- Gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-emerald-500/10"></div>

      <!-- Animated circles/dots representing GPS points -->
      <div class="gps-dot" style="top: 15%; left: 20%;"></div>
      <div class="gps-dot" style="top: 25%; left: 75%;"></div>
      <div class="gps-dot" style="top: 60%; left: 10%;"></div>
      <div class="gps-dot" style="top: 70%; left: 85%;"></div>
      <div class="gps-dot" style="top: 85%; left: 40%;"></div>
      <div class="gps-dot" style="top: 40%; left: 60%;"></div>

      <!-- Animated route lines -->
      <svg class="absolute inset-0 w-full h-full opacity-30">
        <path class="route-line" d="M0,200 Q200,100 400,300 T800,200" />
        <path class="route-line route-line-delay" d="M100,400 Q300,200 500,400 T900,300" />
        <path class="route-line route-line-delay-2" d="M0,500 Q250,350 500,500 T1000,400" />
      </svg>

      <!-- Radar effect -->
      <div class="radar-container">
        <div class="radar-sweep"></div>
      </div>
    </div>

    <!-- Language switcher -->
    <div class="absolute top-4 right-4 z-20">
      <LanguageSwitcher />
    </div>

    <!-- Login Card -->
    <Card class="w-full max-w-md p-8 relative z-10 bg-white border-gray-200 shadow-2xl shadow-gray-200/50">
      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="relative">
          <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <MapPin class="h-10 w-10 text-white" />
          </div>
          <!-- Pulse ring -->
          <div class="absolute inset-0 w-20 h-20 bg-blue-500/30 rounded-2xl animate-ping"></div>
        </div>
        <h1 class="text-2xl font-bold text-foreground mt-2">{{ t('app.title') }}</h1>
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
              :type="showPassword ? 'text' : 'password'"
              :placeholder="t('auth.password')"
              class="pl-10 pr-10"
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

        <!-- Submit button -->
        <Button
          type="submit"
          class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
          :loading="authStore.loading"
          :disabled="!isFormValid"
        >
          {{ t('auth.loginButton') }}
        </Button>
      </form>
    </Card>
  </div>
</template>

<style scoped>
/* Grid pattern */
.bg-grid-pattern {
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.15) 1px, transparent 1px);
  background-size: 50px 50px;
}

/* GPS dots with ripple */
.gps-dot {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
}

.gps-dot::before,
.gps-dot::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 2px solid rgba(59, 130, 246, 0.6);
  animation: gps-ripple 2s ease-out infinite;
}

.gps-dot::after {
  animation-delay: 1s;
}

@keyframes gps-ripple {
  0% {
    width: 10px;
    height: 10px;
    opacity: 1;
  }
  100% {
    width: 50px;
    height: 50px;
    opacity: 0;
  }
}

/* Route lines */
.route-line {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 2;
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-route 4s linear infinite;
}

.route-line-delay {
  animation-delay: 1.5s;
}

.route-line-delay-2 {
  animation-delay: 3s;
}

@keyframes draw-route {
  0% {
    stroke-dashoffset: 1000;
  }
  50% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: -1000;
  }
}

/* Radar effect */
.radar-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  height: 500px;
  border-radius: 50%;
  border: 1px solid rgba(59, 130, 246, 0.15);
  overflow: hidden;
}

.radar-sweep {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 50%;
  transform-origin: bottom left;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.15));
  animation: radar-spin 4s linear infinite;
}

@keyframes radar-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
