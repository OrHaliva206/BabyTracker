import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function StatCard({ icon, title, value, subtitle }) {
  return (
    <div className="flex-1 rounded-2xl p-4" style={{ background: 'var(--color-surface)' }}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
        {title}
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
      {subtitle && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{subtitle}</div>}
    </div>
  )
}

function EntryRow({ entry }) {
  const isBottle = entry.type === 'bottle'
  const icon = isBottle ? '🍼'
    : entry.diaper_type === 'poop' ? '💩'
    : entry.diaper_type === 'pee' ? '💧' : '💛'
  const label = isBottle ? `${entry.bottle_ml} ml`
    : entry.diaper_type === 'poop' ? 'Poop'
    : entry.diaper_type === 'pee' ? 'Pee' : 'Both'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--color-surface)' }}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{label}</div>
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>by {entry.logged_by_name || 'Unknown'}</div>
      </div>
      <div className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
        {formatTime(entry.created_at)}
      </div>
    </div>
  )
}

export default function SummaryScreen() {
  const { profile, entries: todayEntries } = useApp()
  const [offset, setOffset] = useState(0) // 0 = today, 1 = yesterday, etc.
  const [dayEntries, setDayEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const selectedDate = new Date()
  selectedDate.setDate(selectedDate.getDate() - offset)
  selectedDate.setHours(0, 0, 0, 0)

  useEffect(() => {
    if (offset === 0) {
      setDayEntries(todayEntries)
      return
    }
    fetchDay()
  }, [offset, todayEntries])

  const fetchDay = async () => {
    if (!profile?.family_id) return
    setLoading(true)
    const start = new Date(selectedDate)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 1)

    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('family_id', profile.family_id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setDayEntries(data || [])
    setLoading(false)
  }

  const bottles = dayEntries.filter(e => e.type === 'bottle')
  const diapers = dayEntries.filter(e => e.type === 'diaper')
  const totalMl = bottles.reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const poopCount = diapers.filter(e => e.diaper_type === 'poop' || e.diaper_type === 'both').length
  const peeCount = diapers.filter(e => e.diaper_type === 'pee' || e.diaper_type === 'both').length

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Header with date nav */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-4">
        <button
          onClick={() => setOffset(o => o + 1)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {formatDateLabel(selectedDate)}
          </h2>
          {offset > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
        <button
          onClick={() => setOffset(o => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold disabled:opacity-30"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          ›
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>Loading…</div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="flex gap-3 mb-3">
              <StatCard icon="🍼" title="Feeds" value={bottles.length} subtitle={`${totalMl} ml total`} />
              <StatCard icon="🧷" title="Diapers" value={diapers.length} subtitle={`💩 ${poopCount} · 💧 ${peeCount}`} />
            </div>

            {/* Per-bottle avg */}
            {bottles.length > 0 && (
              <div className="mb-4 px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--color-surface)' }}>
                <span style={{ color: 'var(--color-muted)' }}>Avg per feed: </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {Math.round(totalMl / bottles.length)} ml
                </span>
              </div>
            )}

            {/* Timeline */}
            {dayEntries.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
                <div className="text-4xl mb-3">💤</div>
                <p>Nothing logged for this day</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1"
                   style={{ color: 'var(--color-muted)' }}>
                  Timeline
                </p>
                {dayEntries.map(entry => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
