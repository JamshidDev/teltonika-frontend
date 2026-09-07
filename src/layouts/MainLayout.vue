<script setup lang="ts">
import AppHeader from '@/components/navigation/AppHeader.vue'
import MobileNavDrawer from '@/components/navigation/MobileNavDrawer.vue'


</script>

<template>
  <div class="h-screen flex overflow-hidden bg-background">
    <!-- Main Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Doimiy header: yon panel tugmasi | logo + nom | profil -->
      <AppHeader />

      <!-- Page Content -->
      <main class="flex-1 relative overflow-hidden">
        <router-view />
      </main>
    </div>

    <!-- Mobil navigatsiya — 10 ta sahifaning hammasi chapdan ochiladi -->
    <MobileNavDrawer />
  </div>
</template>
