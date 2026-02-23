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
      isConnected.value = true
      socket?.emit('track:subscribe')
    })

    socket.on('disconnect', () => {
      isConnected.value = false
    })

    socket.on('car:location', (data) => {
      console.log('[Socket] car:location:', data)
      vehiclesStore.updateVehiclePosition(data)
      lastUpdate.value = new Date()
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
