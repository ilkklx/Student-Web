import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { loginRequest, registerRequest } from '../lib/authApi'
import {
  clearSession,
  getStoredRole,
  getStoredUsername,
  getToken,
  setSession,
} from '../lib/authStorage'

const AuthContext = createContext(null)

function parseRegisterMessage(data) {
  if (data == null) return 'Registered.'
  if (typeof data === 'string') return data
  if (typeof data === 'object' && 'message' in data) return String(data.message)
  return 'User registered successfully'
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getToken)
  const [username, setUsername] = useState(getStoredUsername)
  const [roleName, setRoleName] = useState(getStoredRole)

  const isAuthenticated = Boolean(token)

  const login = useCallback(async ({ username: u, password }) => {
    const data = await loginRequest({ username: u, password })
    const nextToken = data?.token
    const nextRole = data?.roleName
    if (!nextToken) {
      throw new Error('Login response did not include a token.')
    }
    if (!nextRole) {
      console.warn('Login response did not include roleName; role-based features may not work.')
    }
    setSession({ token: nextToken, username: u, roleName: nextRole })
    setToken(nextToken)
    setUsername(u)
    setRoleName(nextRole)
    return data
  }, [])

  const register = useCallback(async ({ username: u, password, roleName: role }) => {
    const { data, status } = await registerRequest({ username: u, password }, role)
    if (status !== 200 && status !== 201) {
      const err = new Error('Registration failed')
      err.response = { status, data }
      throw err
    }
    setSession({ token: null, username: u, roleName: role })
    setToken(null)
    setUsername(u)
    setRoleName(role)
    return parseRegisterMessage(data)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUsername(null)
    setRoleName(null)
  }, [])

  const hydrateRole = useCallback((role) => {
    if (!role) return
    setSession({ roleName: role })
    setRoleName(role)
  }, [])

  const value = useMemo(
    () => ({
      token,
      username,
      roleName,
      isAuthenticated,
      login,
      register,
      logout,
      hydrateRole,
    }),
    [token, username, roleName, isAuthenticated, login, register, logout, hydrateRole],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
