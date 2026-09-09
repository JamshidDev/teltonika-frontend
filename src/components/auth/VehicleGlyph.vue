<script setup lang="ts">
import carIcon from '@/assets/taxi-marker.svg'

// Tepadan ko'rinish transport shakllari — xaritada ham, kartochkada ham ishlatiladi.
defineProps<{ type: 'car' | 'truck' | 'moto' }>()
</script>

<template>
  <!-- Yengil avtomobil — loyihaning o'z ikonasi -->
  <image v-if="type === 'car'" :href="carIcon" x="-15" y="-15" width="30" height="30" />

  <!-- Yuk mashina -->
  <g v-else-if="type === 'truck'">
    <rect x="-8.5" y="-4" width="17" height="20" rx="2" fill="#e2e8f0" />
    <rect x="-8.5" y="-4" width="17" height="20" rx="2" fill="#0f172a" fill-opacity="0.12" />
    <rect x="-7.5" y="-16" width="15" height="12.5" rx="3" fill="hsl(var(--primary))" />
    <rect x="-5" y="-14.5" width="10" height="4.5" rx="1.5" fill="#0f172a" fill-opacity="0.75" />
    <rect x="-6" y="-3" width="12" height="1.4" rx="0.7" fill="#0f172a" fill-opacity="0.35" />
    <g fill="#0f172a" fill-opacity="0.8">
      <rect x="-10.5" y="-12" width="2.5" height="5" rx="1" />
      <rect x="8" y="-12" width="2.5" height="5" rx="1" />
      <rect x="-10.5" y="2" width="2.5" height="6" rx="1" />
      <rect x="8" y="2" width="2.5" height="6" rx="1" />
    </g>
  </g>

  <!-- Mototsikl -->
  <g v-else>
    <g fill="#0f172a" fill-opacity="0.85">
      <rect x="-1.6" y="-11" width="3.2" height="6" rx="1.4" />
      <rect x="-1.6" y="5" width="3.2" height="6" rx="1.4" />
    </g>
    <rect x="-6.5" y="-6.5" width="13" height="1.8" rx="0.9" fill="#0f172a" fill-opacity="0.7" />
    <rect x="-3" y="-6" width="6" height="12" rx="3" fill="hsl(var(--primary))" />
    <circle cy="-1" r="3.2" fill="#0f172a" fill-opacity="0.8" />
    <circle cy="-1" r="1.6" fill="hsl(var(--primary))" fill-opacity="0.7" />
  </g>
</template>
