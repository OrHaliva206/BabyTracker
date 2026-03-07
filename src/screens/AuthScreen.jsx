import { useState } from 'react'
import { supabase } from '../lib/supabase'

const APP_PASSWORD = 'John1601'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== APP_PASSWORD) {
      setError('Wrong password.')
      return
    }

    setLoading(true)
    // Try sign in first, if no account yet — sign up
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-7xl mb-3">👶</div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>JohnnyTracker</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>Baby tracker for the whole family</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Your email"
            required
            autoFocus
            className="w-full px-4 py-4 rounded-2xl text-base outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-4 rounded-2xl text-base outline-none"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
            style={{ background: '#a8d8b9', color: '#1a2e22' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
