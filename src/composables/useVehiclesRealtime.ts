import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useVehiclesStore } from '@/stores/vehicles.store'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export function useVehiclesRealtime() {
  const vehiclesStore = useVehiclesStore()

  const isConnected = ref(false)
  const lastUpdate = ref<Date | null>(null)
  let socket: Socket | null = null

  function connect() {
    if (socket?.connected) return

    socket = io(`${SOCKET_URL}/tracking`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('%c[Socket] Connected', 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px;', `to ${SOCKET_URL}/tracking`)
      isConnected.value = true
      socket?.emit('track:subscribe')
      console.log('%c[Socket] Subscribed', 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px;', 'track:subscribe sent')
    })

    socket.on('disconnect', () => {
      console.log('%c[Socket] Disconnected', 'background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px;')
      isConnected.value = false
    })

    socket.on('car:location', (data) => {
      console.log('%c[Socket] car:location', 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;', {
        carId: data.carId,
        speed: data.speed,
        ignition: data.ignition,
        movement: data.movement,
      })
      vehiclesStore.updateVehiclePosition(data)
      lastUpdate.value = new Date()
    })

    socket.on('car:motion', (data) => {
      console.log('%c[Socket] car:motion', 'background: #8b5cf6; color: white; padding: 2px 6px; border-radius: 3px;', {
        carId: data.carId,
        carName: data.carName,
        status: data.status,
        since: data.since,
        lat: data.lat,
        lng: data.lng,
      })
      vehiclesStore.updateCarMotion(data)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    lastUpdate,
    connect,
    disconnect,
  }
}
