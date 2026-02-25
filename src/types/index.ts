// User and Auth types
export interface User {
  id: number
  name: string
  email: string
  role?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

// Car types (from API)
export interface Car {
  id: number
  userId: number
  name: string
  carNumber: string | null
  createdAt: string
  updatedAt: string
  device: {
    id: number
    imei: string
    model: string
    createdAt: string
    updatedAt: string
    deletedAt: string | null
  } | null
  driver: {
    id: number
    fullName: string
    phone: string
    licenseNumber: string
    createdAt: string
    updatedAt: string
    deletedAt: string | null
  } | null
}

export interface CreateCarDto {
  name: string
  carNumber: string
  deviceId?: number
  driverId?: number
}

export interface UpdateCarDto {
  name?: string
  carNumber?: string
  deviceId?: number
  driverId?: number
}

// Vehicle with last position (from API)
export interface VehicleWithPosition {
  carId: number
  name: string
  deviceImei: string
  deviceModel: string | null
  lat: number | null
  lng: number | null
  speed: number | null
  angle: number | null
  ignition: boolean | null
  movement: boolean | null
  recordedAt: string | null
}

// Vehicle types (extended for UI with realtime data)
export interface Vehicle extends Car {
  status: 'online' | 'offline' | 'moving' | 'stopped' | 'idle'
  position?: VehiclePosition
}

export interface VehiclePosition {
  latitude: number
  longitude: number
  speed: number
  course: number
  altitude?: number
  address?: string
  timestamp: string
}

// History position type
export interface HistoryPosition {
  id: number
  carId: number
  carName: string
  latitude: number
  longitude: number
  speed: number
  angle: number
  satellites: number
  ignition: boolean
  bytesReceived?: number
  distanceFromPrev?: number
  rawIo?: Record<string, number>
  recordedAt: string
  createdAt: string
  device: {
    id: number
    imei: string
    model: string
  } | null
  driver: {
    id: number
    fullName: string
    phone: string
  } | null
}

// Route point type (for route line on map)
export interface RoutePoint {
  lat: number
  lng: number
  speed: number
  angle: number
  recordedAt: string
}

// API Response types
export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}
