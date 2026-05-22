import axios from 'axios'
import { clearSession, getToken } from './authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
      const path = window.location.pathname
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
