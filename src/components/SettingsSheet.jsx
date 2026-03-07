import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export default function SettingsSheet({ onClose }) {
  const { profile, family, settings, darkMode, setDarkMode, updateSettings, refreshProfile } = useApp()
  const [bottleSizes, setBottleSizes] = useState(settings?.bottle_sizes || [30, 60, 90])
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (settings?.bottle_sizes) setBottleSizes(settings.bottle_sizes)
  }, [settings])

  const saveBottleSizes = async () => {
    setSaving(true)
    await updateSettings(bottleSizes)
    setSaving(false)
  }

  const saveName = async () => {
    if (!displayName.trim() || displayName === profile?.display_name) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', profile.id)
    refreshProfile()
    setSaving(false)
  }

  const copyInviteCode = async () => {
    if (!family?.invite_code) return
    await navigator.clipboard.writeText(family.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareInviteCode = () => {
    if (!family?.invite_code) return
    if (navigator.share) {
      navigator.share({
        title: 'Join JohnnyTracker',
        text: `Join our baby tracker with code: ${family.invite_code}`,
      })
    } else {
      copyInviteCode()
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl px-5 py-6"
        style={{ background: 'var(--color-surface)', maxHeight: '85vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="w-12 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--color-muted)', opacity: 0.3 }} />

        <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--color-text)' }}>Settings</h3>

        {/* Dark mode */}
        <div className="flex items-center justify-between mb-6 py-3 px-4 rounded-2xl"
             style={{ background: 'var(--color-bg)' }}>
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>🌙 Dark mode</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-12 h-7 rounded-full transition-colors relative"
            style={{ background: darkMode ? '#a8d8b9' : '#d1d5db' }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full transition-transform"
              style={{
                background: 'white',
                transform: darkMode ? 'translateX(20px)' : 'translateX(2px)',
                left: 0,
              }}
            />
          </button>
        </div>

        {/* Bottle sizes */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-muted)' }}>🍼 Bottle sizes (ml)</p>
          <div className="grid grid-cols-3 gap-3">
            {bottleSizes.map((size, i) => (
              <input
                key={i}
                type="number"
                value={size}
                min={10}
                max={500}
                onChange={e => {
                  const next = [...bottleSizes]
                  next[i] = Number(e.target.value)
                  setBottleSizes(next)
                }}
                onBlur={saveBottleSizes}
                className="w-full px-3 py-3 rounded-2xl text-center text-base font-bold outline-none"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
              />
            ))}
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--color-muted)' }}>
            {saving ? 'Saving…' : 'Tap outside to save'}
          </p>
        </div>

        {/* Display name */}
        <div className="mb-6">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-muted)' }}>👤 Your name</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={20}
              className="flex-1 px-4 py-3 rounded-2xl text-base outline-none"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
            />
            <button
              onClick={saveName}
              disabled={saving || displayName === profile?.display_name}
              className="px-4 py-3 rounded-2xl font-semibold text-sm disabled:opacity-40"
              style={{ background: '#a8d8b9', color: '#1a2e22' }}
            >
              Save
            </button>
          </div>
        </div>

        {/* Invite code */}
        {family?.invite_code && (
          <div className="mb-6 p-4 rounded-2xl" style={{ background: 'var(--color-bg)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-muted)' }}>👨‍👩‍👦 Invite your partner</p>
            <div className="text-3xl font-bold tracking-[0.3em] text-center mb-3"
                 style={{ color: 'var(--color-text)' }}>
              {family.invite_code}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyInviteCode}
                className="py-3 rounded-2xl text-sm font-semibold"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>
              <button
                onClick={shareInviteCode}
                className="py-3 rounded-2xl text-sm font-semibold"
                style={{ background: '#a8d8b9', color: '#1a2e22' }}
              >
                📤 Share
              </button>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ color: '#ef4444', background: 'var(--color-bg)' }}
        >
          Sign out
        </button>
      </div>
    </>
  )
}
