import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { loginRequest } from '../lib/authApi'
import api from '../lib/api'
import { clearSession, getToken, setSession } from '../lib/authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const qc = useQueryClient()
  const [token, setToken] = useState(getToken)
  const [identity, setIdentity] = useState(null)
  const [isHydrating, setIsHydrating] = useState(Boolean(getToken()))
  const [identityError, setIdentityError] = useState(null)

  useEffect(() => {
    if (!token) return
    let active = true
    api.get('/auth/me').then(({ data }) => {
      if (active) {
        setIdentity(data)
        setIdentityError(null)
        setSession({ username: data.username, roleName: data.roleName, linkedStudentId: null })
      }
    }).catch((error) => {
      if (!active) return
      setIdentityError(error)
      if (error.response?.status === 401) {
        clearSession()
        setToken(null)
        setIdentity(null)
        setIsHydrating(false)
        qc.clear()
      }
    }).finally(() => { if (active) setIsHydrating(false) })
    return () => { active = false }
  }, [token, qc])

  const login = useCallback(async (credentials) => {
    const data = await loginRequest(credentials)
    if (!data?.token) throw new Error('Login response did not include a token')
    qc.clear()
    clearSession()
    setSession({ token: data.token, username: data.username, roleName: data.roleName })
    setIdentity(data)
    setIdentityError(null)
    setIsHydrating(false)
    setToken(data.token)
    return data
  }, [qc])

  const logout = useCallback(() => {
    clearSession()
    qc.clear()
    setToken(null)
    setIdentity(null)
    setIdentityError(null)
    setIsHydrating(false)
  }, [qc])

  const value = useMemo(() => ({
    token, username: identity?.username, roleName: identity?.roleName,
    studentId: identity?.studentId ?? null, isAuthenticated: Boolean(token),
    isHydrating, identityError, login, logout,
  }), [token, identity, isHydrating, identityError, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
