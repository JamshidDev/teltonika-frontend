<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Route, TimerOff, Fuel, Gauge } from 'lucide-vue-next'
import VehicleGlyph from '@/components/auth/VehicleGlyph.vue'

const { t } = useI18n()

// Ko'cha to'ri — yo'nalish shu chiziqlar ustidan o'tadi.
const streetsX = { major: [270, 630], minor: [150, 450, 780] }
const streetsY = { major: [240, 510], minor: [150, 380, 620] }

// Burchaklari yumaloqlangan ortogonal yo'l — real ko'chalar bo'ylab burilish.
function roundedPath(points: [number, number][], r = 16) {
  const pts = points as [number, number][]
  let d = `M ${pts[0]![0]} ${pts[0]![1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]!
    const [cx, cy] = pts[i]!
    const [nx, ny] = pts[i + 1]!
    const d1 = Math.hypot(cx - px, cy - py)
    const d2 = Math.hypot(nx - cx, ny - cy)
    const rr = Math.min(r, d1 / 2, d2 / 2)
    d += ` L ${cx + ((px - cx) / d1) * rr} ${cy + ((py - cy) / d1) * rr}`
    d += ` Q ${cx} ${cy} ${cx + ((nx - cx) / d2) * rr} ${cy + ((ny - cy) / d2) * rr}`
  }
  const last = pts[pts.length - 1]!
  return `${d} L ${last[0]} ${last[1]}`
}

// A → B → C: birinchi segment sariq, ikkinchisi yashil-jigarrang.
const pointA: [number, number] = [150, 620]
const pointB: [number, number] = [780, 150]
const pointC: [number, number] = [270, 380]

// Yo'l pastdan kirib keladi va C dan keyin chapga chiqib ketadi.
const entryPoint: [number, number] = [150, 800]
const exitPoint: [number, number] = [-90, 380]

const legAB: [number, number][] = [
  entryPoint,
  pointA,
  [150, 510],
  [450, 510],
  [450, 380],
  [630, 380],
  [630, 240],
  [780, 240],
  pointB,
]
// B dan chapga davom etadi va C dan keyin kadrdan chiqib ketadi
const legBC: [number, number][] = [pointB, [270, 150], pointC, exitPoint]

const pathAB = roundedPath(legAB)
const pathBC = roundedPath(legBC)
const fullPath = roundedPath([...legAB, ...legBC.slice(1)])

// Ikkinchi transport — fon uchun so'niq yo'nalish.
const ghostPath = roundedPath([
  [270, 90],
  [270, 240],
  [450, 240],
  [450, 380],
  [880, 380],
])

// Uch svetafor — har bir rang 3 sekunddan: qizil → sariq → yashil.
const LIGHT_STEP = 3
const LIGHT_CYCLE = LIGHT_STEP * 3
const trafficLights: { x: number; y: number; stop: [number, number]; offset: number }[] = [
  { x: 300, y: 492, stop: [300, 510], offset: 4 },
  { x: 560, y: 362, stop: [560, 380], offset: 0.5 },
  { x: 600, y: 132, stop: [600, 150], offset: 7 },
]

// Kamera — tezlikka qarab yaqinlashadi/uzoqlashadi (xaritadagi zoom kabi)
const viewBox = ref('0 0 900 720')
const MAX_ZOOM = 1.12
let zoom = 1
let camX = 450
let camY = 360

const routeEl = ref<SVGPathElement | null>(null)
const car = ref({ x: pointA[0], y: pointA[1], angle: -90 })
const speedKmh = ref(0)
const lightPhase = ref<('red' | 'yellow' | 'green')[]>(trafficLights.map(() => 'red'))

// Transportlar navbati — biri chiqib ketgach keyingisi kirib keladi.
const vehicles = [
  { type: 'car' as const, speed: 78 },
  { type: 'truck' as const, speed: 56 },
  { type: 'moto' as const, speed: 96 },
]
const vehicleIndex = ref(0)
const vehicle = computed(() => vehicles[vehicleIndex.value] ?? vehicles[0]!)
const visible = ref(true)
const GAP = 1.1 // navbatdagi transport kirishidan oldingi tanaffus, sekund
const KMH_PER_UNIT = 0.8
const STOP_ZONE = 26 // to'xtash chizig'igacha masofa (viewBox birligi)
const SLOW_ZONE = 240 // sekinlashish boshlanadigan masofa
const CRAWL = 11 // minimal sudralish tezligi — chiziqqa yetib borishi uchun
const TURN_LOOKAHEAD = 58 // burilishni oldindan sezish masofasi

let raf = 0
let lastTs = 0
let travelled = 0
let speed = (vehicles[0]?.speed ?? 78) * 0.6 // birinchi transport ham oqim bilan kirib kelsin
let elapsed = 0
let gap = 0
// Har bir svetaforning yo'l bo'yicha masofasi
let lightLen: number[] = trafficLights.map(() => Infinity)

// Svetafor to'xtash chizig'i yo'lning qaysi masofasiga to'g'ri kelishini topamiz.
function measureLights(path: SVGPathElement) {
  const total = path.getTotalLength()
  const steps = 600
  lightLen = trafficLights.map((tl) => {
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i <= steps; i++) {
      const len = (total * i) / steps
      const p = path.getPointAtLength(len)
      const dist = Math.hypot(p.x - tl.stop[0], p.y - tl.stop[1])
      if (dist < bestDist) {
        bestDist = dist
        best = len
      }
    }
    return best
  })
}

// Vaqt bo'yicha svetafor rangi — qizil → sariq → yashil, har biri 3 sekund.
function phaseAt(t: number, offset: number): 'red' | 'yellow' | 'green' {
  const x = (((t + offset) % LIGHT_CYCLE) + LIGHT_CYCLE) % LIGHT_CYCLE
  if (x < LIGHT_STEP) return 'red'
  if (x < LIGHT_STEP * 2) return 'yellow'
  return 'green'
}

// Yo'lning berilgan nuqtasidagi yo'nalish burchagi
function headingAt(path: SVGPathElement, len: number, total: number) {
  const a = path.getPointAtLength(Math.max(0, Math.min(len, total)))
  const b = path.getPointAtLength(Math.max(0, Math.min(len + 6, total)))
  return Math.atan2(b.y - a.y, b.x - a.x)
}

function tick(ts: number) {
  const path = routeEl.value
  if (!path) {
    raf = requestAnimationFrame(tick)
    return
  }
  const total = path.getTotalLength()
  const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0
  lastTs = ts
  elapsed += dt

  const phasesNow = trafficLights.map((tl) => phaseAt(elapsed, tl.offset))
  // Transportlar orasidagi tanaffus — svetaforlar ishlashda davom etadi
  if (gap > 0) {
    gap -= dt
    if (gap <= 0) visible.value = true
    lightPhase.value = phasesNow
    raf = requestAnimationFrame(tick)
    return
  }

  const base = vehicle.value.speed
  const f = travelled / total
  // Yo'l bo'ylab tabiiy tezlik o'zgarishi
  let target = base * (0.82 + 0.3 * Math.sin(f * Math.PI * 5))

  // Burilish — oldindagi burchak qanchalik keskin bo'lsa, shuncha sekinlashadi
  const h1 = headingAt(path, travelled + 4, total)
  const h2 = headingAt(path, travelled + TURN_LOOKAHEAD, total)
  let turn = Math.abs(h2 - h1)
  if (turn > Math.PI) turn = 2 * Math.PI - turn
  const corner = Math.min(turn / (Math.PI / 2), 1)
  if (corner > 0.05) target = Math.min(target, base * (1 - 0.12 * corner))
  const phases = phasesNow
  let stopAt: number | null = null

  trafficLights.forEach((_, i) => {
    const len = lightLen[i] ?? Infinity
    const d = len - travelled // svetaforgacha masofa
    if (d < STOP_ZONE - 1 || d > SLOW_ZONE) return
    if (phases[i] === 'green') return

    // Sariq yoki qizil — to'xtash chizig'igacha sekinlashadi va kutadi
    if (d > STOP_ZONE) {
      target = Math.min(target, Math.max(base * ((d - STOP_ZONE) / SLOW_ZONE), CRAWL))
    } else {
      target = 0
    }
    const line = len - STOP_ZONE
    stopAt = stopAt === null ? line : Math.min(stopAt, line)
  })

  const rate = target > speed ? 1.5 : 3.2
  speed += (target - speed) * Math.min(dt * rate, 1)
  if (target === 0 && speed < 6) speed = 0
  travelled += speed * dt

  // To'xtash chizig'idan o'tib ketmasin
  if (stopAt !== null && travelled > stopAt) {
    travelled = stopAt
    speed = 0
  }
  if (travelled >= total) {
    // Navbatdagi transport kirib keladi
    travelled = 0
    visible.value = false
    gap = GAP
    vehicleIndex.value = (vehicleIndex.value + 1) % vehicles.length
    speed = (vehicles[vehicleIndex.value]?.speed ?? 78) * 0.6
  }

  const p = path.getPointAtLength(travelled)
  const ahead = path.getPointAtLength(Math.min(travelled + 6, total))
  car.value = {
    x: p.x,
    y: p.y,
    angle: (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI,
  }
  speedKmh.value = speed * KMH_PER_UNIT
  lightPhase.value = phases

  // Sekinlashsa — yaqinlashadi, tezlashsa — uzoqlashadi
  const norm = Math.min(speed / base, 1)
  const targetZoom = 1 + (MAX_ZOOM - 1) * (1 - norm)
  zoom += (targetZoom - zoom) * Math.min(dt * 0.2, 1)
  const w = 900 / zoom
  const h = 720 / zoom
  // Yaqinlashgan sari kamera transportga suriladi
  const follow = Math.min(((zoom - 1) / (MAX_ZOOM - 1)) * 1.4, 1)
  camX += (450 + (p.x - 450) * follow - camX) * Math.min(dt * 0.5, 1)
  camY += (360 + (p.y - 360) * follow - camY) * Math.min(dt * 0.5, 1)
  // Kirish/chiqish qismlari kadr tashqarisida — kameraga biroz erkinlik beramiz
  const mx = 170
  const my = 190
  const cx = Math.min(Math.max(camX, w / 2 - mx), 900 - w / 2 + mx)
  const cy = Math.min(Math.max(camY, h / 2 - my), 720 - h / 2 + my)
  viewBox.value = `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  requestAnimationFrame(() => {
    if (routeEl.value) measureLights(routeEl.value)
    raf = requestAnimationFrame(tick)
  })
})
onBeforeUnmount(() => cancelAnimationFrame(raf))

// Aerial ko'rinish uchun "binolar" — seed bilan barqaror generatsiya.
function buildBlocks() {
  let seed = 20260910
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const xs = [...streetsX.major, ...streetsX.minor]
  const ys = [...streetsY.major, ...streetsY.minor]
  const blocks: { x: number; y: number; w: number; h: number; o: number }[] = []
  for (let i = 0; i < 420; i++) {
    const w = 10 + rnd() * 26
    const h = 10 + rnd() * 22
    const x = rnd() * 885
    const y = 40 + rnd() * 650
    if (xs.some((r) => x + w > r - 14 && x < r + 14)) continue
    if (ys.some((r) => y + h > r - 14 && y < r + 14)) continue
    // Daryo, park va ko'l ustiga bino tushmasin.
    if (y < 130) continue
    if (x > 300 && x < 440 && y > 250 && y < 375) continue
    if (x > 660 && x < 820 && y > 520 && y < 630) continue
    blocks.push({ x, y, w, h, o: 0.02 + rnd() * 0.05 })
  }
  return blocks
}

const blocks = buildBlocks()

// Xarita ustidagi ko'rsatkichlar
const stats = computed(() => [
  { icon: Route, color: 'text-primary', value: '148.6', unit: 'km', label: t('auth.showcaseDistance') },
  { icon: TimerOff, color: 'text-orange-400', value: '72', unit: t('auth.showcaseMinutes'), label: t('auth.showcaseIdle') },
  { icon: Fuel, color: 'text-sky-400', value: '18.4', unit: 'L', label: t('auth.showcaseFuel') },
  { icon: Gauge, color: 'text-green-400', value: '62', unit: 'km/h', label: t('auth.showcaseAvgSpeed') },
])

// Parkdagi daraxtlar
const trees = [
  [320, 275], [352, 300], [388, 268], [412, 305], [335, 340], [378, 348], [408, 335],
]

// A / B / C nuqtalari — har biri o'z gradienti bilan
const waypoints = [
  { p: pointA, label: 'A', id: 'wpA', light: '#4ade80', dark: '#15803d', ink: '#15803d' },
  { p: pointB, label: 'B', id: 'wpB', light: '#f87171', dark: '#b91c1c', ink: '#b91c1c' },
  { p: pointC, label: 'C', id: 'wpC', light: '#ffe066', dark: '#d19b00', ink: '#8a6500' },
]
</script>

<template>
  <div class="absolute inset-0 overflow-hidden">
    <svg
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
      class="absolute inset-0 h-full w-full"
      role="img"
      :aria-label="t('auth.showcaseTitle')"
    >
      <defs>
        <linearGradient id="routeGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.07" />
          <stop offset="55%" stop-color="hsl(var(--primary))" stop-opacity="0.18" />
          <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.16" />
        </linearGradient>
        <linearGradient id="routeGradBC" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#22c55e" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#a16207" stop-opacity="0.18" />
        </linearGradient>
        <filter id="routeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient v-for="w in waypoints" :key="w.id" :id="w.id" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="w.light" />
          <stop offset="100%" :stop-color="w.dark" />
        </linearGradient>
        <filter id="markerShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" flood-color="#000" flood-opacity="0.5" />
        </filter>
        <filter id="carShadow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.55" />
        </filter>
        <radialGradient id="mapFade" cx="50%" cy="50%" r="72%">
          <stop offset="40%" stop-color="#fff" stop-opacity="1" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </radialGradient>
        <mask id="fadeMask">
          <rect width="900" height="720" fill="url(#mapFade)" />
        </mask>
      </defs>

      <!-- Aerial xarita qatlami — chekkalarda so'nadi -->
      <g mask="url(#fadeMask)">
        <!-- Kvartal to'ri -->
        <g stroke="hsl(var(--showcase-foreground))" stroke-opacity="0.04" stroke-width="1">
          <path v-for="y in 18" :key="`h${y}`" :d="`M 0 ${y * 40} H 900`" />
          <path v-for="x in 22" :key="`v${x}`" :d="`M ${x * 40} 0 V 720`" />
        </g>

        <!-- Binolar -->
        <g fill="hsl(var(--showcase-foreground))">
          <rect
            v-for="(b, i) in blocks"
            :key="`b${i}`"
            :x="b.x"
            :y="b.y"
            :width="b.w"
            :height="b.h"
            :fill-opacity="b.o"
            rx="2"
          />
        </g>

        <!-- Park -->
        <g>
          <rect x="300" y="250" width="140" height="125" rx="10" fill="#4ade80" fill-opacity="0.07" />
          <circle v-for="(p, i) in trees" :key="`t${i}`" :cx="p[0]" :cy="p[1]" r="7" fill="#4ade80" fill-opacity="0.13" />
        </g>

        <!-- Ko'l -->
        <path
          d="M 690 545 C 740 528, 800 540, 812 570 C 824 604, 776 626, 730 618 C 686 610, 664 566, 690 545 Z"
          fill="#38bdf8"
          fill-opacity="0.12"
        />

        <!-- Daryo -->
        <path
          d="M -30 92 C 160 140, 330 40, 520 96 S 760 44, 930 104"
          fill="none"
          stroke="#38bdf8"
          stroke-opacity="0.13"
          stroke-width="22"
          stroke-linecap="round"
        />

        <!-- Temir yo'l -->
        <g stroke="hsl(var(--showcase-foreground))" stroke-opacity="0.10">
          <path d="M -30 690 L 930 430" stroke-width="2.5" fill="none" />
          <path d="M -30 690 L 930 430" stroke-width="7" stroke-dasharray="2 14" fill="none" />
        </g>

        <!-- Asosiy ko'chalar -->
        <g
          stroke="hsl(var(--showcase-foreground))"
          stroke-opacity="0.10"
          stroke-width="14"
          stroke-linecap="round"
          fill="none"
        >
          <path v-for="x in streetsX.major" :key="`mx${x}`" :d="`M ${x} -30 V 750`" />
          <path v-for="y in streetsY.major" :key="`my${y}`" :d="`M -30 ${y} H 930`" />
        </g>
        <!-- Ikkilamchi ko'chalar -->
        <g
          stroke="hsl(var(--showcase-foreground))"
          stroke-opacity="0.10"
          stroke-width="10"
          stroke-linecap="round"
          fill="none"
        >
          <path v-for="x in streetsX.minor" :key="`nx${x}`" :d="`M ${x} -30 V 750`" />
          <path v-for="y in streetsY.minor" :key="`ny${y}`" :d="`M -30 ${y} H 930`" />
        </g>
        <!-- Yo'l markazidagi ajratkichlar -->
        <g
          stroke="hsl(var(--showcase-foreground))"
          stroke-opacity="0.13"
          stroke-width="1"
          stroke-dasharray="9 13"
          fill="none"
        >
          <path v-for="x in streetsX.major" :key="`dx${x}`" :d="`M ${x} -30 V 750`" />
          <path v-for="y in streetsY.major" :key="`dy${y}`" :d="`M -30 ${y} H 930`" />
        </g>

        <!-- Aylanma harakat -->
        <g fill="none" stroke="hsl(var(--showcase-foreground))">
          <circle cx="630" cy="620" r="26" stroke-opacity="0.10" stroke-width="12" />
          <circle cx="630" cy="620" r="26" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="6 8" />
        </g>

        <!-- Ko'prik — daryo ustidan o'tuvchi ko'chalar -->
        <g stroke="hsl(var(--showcase-foreground))" stroke-opacity="0.22" stroke-width="1.5">
          <path d="M 256 78 V 118" />
          <path d="M 284 78 V 118" />
          <path d="M 616 84 V 124" />
          <path d="M 644 84 V 124" />
        </g>
      </g>

      <!-- Svetaforlar -->
      <g v-for="(tl, i) in trafficLights" :key="`tl${i}`" :transform="`translate(${tl.x} ${tl.y})`">
        <rect
          x="-4"
          y="-11"
          width="8"
          height="22"
          rx="3"
          fill="#0d0d0d"
          fill-opacity="0.85"
          stroke="hsl(var(--showcase-foreground))"
          stroke-opacity="0.18"
          stroke-width="0.8"
        />
        <circle cy="-6" r="2" fill="#ef4444" :fill-opacity="lightPhase[i] === 'red' ? 1 : 0.18" />
        <circle cy="0" r="2" fill="#facc15" :fill-opacity="lightPhase[i] === 'yellow' ? 1 : 0.18" />
        <circle cy="6" r="2" fill="#22c55e" :fill-opacity="lightPhase[i] === 'green' ? 1 : 0.18" />
      </g>

      <!-- Boshqa transportning so'niq yo'nalishi -->
      <path
        :d="ghostPath"
        fill="none"
        stroke="hsl(var(--showcase-foreground))"
        stroke-opacity="0.18"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-dasharray="7 9"
      />

      <!-- A → B segmenti -->
      <path
        :d="pathAB"
        fill="none"
        stroke="url(#routeGrad)"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- B → C segmenti -->
      <path
        :d="pathBC"
        fill="none"
        stroke="url(#routeGradBC)"
        stroke-width="11"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- To'liq yo'l — harakat trayektoriyasi va oqim punktiri -->
      <path
        ref="routeEl"
        :d="fullPath"
        fill="none"
        stroke="hsl(var(--showcase-foreground))"
        stroke-opacity="0.16"
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray="3 15"
      >
        <animate attributeName="stroke-dashoffset" from="60" to="0" dur="2.4s" repeatCount="indefinite" />
      </path>

      <!-- Qiziqish nuqtalari -->
      <g fill="hsl(var(--showcase-foreground))" fill-opacity="0.22">
        <circle cx="270" cy="510" r="3" />
        <circle cx="780" cy="620" r="3" />
        <circle cx="450" cy="150" r="3" />
        <circle cx="780" cy="380" r="3" />
      </g>

      <!-- To'xtash nuqtasi -->
      <g>
        <circle cx="450" cy="510" r="4.5" fill="#fb923c" />
        <circle cx="450" cy="510" r="8" fill="none" stroke="#fb923c" stroke-opacity="0.45" />
      </g>

      <!-- A / B / C markerlari -->
      <g v-for="pt in waypoints" :key="pt.label" :transform="`translate(${pt.p[0]} ${pt.p[1]})`">
        <!-- Yerdagi soya va pulsatsiya -->
        <ellipse cy="10" rx="9" ry="3" fill="#000" fill-opacity="0.4" />
        <circle r="13" :fill="pt.light" fill-opacity="0.14">
          <animate attributeName="r" values="9;24;9" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" values="0.22;0;0.22" dur="3.2s" repeatCount="indefinite" />
        </circle>
        <circle r="4" :fill="pt.light" fill-opacity="0.35" />

        <!-- Pin -->
        <g filter="url(#markerShadow)">
          <path
            d="M 0 9 C 0 9 -12.5 -3 -12.5 -11.5 C -12.5 -18.4 -6.9 -24 0 -24 C 6.9 -24 12.5 -18.4 12.5 -11.5 C 12.5 -3 0 9 0 9 Z"
            :fill="`url(#${pt.id})`"
            stroke="#ffffff"
            stroke-opacity="0.35"
            stroke-width="1"
          />
          <!-- Yuqoridagi yorug'lik -->
          <path
            d="M -8.5 -17.5 C -6.5 -20.5 -3.5 -22 0 -22 C 3.5 -22 6.5 -20.5 8.5 -17.5 C 5.5 -19.2 2.8 -20 0 -20 C -2.8 -20 -5.5 -19.2 -8.5 -17.5 Z"
            fill="#ffffff"
            fill-opacity="0.4"
          />
          <circle cy="-12" r="7" fill="#ffffff" fill-opacity="0.95" />
          <text
            x="0"
            y="-8.6"
            text-anchor="middle"
            font-size="10"
            font-weight="800"
            font-family="inherit"
            :fill="pt.ink"
          >{{ pt.label }}</text>
        </g>
      </g>

      <!-- Kuzatuvdagi transport — radar halqalari bilan -->
      <g v-if="visible" :transform="`translate(${car.x} ${car.y})`">
        <g fill="none" stroke="hsl(var(--primary))">
          <circle r="10" stroke-opacity="0.5" stroke-width="1.2">
            <animate attributeName="r" values="9;34;9" dur="2.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <circle r="10" stroke-opacity="0.3" stroke-width="1.2">
            <animate attributeName="r" values="9;34;9" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
          </circle>
        </g>
        <circle r="13" fill="hsl(var(--primary))" fill-opacity="0.12" />

        <g :transform="`rotate(${car.angle + 90})`" filter="url(#carShadow)">
          <VehicleGlyph :type="vehicle.type" />
        </g>
      </g>

      <!-- Joriy tezlik -->
      <g v-if="visible" :transform="`translate(${car.x} ${car.y - 28})`">
        <rect
          x="-24"
          y="-10"
          width="48"
          height="19"
          rx="9.5"
          fill="hsl(var(--showcase))"
          fill-opacity="0.55"
          stroke="hsl(var(--primary))"
          stroke-opacity="0.35"
          stroke-width="1"
        />
        <text x="0" y="4" text-anchor="middle" font-size="11" font-weight="600" fill="hsl(var(--primary))" fill-opacity="0.9">
          {{ Math.round(speedKmh) }}<tspan
            font-size="7.5"
            font-weight="500"
            fill="hsl(var(--showcase-foreground))"
            fill-opacity="0.6"
          > km/h</tspan>
        </text>
      </g>
    </svg>

    <!-- Radial gradient effektlar -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background:
        radial-gradient(50% 40% at 82% 16%, hsl(var(--primary) / 0.16), transparent 70%),
        radial-gradient(45% 40% at 12% 88%, rgba(56, 189, 248, 0.14), transparent 70%);"
    ></div>

    <!-- Chekkalarda haqiqiy blur — markaz tiniq qoladi -->
    <div
      class="absolute inset-0 pointer-events-none backdrop-blur-[4px]"
      style="mask-image:
          linear-gradient(to right, #000 0%, transparent 18%),
          linear-gradient(to left, #000 0%, transparent 18%),
          linear-gradient(to bottom, #000 0%, transparent 16%),
          linear-gradient(to top, #000 0%, transparent 16%),
          radial-gradient(105% 88% at 50% 50%, transparent 42%, #000 90%);
        -webkit-mask-image:
          linear-gradient(to right, #000 0%, transparent 18%),
          linear-gradient(to left, #000 0%, transparent 18%),
          linear-gradient(to bottom, #000 0%, transparent 16%),
          linear-gradient(to top, #000 0%, transparent 16%),
          radial-gradient(105% 88% at 50% 50%, transparent 42%, #000 90%);
        mask-composite: add;
        -webkit-mask-composite: source-over;"
    ></div>

    <!-- Chekka bo'ylab rangli radial soya — section ramkasi effekti -->
    <div
      class="absolute inset-0 pointer-events-none"
      style="background:
        radial-gradient(70% 55% at 50% 0%, hsl(var(--primary) / 0.16), transparent 62%),
        radial-gradient(70% 55% at 100% 50%, hsl(var(--primary) / 0.12), transparent 60%),
        radial-gradient(70% 55% at 0% 50%, rgba(56, 189, 248, 0.12), transparent 60%),
        radial-gradient(80% 55% at 50% 100%, rgba(56, 189, 248, 0.10), transparent 62%),
        linear-gradient(to right, hsl(var(--showcase)) 0%, hsl(var(--showcase) / 0) 16%),
        linear-gradient(to left, hsl(var(--showcase)) 0%, hsl(var(--showcase) / 0) 16%),
        linear-gradient(to bottom, hsl(var(--showcase)) 0%, hsl(var(--showcase) / 0) 15%),
        linear-gradient(to top, hsl(var(--showcase)) 0%, hsl(var(--showcase) / 0) 15%),
        radial-gradient(108% 92% at 50% 50%, transparent 34%, hsl(var(--showcase) / 0.55) 68%, hsl(var(--showcase) / 0.96) 100%);
        box-shadow:
          inset 0 0 150px 45px hsl(var(--showcase) / 0.8),
          inset 0 0 220px hsl(var(--primary) / 0.08),
          inset 0 0 80px rgba(0, 0, 0, 0.6);"
    ></div>

    <!-- Transport turlari — yuqoridagi info kartochka -->
    <div
      class="absolute top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-2xl
             bg-showcase-foreground/[0.05] backdrop-blur-xl border border-showcase-foreground/[0.12]
             shadow-lg shadow-black/20 p-1"
    >
      <div class="relative flex items-center">
        <!-- Siljiydigan aktiv belgisi -->
        <div
          class="absolute left-0 top-0 h-8 w-9 rounded-lg bg-primary/15 ring-1 ring-primary/25
                 transition-transform duration-500 ease-out"
          :style="{ transform: `translateX(${vehicleIndex * 36}px)` }"
        ></div>
        <div
          v-for="(v, i) in vehicles"
          :key="v.type"
          class="relative z-10 h-8 w-9 flex items-center justify-center"
        >
          <svg
            :viewBox="v.type === 'moto' ? '-12 -13 24 26' : '-17 -18 34 36'"
            class="h-5 w-5 transition-all duration-500 ease-out"
            :class="i === vehicleIndex ? 'opacity-100 scale-110' : 'opacity-35 scale-90'"
          >
            <VehicleGlyph :type="v.type" />
          </svg>
        </div>
      </div>

      <!-- Joriy tezlik — kenglik sakramasligi uchun qat'iy o'lchamda -->
      <div class="w-[52px] pr-1.5 text-right text-[10px] font-semibold tabular-nums text-primary/90">
        <template v-if="visible">
          {{ Math.round(speedKmh) }}<span class="text-[8px] font-normal opacity-70"> km/h</span>
        </template>
      </div>
    </div>

    <!-- Statistika kartochkalari -->
    <div class="absolute inset-x-5 bottom-5 z-10 flex flex-wrap justify-center gap-2">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="flex items-center gap-2 rounded-xl bg-showcase-foreground/[0.05] backdrop-blur-xl
               border border-showcase-foreground/[0.12] shadow-lg shadow-black/20 px-3 py-2"
      >
        <component :is="stat.icon" class="h-4 w-4 shrink-0 opacity-80" :class="stat.color" />
        <div class="leading-tight">
          <p class="text-[12px] font-medium text-showcase-foreground/85">
            {{ stat.value }}
            <span class="text-[9px] font-normal text-showcase-foreground/45">{{ stat.unit }}</span>
          </p>
          <p class="text-[9px] text-showcase-foreground/40 whitespace-nowrap">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
