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
  carNumber: string | null
  deviceImei?: string
  deviceModel?: string | null
  lat: number | null
  lng: number | null
  speed: number | null
  angle: number | null
  ignition?: boolean | null
  movement?: boolean | null
  recordedAt: string | null
  status: MotionStatus | null
  statusSince: string | null
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
  carNumber: string | null
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

export interface RawPositionPoint {
  lat: number
  lng: number
  speed: number
  angle: number
  ignition: boolean
  satellites: number
  recordedAt: string
  createdAt: string
}

export interface HourlyGroup {
  hour: number
  label: string
  count: number
  points: RawPositionPoint[]
}

export interface RawPositionsResponse {
  carId: number
  from: string
  to: string
  totalPoints: number
  hourly: HourlyGroup[]
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

// Stop Event types
export interface StopEvent {
  id: number
  carId: number
  carName: string
  carNumber: string | null
  type: 'parking' | 'stop' | 'PARKING' | 'STOP'
  startAt: string
  endAt: string | null
  durationSeconds: number | null
  latitude: number
  longitude: number
}

// Engine Event types
export interface EngineEvent {
  id: number
  carId: number
  carName: string
  carNumber: string | null
  eventType: 'on' | 'off'
  eventAt: string
  latitude: number
  longitude: number
}

// Socket.IO Event types
export type MotionStatus = 'moving' | 'stop_candidate' | 'stopped' | 'parking_candidate' | 'parking'

export interface CarLocationEvent {
  carId: number
  lat: number
  lng: number
  speed: number | null
  angle: number | null
  ignition: boolean | null
  movement: boolean | null
}

export interface CarMotionEvent {
  carId: number
  carName: string
  carNumber: string | null
  status: MotionStatus
  since: string
  lat: number
  lng: number
}

// Route with events types
export interface RouteWithEventsResponse {
  carId: number
  date: string
  totalEvents: number
  totalRoutePoints: number
  timeline: TimelineItem[]
}

export type TimelineItem = TimelineStop | TimelineParking | TimelineRoute

export interface TimelineStop {
  type: 'stop'
  lat: number
  lng: number
  startAt: string
  endAt: string | null
  duration: number | null
}

export interface TimelineParking {
  type: 'parking'
  lat: number
  lng: number
  startAt: string
  endAt: string | null
  duration: number | null
}

export interface TimelineRoute {
  type: 'route'
  points: TimelineRoutePoint[]
}

export interface TimelineRoutePoint {
  lat: number
  lng: number
  speed: number
  angle: number
  recordedAt: string
}
