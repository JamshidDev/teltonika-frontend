<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IconNavbar from '@/components/navigation/IconNavbar.vue'
import TopNavbar from '@/components/navigation/TopNavbar.vue'
import MobileNavDrawer from '@/components/navigation/MobileNavDrawer.vue'

const route = useRoute()

const isDashboard = computed(() => route.path === '/dashboard' || route.path === '/')
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-background">
    <!-- Left Icon Navigation (faqat desktop) -->
    <IconNavbar />

    <!-- Main Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Navbar (hidden on Dashboard) -->
      <TopNavbar v-if="!isDashboard" />

      <!-- Page Content -->
      <main class="flex-1 relative overflow-hidden">
        <router-view />
      </main>
    </div>

    <!-- Mobil navigatsiya — 10 ta sahifaning hammasi chapdan ochiladi -->
    <MobileNavDrawer />
  </div>
</template>
