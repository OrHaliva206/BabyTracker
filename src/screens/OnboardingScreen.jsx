import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export default function OnboardingScreen() {
  const { session, refreshProfile } = useApp()
  const [step, setStep] = useState('name') // 'name' | 'family'
  const [displayName, setDisplayName] = useState('')
  const [mode, setMode] = useState('') // 'create' | 'join'
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const saveName = (e) => {
    e.preventDefault()
    if (displayName.trim()) setStep('family')
  }

  const createFamily = async () => {
    setError('')
    setLoading(true)
    // Create family
    const { data: fam, error: famErr } = await supabase.from('families').insert({}).select().single()
    if (famErr) { setError(famErr.message); setLoading(false); return }

    // Create profile
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      family_id: fam.id,
      display_name: displayName.trim(),
    })
    if (profErr) { setError(profErr.message); setLoading(false); return }

    // Create default settings
    await supabase.from('family_settings').insert({ family_id: fam.id })

    refreshProfile()
    setLoading(false)
  }

  const joinFamily = async () => {
    setError('')
    setLoading(true)
    const code = inviteCode.trim().toUpperCase()

    const { data: fam, error: famErr } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', code)
      .maybeSingle()

    if (famErr || !fam) {
      setError('Family not found. Check the code and try again.')
      setLoading(false)
      return
    }

    const { error: profErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      family_id: fam.id,
      display_name: displayName.trim(),
    })
    if (profErr) { setError(profErr.message); setLoading(false); return }

    refreshProfile()
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">👋</div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            {step === 'name' ? 'What should we call you?' : 'Set up your family'}
          </h2>
        </div>

        {step === 'name' && (
          <form onSubmit={saveName} className="flex flex-col gap-4">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Mom / Dad / your name…"
              required
              autoFocus
              maxLength={20}
              className="w-full px-4 py-4 rounded-2xl text-base outline-none"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
            />
            <button
              type="submit"
              disabled={!displayName.trim()}
              className="w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              Continue
            </button>
          </form>
        )}

        {step === 'family' && !mode && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-5 rounded-2xl text-base font-semibold"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              Create a new family
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-5 rounded-2xl text-base font-semibold"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid var(--color-mint)' }}
            >
              Join with invite code
            </button>
            <button
              onClick={() => setStep('name')}
              className="text-sm text-center mt-2"
              style={{ color: 'var(--color-muted)' }}
            >
              ← Back
            </button>
          </div>
        )}

        {step === 'family' && mode === 'create' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              You'll get an invite code to share with your partner.
            </p>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={createFamily}
              disabled={loading}
              className="w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              {loading ? 'Creating…' : 'Create family'}
            </button>
            <button onClick={() => setMode('')} className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              ← Back
            </button>
          </div>
        )}

        {step === 'family' && mode === 'join' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              Ask your partner for the 6-letter invite code.
            </p>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-4 rounded-2xl text-center text-2xl font-bold tracking-[0.4em] outline-none"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={joinFamily}
              disabled={loading || inviteCode.length < 6}
              className="w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              {loading ? 'Joining…' : 'Join family'}
            </button>
            <button onClick={() => setMode('')} className="text-sm text-center" style={{ color: 'var(--color-muted)' }}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
