<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import IconNavbar from '@/components/navigation/IconNavbar.vue'
import TopNavbar from '@/components/navigation/TopNavbar.vue'

const route = useRoute()

const isDashboard = computed(() => route.path === '/dashboard' || route.path === '/')
</script>

<template>
  <div class="h-screen flex overflow-hidden bg-background">
    <!-- Left Icon Navigation -->
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
  </div>
</template>
