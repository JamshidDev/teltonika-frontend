<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { X } from 'lucide-vue-next'
import type { TimelineItem } from '@/types'

const props = defineProps<{
  timeline: TimelineItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', index: number): void
}>()

// Refs
const barRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const linePosition = ref<number | null>(null) // percent 0-100
const showPopover = ref(false)

// Convert timeline items to segments
const segments = computed(() => {
  if (!props.timeline.length) return []

  return props.timeline.map((item, index) => {
    let startTime: Date
    let endTime: Date

    if (item.type === 'route') {
      if (item.points.length === 0) return null
      startTime = new Date(item.points[0]!.recordedAt)
      endTime = new Date(item.points[item.points.length - 1]!.recordedAt)
    } else {
      startTime = new Date(item.startAt)
      endTime = new Date(item.endAt)
    }

    const dayStart = new Date(startTime)
    dayStart.setHours(0, 0, 0, 0)

    const totalMinutes = 24 * 60
    const startMinute = (startTime.getTime() - dayStart.getTime()) / (1000 * 60)
    const endMinute = (endTime.getTime() - dayStart.getTime()) / (1000 * 60)

    const leftPct = Math.max(0, (startMinute / totalMinutes) * 100)
    const widthPct = Math.min(100 - leftPct, ((endMinute - startMinute) / totalMinutes) * 100)

    const colors: Record<string, string> = {
      route: '#22c55e',
      parking: '#3b82f6',
      stop: '#3b82f6',
    }

    return {
      left: leftPct,
      width: Math.max(widthPct, 0.4),
      color: colors[item.type] || '#6b7280',
      type: item.type,
      index,
      startTime,
      endTime,
    }
  }).filter(Boolean) as {
    left: number
    width: number
    color: string
    type: string
    index: number
    startTime: Date
    endTime: Date
  }[]
})

// Find which segment the line is currently over
const hoveredSegment = computed(() => {
  if (linePosition.value === null) return null
  const pos = linePosition.value
  for (const seg of segments.value) {
    if (pos >= seg.left && pos <= seg.left + seg.width) {
      return seg
    }
  }
  return null
})

// Get popover data for the hovered segment
const popoverData = computed(() => {
  if (!hoveredSegment.value) return null
  const seg = hoveredSegment.value
  const item = props.timeline[seg.index]
  if (!item) return null

  const durationSeconds = item.type === 'route'
    ? (item.points.length >= 2
        ? (new Date(item.points[item.points.length - 1]!.recordedAt).getTime() - new Date(item.points[0]!.recordedAt).getTime()) / 1000
        : 0)
    : item.duration

  // Calculate time at cursor position
  const pos = linePosition.value ?? 0
  const minutesInDay = (pos / 100) * 24 * 60
  const hours = Math.floor(minutesInDay / 60)
  const mins = Math.floor(minutesInDay % 60)
  const secs = Math.floor((minutesInDay % 1) * 60)
  const cursorTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return {
    type: seg.type,
    cursorTime,
    begin: formatTimeHMS(seg.startTime),
    end: formatTimeHMS(seg.endTime),
    duration: formatDurationHMS(durationSeconds),
  }
})

function formatTimeHMS(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDurationHMS(seconds: number): string {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(Math.floor(seconds % 60)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// Get position percent from mouse/touch event
function getPositionFromEvent(e: MouseEvent | TouchEvent): number {
  if (!barRef.value) return 0
  const rect = barRef.value.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0]!.clientX : e.clientX
  const x = clientX - rect.left
  return Math.max(0, Math.min(100, (x / rect.width) * 100))
}

// Click on bar to place the line
function handleBarClick(e: MouseEvent) {
  const pos = getPositionFromEvent(e)
  linePosition.value = pos
  showPopover.value = true

  // Emit select if on a segment
  if (hoveredSegment.value) {
    emit('select', hoveredSegment.value.index)
  }
}

// Start dragging
function handleMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleTouchStart(_e: TouchEvent) {
  isDragging.value = true
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  linePosition.value = getPositionFromEvent(e)
  showPopover.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  e.preventDefault()
  linePosition.value = getPositionFromEvent(e)
  showPopover.value = true
}

function handleMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // Emit select for final position
  if (hoveredSegment.value) {
    emit('select', hoveredSegment.value.index)
  }
}

function handleTouchEnd() {
  isDragging.value = false
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)

  if (hoveredSegment.value) {
    emit('select', hoveredSegment.value.index)
  }
}

function closePopover() {
  showPopover.value = false
  linePosition.value = null
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
})

const typeLabels: Record<string, string> = {
  route: 'Trip',
  parking: 'Parking',
  stop: 'Stop',
}

const typeIcons: Record<string, string> = {
  route: '⇄',
  parking: '🅿️',
  stop: '⏸️',
}
</script>

<template>
  <div class="px-3 pt-3 pb-2 flex-shrink-0 select-none overflow-visible">
    <!-- Chart wrapper -->
    <div class="relative">

      <!-- Vertical indicator line -->
      <div
        v-if="linePosition !== null"
        class="absolute z-20 top-0 bottom-0 pointer-events-none"
        :style="{ left: `${linePosition}%`, transform: 'translateX(-50%)' }"
      >
        <!-- Circle handle (top) -->
        <div class="w-3.5 h-3.5 rounded-full bg-primary border-2 border-background shadow-lg -translate-y-1.5 -translate-x-[1px]" />
        <!-- Line -->
        <div class="w-0.5 bg-primary mx-auto" style="height: calc(100% + 3px); margin-top: -2px;" />
      </div>

      <!-- Bar with segments -->
      <div
        ref="barRef"
        class="relative h-8 bg-muted/60 rounded-lg overflow-visible cursor-pointer"
        @click="handleBarClick"
      >
        <!-- Loading shimmer -->
        <div v-if="loading" class="absolute inset-0 bg-gradient-to-r from-muted via-accent/50 to-muted animate-pulse rounded-lg" />

        <!-- Segments -->
        <template v-else>
          <div
            v-for="seg in segments"
            :key="seg.index"
            class="absolute top-0 h-full transition-opacity duration-100"
            :class="[
              hoveredSegment?.index === seg.index ? 'opacity-100' : 'opacity-80',
            ]"
            :style="{
              left: `${seg.left}%`,
              width: `${seg.width}%`,
              backgroundColor: seg.color,
              borderRadius: '2px',
            }"
          />
        </template>

        <!-- Invisible drag handle overlay on the line position -->
        <div
          v-if="linePosition !== null"
          class="absolute top-0 h-full w-6 z-30 cursor-grab active:cursor-grabbing"
          :style="{ left: `${linePosition}%`, transform: 'translateX(-50%)' }"
          @mousedown="handleMouseDown"
          @touchstart="handleTouchStart"
        />
      </div>

      <!-- Popover below the bar -->
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 -translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="showPopover && popoverData && linePosition !== null"
          class="mt-2 bg-primary text-primary-foreground rounded-lg shadow-xl px-3 py-2 text-xs"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <!-- Time header -->
              <div class="font-semibold text-[11px] mb-1">
                Time: {{ popoverData.cursorTime }}
              </div>

              <!-- Type -->
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[10px]">{{ typeIcons[popoverData.type] }}</span>
                <span class="font-medium">{{ typeLabels[popoverData.type] }}</span>
              </div>

              <!-- Details -->
              <div class="flex items-center gap-3 text-[10px] opacity-90">
                <span><span class="text-primary-foreground/70">Begin:</span> {{ popoverData.begin }}</span>
                <span><span class="text-primary-foreground/70">End:</span> {{ popoverData.end }}</span>
                <span><span class="text-primary-foreground/70">Duration:</span> {{ popoverData.duration }}</span>
              </div>
            </div>

            <!-- Close button -->
            <button
              class="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded hover:bg-white/20 transition-colors"
              @click.stop="closePopover"
            >
              <X class="h-3 w-3" />
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
