import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../api/types'
import { authService } from '../api/auth.service'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (userData: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /** Restores a previously stored authentication session at application startup. */
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  /** Authenticates through the public API and persists the mapped user session. */
  const login = async (email: string, password: string) => {
    const response = await authService.login({
      email: email.trim().toLowerCase(),
      password,
    })

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed. Please try again.')
    }

    const mappedUser: User = {
      user_id: response.data.user.id,
      full_name: response.data.user.fullName,
      email: response.data.user.email,
      username: '',
      total_balance: 0,
    }

    localStorage.setItem('token', response.data.accessToken)
    localStorage.setItem('user', JSON.stringify(mappedUser))
    setUser(mappedUser)
  }

  /** Clears the authentication state for the current browser session. */
  const logout = () => {
    authService.logout()
    setUser(null)
  }

  /** Replaces the in-memory user and keeps the persisted user in sync. */
  const updateUser = (userData: User) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
