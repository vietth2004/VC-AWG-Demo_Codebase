import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService, RegisterRequest } from '../../api/auth.service'
import { User } from '../../api/types'
import Button from '../../components/Button/Button'
import Error from '../../components/Error/Error'
import { useAuth } from '../../context/AuthContext'

type FormValues = RegisterRequest
type FieldErrors = Partial<Record<keyof FormValues, string>>

const passwordAllowedCharacters = /^[A-Za-z0-9!@#$%^&*(){}_=+\[\],./<>?\\|:;\-]+$/
const passwordSpecialCharacter = /[!@#$%^&*(){}\-_+=\[\],./<>?\\|:;]/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  endAdornment?: React.ReactNode
}

/** Renders a compact signup field matching the registration design. */
const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  endAdornment,
  className = '',
  id,
  ...props
}) => {
  const fieldId = id ?? props.name

  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block text-base font-medium text-[#191b22]">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          className={`h-12 w-full rounded-lg border bg-transparent px-4 text-base text-[#526075] outline-none transition placeholder:text-[#a0a8b5] focus:border-[#526075] focus:ring-1 focus:ring-[#526075] ${
            endAdornment ? 'pr-12' : ''
          } ${error ? 'border-red-500' : 'border-[#cfd5df]'} ${className}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

/** Collects and submits the public account-registration payload. */
const SignUpForm: React.FC = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  /** Updates one form value and clears only its stale validation message. */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setFieldErrors((currentErrors) => ({
      ...currentErrors,
      [e.target.name]: undefined,
    }))
    setApiError('')
  }

  /** Applies client-side variants of all UC-01 registration validation rules. */
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const fullName = formData.fullName.normalize('NFC').trim()
    const email = formData.email.trim().toLowerCase()

    if (!fullName) {
      errors.fullName = 'Full name is required.'
    } else if (fullName.length < 4 || fullName.length > 25) {
      errors.fullName = 'Full name must be between 4 and 25 characters.'
    } else if (!/^[\p{L}]+(?: [\p{L}]+)*$/u.test(fullName)) {
      errors.fullName = 'Use letters separated by single spaces only.'
    }

    if (!email) {
      errors.email = 'Email address is required.'
    } else if (email.length > 255 || !emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      errors.password = 'Password is required.'
    } else if (formData.password.length < 8 || formData.password.length > 64) {
      errors.password = 'Password must be between 8 and 64 characters.'
    } else if (/\s/.test(formData.password)) {
      errors.password = 'Password must not contain whitespace.'
    } else if (!/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      errors.password = 'Use uppercase, lowercase, and a number.'
    } else if (!passwordSpecialCharacter.test(formData.password)) {
      errors.password = 'Include at least one special character.'
    } else if (!passwordAllowedCharacters.test(formData.password)) {
      errors.password = 'Password contains unsupported characters.'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    return errors
  }

  /** Submits a normalized registration request and establishes the returned session. */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) {
      return
    }

    setApiError('')
    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)

    try {
      const registerData: RegisterRequest = {
        ...formData,
        fullName: formData.fullName.normalize('NFC').trim(),
        email: formData.email.trim().toLowerCase(),
      }
      const response = await authService.register(registerData)

      if (!response.success || !response.data) {
        setApiError(response.message || 'Registration failed. Please try again.')
        return
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
      updateUser(mappedUser)
      navigate('/')
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string | string[] } } })
        .response?.data?.message
      setApiError(
        Array.isArray(message)
          ? message[0] ?? 'Registration failed. Please try again.'
          : message ?? 'Registration failed. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-5 pb-12 pt-[104px] text-[#191b22]">
      <div className="mx-auto w-full max-w-[400px]">
        <p className="text-center text-[40px] font-semibold leading-none tracking-[-0.04em] text-[#2fa69d]">
          FINEbank.io
        </p>
        <h1 className="mt-8 text-center text-[26px] font-bold leading-none tracking-[-0.03em]">
          Create an account
        </h1>

        {apiError && <div className="mt-6"><Error message={apiError} /></div>}

        <form noValidate onSubmit={handleSubmit} className="mt-10 space-y-6">
          <FormField
            label="Name"
            name="fullName"
            type="text"
            autoComplete="name"
            value={formData.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            placeholder="Tanzir Rahman"
            autoFocus
          />

          <FormField
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={fieldErrors.email}
            placeholder="hello@example.com"
          />

          <FormField
            label="Password"
            name="password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="Enter your password"
            endAdornment={
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#9ba4b2]"
                onClick={() => setIsPasswordVisible((visible) => !visible)}
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </button>
            }
          />

          <FormField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            placeholder="Confirm your password"
          />

          <p className="pt-1 text-sm leading-5 text-[#667085]">
            By continuing, you agree to our{' '}
            <a href="/terms-of-service" className="text-[#169e95] hover:underline">
              terms of service.
            </a>
          </p>

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="h-12 w-full !rounded-[3px] !bg-[#2fa69d] text-base hover:!bg-[#258f87] focus:!ring-[#2fa69d]"
          >
            Sign up
          </Button>
        </form>

        <div className="my-10 flex items-center gap-4 text-sm text-[#a0a8b5]">
          <span className="h-px flex-1 bg-[#d9dee7]" />
          <span>or sign up with</span>
          <span className="h-px flex-1 bg-[#d9dee7]" />
        </div>

        <button
          type="button"
          className="flex h-12 w-full items-center justify-center gap-4 rounded-[3px] bg-[#e5e9ef] text-base text-[#526075]"
          aria-label="Continue with Google"
        >
          <span className="text-2xl font-bold text-[#4285f4]" aria-hidden="true">G</span>
          Continue with Google
        </button>

        <p className="mt-11 text-center text-base text-[#a0a8b5]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[#169e95] hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </main>
  )
}

export default SignUpForm
