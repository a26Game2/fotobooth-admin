import axios from 'axios'
import { clearSession, getSession } from './auth'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000' })
api.interceptors.request.use((config) => {
  const session = getSession()
  if (config.url?.startsWith('/api/admin/')) {
    if (session?.apiKey) config.headers['x-api-key'] = session.apiKey
    if (session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  if (config.url === '/api/auth/me' && session?.accessToken) config.headers.Authorization = `Bearer ${session.accessToken}`
  return config
})

let logoutInProgress = false
api.interceptors.response.use(
  response => response,
  error => {
    const url = error.config?.url as string | undefined
    const isProtectedRequest = url?.startsWith('/api/admin/') || url === '/api/auth/me'
    if (error.response?.status === 401 && isProtectedRequest && !logoutInProgress) {
      logoutInProgress = true
      clearSession()
      window.location.replace('/login?expired=1')
    }
    return Promise.reject(error)
  }
)

export function apiMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Phiên đăng nhập hoặc API key không hợp lệ. Vui lòng đăng nhập lại.'
    return error.response?.data?.message || error.response?.data?.error || 'Không thể kết nối tới máy chủ. Vui lòng thử lại.'
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}

export const adminApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
  validateKey: () => api.get('/api/admin/booking-requests', { params: { page: 1, limit: 1 } }),
  bookings: (params?: Record<string, unknown>) => api.get('/api/admin/booking-requests', { params }),
  booking: (id: string) => api.get(`/api/admin/booking-requests/${id}`),
  updateBooking: (id: string, data: unknown) => api.patch(`/api/admin/booking-requests/${id}`, data),
  updateBookingStatus: (id: string, status: string) => api.patch(`/api/admin/booking-requests/${id}/status`, { status }),
  addNote: (id: string, note: string) => api.post(`/api/admin/booking-requests/${id}/notes`, { note, createdBy: 'Admin' }),
  services: () => api.get('/api/admin/services'),
  createService: (data: unknown) => api.post('/api/admin/services', data),
  updateService: (id: string, data: unknown) => api.patch(`/api/admin/services/${id}`, data),
  uploadServiceCover: (id: string, file: File) => { const body = new FormData(); body.append('cover', file); return api.post(`/api/admin/services/${id}/cover`, body) },
  deleteServiceCover: (id: string) => api.delete(`/api/admin/services/${id}/cover`),
  createServicePackage: (data: unknown) => api.post('/api/admin/service-packages', data),
  updateServicePackage: (id: string, data: unknown) => api.patch(`/api/admin/service-packages/${id}`, data),
  deleteServicePackage: (id: string) => api.delete(`/api/admin/service-packages/${id}`),
  updateAddonPricing: (id: string, data: unknown) => api.put(`/api/admin/services/${id}/addon-pricing`, data),
  updateServiceAddons: (id: string, addonServiceIds: string[]) => api.put(`/api/admin/services/${id}/addons`, { addonServiceIds }),
  optionGroups: () => api.get('/api/admin/service-option-groups'),
  createGroup: (data: unknown) => api.post('/api/admin/service-option-groups', data),
  updateGroup: (id: string, data: unknown) => api.patch(`/api/admin/service-option-groups/${id}`, data),
  createOption: (data: unknown) => api.post('/api/admin/service-options', data),
  updateOption: (id: string, data: unknown) => api.patch(`/api/admin/service-options/${id}`, data),
  cities: () => api.get('/api/admin/cities'),
  createCity: (data: unknown) => api.post('/api/admin/cities', data),
  updateCity: (id: string, data: unknown) => api.patch(`/api/admin/cities/${id}`, data),
  pricing: () => api.get('/api/admin/service-city-pricing'),
  updatePricing: (data: unknown) => api.put('/api/admin/service-city-pricing', data),
  configuration: () => api.get('/api/admin/configuration'),
  updateConfiguration: (data: unknown) => api.put('/api/admin/configuration', data),
}
