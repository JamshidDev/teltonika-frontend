import api from './axios'
import type { Car, CreateCarDto, UpdateCarDto, PaginatedResponse, VehicleWithPosition, HistoryPosition, RoutePoint, StopEvent, EngineEvent, RouteWithEventsResponse, RawPositionsResponse } from '@/types'

export interface CarsQueryParams {
  page?: number
  pageSize?: number
}

export interface LastPositionsParams {
  page?: number
  pageSize?: number
}

export interface HistoryPositionsParams {
  carId?: number
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface HistoryRouteParams {
  carId: number
  from: string
  to: string
}

export interface StopEventsParams {
  page?: number
  pageSize?: number
  carId?: number
  date?: string
}

export interface EngineEventsParams {
  page?: number
  pageSize?: number
  carId?: number
  date?: string
}

export interface RouteWithEventsParams {
  carId: number
  from: string
  to: string
}

// Cars API endpoints
export const carsApi = {
  // Get all cars with pagination
  async getAll(params?: CarsQueryParams): Promise<PaginatedResponse<Car>> {
    const response = await api.get<PaginatedResponse<Car>>('/car', { params })
    return response.data
  },

  // Get single car by ID
  async getById(id: number): Promise<Car> {
    const response = await api.get<Car>(`/car/${id}`)
    return response.data
  },

  // Create new car
  async create(data: CreateCarDto): Promise<Car> {
    const response = await api.post<Car>('/car', data)
    return response.data
  },

  // Update car
  async update(id: number, data: UpdateCarDto): Promise<Car> {
    const response = await api.put<Car>(`/car/${id}`, data)
    return response.data
  },

  // Delete car
  async delete(id: number): Promise<void> {
    await api.delete(`/car/${id}`)
  },

  // Get cars with last positions
  async getLastPositions(params?: LastPositionsParams): Promise<PaginatedResponse<VehicleWithPosition>> {
    const response = await api.get<PaginatedResponse<VehicleWithPosition>>('/car/last-positions', { params })
    return response.data
  },

  // Get history positions for a car
  async getHistoryPositions(params: HistoryPositionsParams): Promise<PaginatedResponse<HistoryPosition>> {
    const response = await api.get<PaginatedResponse<HistoryPosition>>('/history/positions', { params })
    return response.data
  },

  // Get route points for drawing on map
  async getHistoryRoute(params: HistoryRouteParams): Promise<RoutePoint[]> {
    const response = await api.get<RoutePoint[]>('/history/route', { params })
    return response.data
  },

  // Get stop events (parking/stops)
  async getStopEvents(params?: StopEventsParams): Promise<PaginatedResponse<StopEvent>> {
    const response = await api.get<PaginatedResponse<StopEvent>>('/stop-events', { params })
    return response.data
  },

  // Get engine events (on/off)
  async getEngineEvents(params?: EngineEventsParams): Promise<PaginatedResponse<EngineEvent>> {
    const response = await api.get<PaginatedResponse<EngineEvent>>('/engine-events', { params })
    return response.data
  },

  // Get route with events (timeline)
  async getRouteWithEvents(params: RouteWithEventsParams): Promise<RouteWithEventsResponse> {
    const response = await api.get<RouteWithEventsResponse>('/history/route-with-events', { params })
    return response.data
  },

  // Get raw positions for analysis (hourly grouped)
  async getRawPositions(params: HistoryRouteParams): Promise<RawPositionsResponse> {
    const tzOffset = -new Date().getTimezoneOffset() // UTC+5 = 300
    const response = await api.get<RawPositionsResponse>('/history/raw-positions', {
      params: { ...params, tzOffset },
    })
    return response.data
  },
}
