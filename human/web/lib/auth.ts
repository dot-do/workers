'use client'

import { WorkOS } from '@workos-inc/node'

// Initialize WorkOS (server-side)
export function getWorkOS() {
  if (typeof window !== 'undefined') {
    throw new Error('WorkOS should only be initialized on the server')
  }

  const apiKey = process.env.WORKOS_API_KEY
  const clientId = process.env.WORKOS_CLIENT_ID

  if (!apiKey || !clientId) {
    throw new Error('WorkOS credentials not configured')
  }

  return new WorkOS(apiKey)
}

// Client-side auth utilities
export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role?: string
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export function setUser(user: User) {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
}

// Auth context hook
export function useAuth() {
  const token = getAuthToken()
  const user = getUser()

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    setAuthToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearAuthToken()
    window.location.href = '/login'
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
  }
}
