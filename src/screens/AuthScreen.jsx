import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  const verifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    setLoading(false)
    if (error) setError('Wrong code, try again.')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-7xl mb-3">👶</div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>JohnnyTracker</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>Baby tracker for the whole family</p>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
                Your email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-4 py-4 rounded-2xl text-base outline-none transition-all"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '2px solid transparent',
                }}
                onFocus={e => e.target.style.borderColor = '#a8d8b9'}
                onBlur={e => e.target.style.borderColor = 'transparent'}
              />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-4 rounded-2xl text-base font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                We sent a 6-digit code to
              </p>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>{email}</p>
            </div>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              autoFocus
              inputMode="numeric"
              className="w-full px-4 py-4 rounded-2xl text-center text-2xl font-bold tracking-[0.5em] outline-none"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                border: '2px solid #a8d8b9',
              }}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full py-4 rounded-2xl text-base font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              className="text-sm text-center"
              style={{ color: 'var(--color-muted)' }}
            >
              Change email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
