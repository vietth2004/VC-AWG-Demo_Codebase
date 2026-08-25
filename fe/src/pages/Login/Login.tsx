import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../api/auth.service'
import { User } from '../../api/types'
import checkIcon from '../../assets/login/check.svg'
import divider from '../../assets/login/divider.svg'
import eyeIcon from '../../assets/login/eye.svg'
import googleBlue from '../../assets/login/google-blue.svg'
import googleGreen from '../../assets/login/google-green.svg'
import googleRed from '../../assets/login/google-red.svg'
import googleYellow from '../../assets/login/google-yellow.svg'
import { useAuth } from '../../context/AuthContext'

type FormValues = {
  email: string
  password: string
}

type FieldErrors = Partial<Record<keyof FormValues, string>>

const emailPattern = /^\S+@\S+\.\S+$/

/** Renders the Figma-defined public login form and authentication flow. */
const LoginForm: React.FC = () => {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [formData, setFormData] = useState<FormValues>({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [keepSignedIn, setKeepSignedIn] = useState(true)

  /** Updates a form field and clears its stale validation state. */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setFormData((currentFormData) => ({ ...currentFormData, [name]: value }))
    setFieldErrors((currentErrors) => ({ ...currentErrors, [name]: undefined }))
    setApiError('')
  }

  /** Applies the client-side portions of BR-LOG-01 and BR-LOG-02. */
  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    const email = formData.email.normalize('NFC').trim().toLowerCase()

    if (!email) {
      errors.email = 'Email address is required.'
    } else if (!emailPattern.test(email)) {
      errors.email = 'Enter a valid email address.'
    }

    if (!formData.password) {
      errors.password = 'Password is required.'
    }

    return errors
  }

  /** Submits a normalized public login request and establishes its returned session. */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

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
      const response = await authService.login({
        email: formData.email.normalize('NFC').trim().toLowerCase(),
        password: formData.password,
      })

      if (!response.success || !response.data) {
        setApiError(response.message || 'Login failed. Please try again.')
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
          ? message[0] ?? 'Login failed. Please try again.'
          : message ?? 'Login failed. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f5f7] px-5 pb-12 pt-10 font-['Inter'] text-[#191d23] sm:pt-20 lg:pt-[160px]">
      <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-10">
        <div className="flex w-full flex-col items-center gap-16">
          <p className="font-['Poppins'] text-[40px] leading-8 tracking-[3.2px] text-[#299d91]">
            <span className="font-extrabold">FINE</span>
            <span className="font-medium">bank.</span>
            <span className="font-extrabold">IO</span>
          </p>

          <div className="flex w-full flex-col items-center gap-6">
            <form noValidate className="flex w-full flex-col gap-8" onSubmit={handleSubmit}>
              {apiError && (
                <div role="alert" className="rounded-[4px] border border-[#e73d1c] bg-[#fff1ee] px-4 py-3 text-sm text-[#e73d1c]">
                  {apiError}
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-base font-medium leading-6">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={formData.email}
                    onChange={handleChange}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`h-12 w-full rounded-lg border bg-transparent px-4 text-base leading-6 text-[#4b5768] outline-none transition placeholder:text-[#999da3] focus:border-[#4b5768] ${fieldErrors.email ? 'border-[#e73d1c]' : 'border-[#4b5768]'}`}
                  />
                  {fieldErrors.email && <p id="email-error" className="text-sm text-[#e73d1c]">{fieldErrors.email}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-base font-medium leading-6">
                      Password
                    </label>
                    <a href="#forgot-password" className="text-right text-xs font-medium leading-4 text-[#299d91]">
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={isPasswordVisible ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      className={`h-12 w-full rounded-lg border bg-transparent py-3 pl-4 pr-12 text-base leading-6 text-[#4b5768] outline-none transition placeholder:text-[#999da3] focus:border-[#4b5768] ${fieldErrors.password ? 'border-[#e73d1c]' : 'border-[#d0d5dd]'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((visible) => !visible)}
                      className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                      aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    >
                      <img src={eyeIcon} alt="" className="h-6 w-6" />
                    </button>
                  </div>
                  {fieldErrors.password && <p id="password-error" className="text-sm text-[#e73d1c]">{fieldErrors.password}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <label className="flex cursor-pointer items-center gap-4">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(event) => setKeepSignedIn(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="flex h-5 w-5 items-center justify-center rounded-[2px] border border-[#d0d5dd] peer-checked:border-[#299d91] peer-checked:bg-[#299d91]">
                    {keepSignedIn && <img src={checkIcon} alt="" className="h-5 w-5" />}
                  </span>
                  <span className="text-base font-light leading-6">Keep me signed in</span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-[4px] bg-[#299d91] px-3 py-3 text-base font-semibold leading-6 text-white transition hover:bg-[#258d82] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>

            <div className="relative flex h-9 w-full items-center justify-center">
              <img src={divider} alt="" className="absolute h-px w-[342px] max-w-full" />
              <span className="relative bg-[#f4f5f7] px-2 py-2 text-center text-sm leading-5 text-[#999da3]">or sign in with</span>
            </div>

            <button type="button" className="flex h-12 w-full items-center justify-center gap-4 rounded-[4px] bg-[#e4e7eb] px-[69px] py-3 text-base leading-6 text-[#4b5768]">
              <span className="relative h-6 w-6 shrink-0" aria-hidden="true">
                <img src={googleBlue} alt="" className="absolute inset-0 h-6 w-6" />
                <img src={googleGreen} alt="" className="absolute inset-0 h-6 w-6" />
                <img src={googleYellow} alt="" className="absolute inset-0 h-6 w-6" />
                <img src={googleRed} alt="" className="absolute inset-0 h-6 w-6" />
              </span>
              <span className="whitespace-nowrap">Continue with Google</span>
            </button>
          </div>
        </div>

        <Link to="/register" className="h-6 text-center text-base font-semibold leading-6 text-[#299d91]">
          Create an account
        </Link>
      </div>
    </main>
  )
}

export default LoginForm
