import axiosInstance from './axiosInstance'
import { ApiResponse, User } from './types'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: {
    id: number
    fullName: string
    email: string
  }
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export interface RegisterResponse {
  accessToken: string
  user: {
    id: number
    fullName: string
    email: string
  }
}

export const authService = {
  /** Authenticates a public email/password login request. */
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await axiosInstance.post('/auth/login', data)
    return response.data
  },

  /** Registers a public account request. */
  register: async (data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
    const response = await axiosInstance.post('/auth/register', data)
    return response.data
  },

  /** Clears persisted client-side authentication data. */
  logout: (): void => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /** Retrieves the currently authenticated user. */
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await axiosInstance.get('/auth/me')
    return response.data
  },
}
