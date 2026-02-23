<script setup lang="ts">
import TopNavbar from '@/components/navigation/TopNavbar.vue'
import VehicleSidebar from '@/components/sidebar/VehicleSidebar.vue'
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden bg-background">
    <!-- Top Navbar -->
    <TopNavbar />

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar -->
      <VehicleSidebar />

      <!-- Map / Page Content -->
      <main class="flex-1 relative overflow-hidden">
        <router-view />
      </main>
    </div>
  </div>
</template>
