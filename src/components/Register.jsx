import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'

export default function Register() {
    const navigate = useNavigate()
    const birthdayRef = useRef(null)
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        birthday: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        // Validation
        if (!formData.username || !formData.email || !formData.birthday || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields')
            setIsLoading(false)
            return
        }

        if (formData.username.trim().length < 3) {
            setError('Username must be at least 3 characters long')
            setIsLoading(false)
            return
        }

        const usernameRegex = /^[a-zA-Z0-9_]+$/
        if (!usernameRegex.test(formData.username)) {
            setError('Username can only contain letters, numbers, and underscores')
            setIsLoading(false)
            return
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address')
            setIsLoading(false)
            return
        }

        // Basic birthday validation - must be a real date and user should be reasonably old
        const birthDate = new Date(formData.birthday)
        const today = new Date()
        if (isNaN(birthDate.getTime()) || birthDate > today) {
            setError('Please enter a valid birthday')
            setIsLoading(false)
            return
        }

        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        if (age < 13) {
            setError('You must be at least 13 years old to register')
            setIsLoading(false)
            return
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long')
            setIsLoading(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        if (!formData.agreeTerms) {
            setError('You must agree to the terms and conditions')
            setIsLoading(false)
            return
        }

        // Call API to register
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    birthday: formData.birthday,
                    password: formData.password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Registration failed')
                return
            }

            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify({
                id: data.user.id,
                username: data.user.username,
                email: data.user.email
            }))
            setSuccess(true)
            // Redirect to home page after successful registration
            setTimeout(() => {
                navigate('/home')
            }, 500)
        } catch (err) {
            setError('Registration failed. Please check if the server is running.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="register-container">
            <div className="register-card">
                <div className="register-header">
                    <h1>Create Account</h1>
                    <p>Join us today</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">Account created successfully! 🎉</div>}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            placeholder="Choose a username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="your@email.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="birthday">Birthday</label>
                        <div className="input-with-icon">
                            <svg
                                className="input-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                role="button"
                                aria-label="Open calendar"
                                tabIndex={isLoading ? -1 : 0}
                                onClick={() => {
                                    if (isLoading) return
                                    const el = birthdayRef.current
                                    if (!el) return
                                    if (typeof el.showPicker === 'function') {
                                        try {
                                            el.showPicker()
                                        } catch {
                                            el.focus()
                                        }
                                    } else {
                                        el.focus()
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        e.currentTarget.click()
                                    }
                                }}
                            >
                                <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M8 3V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <path d="M16 3V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                                <circle cx="8" cy="13.5" r="1.1" fill="currentColor" />
                                <circle cx="12" cy="13.5" r="1.1" fill="currentColor" />
                                <circle cx="16" cy="13.5" r="1.1" fill="currentColor" />
                                <circle cx="8" cy="17" r="1.1" fill="currentColor" />
                                <circle cx="12" cy="17" r="1.1" fill="currentColor" />
                            </svg>
                            <input
                                id="birthday"
                                ref={birthdayRef}
                                type="date"
                                name="birthday"
                                value={formData.birthday}
                                onChange={handleChange}
                                disabled={isLoading}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="At least 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div className="form-options">
                        <label className="checkbox">
                            <input
                                type="checkbox"
                                name="agreeTerms"
                                checked={formData.agreeTerms}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                            <span>I agree to the terms and conditions</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="register-button"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="register-footer">
                    <p>Already have an account? <button className="link-btn" onClick={() => navigate('/login')} disabled={isLoading}>Sign in here</button></p>
                </div>
            </div>
        </div>
    )
}