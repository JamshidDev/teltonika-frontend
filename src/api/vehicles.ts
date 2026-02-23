import api from './axios'
import type { Vehicle, VehiclePosition } from '@/types'

// Vehicles API endpoints (for realtime tracking)
export const vehiclesApi = {
  // Get realtime positions - to be implemented later
  async getRealtimePositions(): Promise<Record<number, VehiclePosition>> {
    const response = await api.get<Record<number, VehiclePosition>>('/vehicles/realtime')
    return response.data
  },
}
