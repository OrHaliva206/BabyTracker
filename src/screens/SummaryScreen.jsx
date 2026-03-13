import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

const FAMILY_ID = 'f0000000-beef-0000-0000-000000000001'

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

function EntryRow({ entry, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const isBottle = entry.type === 'bottle' || entry.type === 'bottle_extra'
  const icon = isBottle ? '🍼'
    : entry.diaper_type === 'poop' ? '💩'
    : entry.diaper_type === 'pee' ? '💧' : '💛'
  const label = isBottle
    ? (entry.bottle_ml === 10 ? '+10 ml extra' : `${entry.bottle_ml} ml`)
    : entry.diaper_type === 'poop' ? 'Poop'
    : entry.diaper_type === 'pee' ? 'Pee' : 'Both'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--color-surface)' }}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{label}</div>
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>by {entry.logged_by_name || 'Unknown'}</div>
      </div>
      <div className="text-xs font-medium mr-2" style={{ color: 'var(--color-muted)' }}>
        {formatTime(entry.created_at)}
      </div>
      {confirming ? (
        <div className="flex gap-1">
          <button
            onClick={() => { onDelete(entry.id); setConfirming(false) }}
            className="px-2 py-1 rounded-xl text-xs font-bold"
            style={{ background: '#ef4444', color: 'white' }}
          >
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-2 py-1 rounded-xl text-xs"
            style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-7 h-7 flex items-center justify-center rounded-xl"
          style={{ background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: '16px' }}
        >
          🗑
        </button>
      )}
    </div>
  )
}

// Day row for weekly/monthly breakdown
function DayRow({ dayEntries, label }) {
  const bottles = dayEntries.filter(e => e.type === 'bottle')
  const totalMl = dayEntries
    .filter(e => e.type === 'bottle' || e.type === 'bottle_extra')
    .reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const diapers = dayEntries.filter(e => e.type === 'diaper')
  return (
    <div className="flex items-center px-4 py-3 rounded-2xl gap-3" style={{ background: 'var(--color-surface)' }}>
      <div className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</div>
      <div className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
        🍼 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{bottles.length}</span> feeds
      </div>
      <div className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{totalMl}</span> ml
      </div>
      <div className="text-xs text-center" style={{ color: 'var(--color-muted)' }}>
        🧷 <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{diapers.length}</span>
      </div>
    </div>
  )
}

const VIEW_LABELS = { day: 'Today', week: 'This Week', month: 'This Month' }
const VIEW_DAYS = { week: 7, month: 30 }

export default function SummaryScreen() {
  const { entries: todayEntries, setEntries } = useApp()
  const [viewMode, setViewMode] = useState('day')
  const [showPicker, setShowPicker] = useState(false)
  const [offset, setOffset] = useState(0) // only used in day mode
  const [dayEntries, setDayEntries] = useState([])
  const [rangeEntries, setRangeEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const pickerRef = useRef(null)

  const selectedDate = new Date()
  selectedDate.setDate(selectedDate.getDate() - offset)
  selectedDate.setHours(0, 0, 0, 0)

  // Day view
  useEffect(() => {
    if (viewMode !== 'day') return
    if (offset === 0) { setDayEntries(todayEntries); return }
    fetchDay()
  }, [offset, todayEntries, viewMode])

  // Week/month view
  useEffect(() => {
    if (viewMode === 'day') return
    fetchRange(VIEW_DAYS[viewMode])
  }, [viewMode])

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false) }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [showPicker])

  const handleDelete = async (entryId) => {
    await supabase.from('entries').update({ deleted_at: new Date().toISOString() }).eq('id', entryId)
    setDayEntries(prev => prev.filter(e => e.id !== entryId))
    if (offset === 0) setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  const fetchDay = async () => {
    setLoading(true)
    const start = new Date(selectedDate)
    const end = new Date(selectedDate)
    end.setDate(end.getDate() + 1)
    const { data } = await supabase
      .from('entries').select('*').eq('family_id', FAMILY_ID)
      .gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
      .is('deleted_at', null).order('created_at', { ascending: false })
    setDayEntries(data || [])
    setLoading(false)
  }

  const fetchRange = async (days) => {
    setLoading(true)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    start.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('entries').select('*').eq('family_id', FAMILY_ID)
      .gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      .is('deleted_at', null).order('created_at', { ascending: false })
    setRangeEntries(data || [])
    setLoading(false)
  }

  // Day view stats
  const bottles = dayEntries.filter(e => e.type === 'bottle')
  const diapers = dayEntries.filter(e => e.type === 'diaper')
  const totalMl = dayEntries
    .filter(e => e.type === 'bottle' || e.type === 'bottle_extra')
    .reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const poopCount = diapers.filter(e => e.diaper_type === 'poop' || e.diaper_type === 'both').length
  const peeCount = diapers.filter(e => e.diaper_type === 'pee' || e.diaper_type === 'both').length

  // Range view stats
  const rangeBottles = rangeEntries.filter(e => e.type === 'bottle')
  const rangeDiapers = rangeEntries.filter(e => e.type === 'diaper')
  const rangeTotalMl = rangeEntries
    .filter(e => e.type === 'bottle' || e.type === 'bottle_extra')
    .reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const rangeDays = VIEW_DAYS[viewMode] || 1
  const rangePoopCount = rangeDiapers.filter(e => e.diaper_type === 'poop' || e.diaper_type === 'both').length
  const rangePeeCount = rangeDiapers.filter(e => e.diaper_type === 'pee' || e.diaper_type === 'both').length

  // Group range entries by day for the breakdown list
  const groupedByDay = rangeEntries.reduce((acc, e) => {
    const key = new Date(e.created_at).toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})
  const dayKeys = Object.keys(groupedByDay).sort((a, b) => new Date(b) - new Date(a))

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-4">
        {/* Left arrow — only in day mode */}
        <button
          onClick={() => viewMode === 'day' && setOffset(o => o + 1)}
          disabled={viewMode !== 'day'}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold disabled:opacity-0"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          ‹
        </button>

        {/* Center — tap to open view picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPicker(p => !p)}
            className="flex items-center gap-1 px-3 py-1 rounded-xl"
            style={{ background: 'var(--color-surface)' }}
          >
            <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              {viewMode === 'day' ? formatDateLabel(selectedDate) : VIEW_LABELS[viewMode]}
            </span>
            <span style={{ color: 'var(--color-muted)', fontSize: '0.7rem' }}>▾</span>
          </button>
          {viewMode === 'day' && offset > 0 && (
            <p className="text-xs text-center mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </p>
          )}

          {/* Dropdown picker */}
          {showPicker && (
            <div
              className="absolute top-full mt-1 left-1/2 rounded-2xl overflow-hidden shadow-lg z-50"
              style={{
                transform: 'translateX(-50%)',
                background: 'var(--color-surface)',
                minWidth: '140px',
                border: '1px solid rgba(128,128,128,0.15)',
              }}
            >
              {['day', 'week', 'month'].map(mode => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); if (mode === 'day') setOffset(0); setShowPicker(false) }}
                  className="w-full px-4 py-3 text-sm font-semibold text-left"
                  style={{
                    color: viewMode === mode ? '#22c55e' : 'var(--color-text)',
                    background: viewMode === mode ? 'rgba(34,197,94,0.08)' : 'transparent',
                  }}
                >
                  {mode === 'day' ? 'Today' : mode === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right arrow — only in day mode */}
        <button
          onClick={() => viewMode === 'day' && setOffset(o => Math.max(0, o - 1))}
          disabled={viewMode !== 'day' || offset === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold disabled:opacity-30"
          style={{ background: viewMode !== 'day' ? 'transparent' : 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          {viewMode === 'day' ? '›' : ''}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>Loading…</div>
        ) : viewMode === 'day' ? (
          <>
            <div className="flex gap-3 mb-3">
              <StatCard icon="🍼" title="Feeds" value={bottles.length} subtitle={`${totalMl} ml total`} />
              <StatCard icon="🧷" title="Diapers" value={diapers.length} subtitle={`💩 ${poopCount} · 💧 ${peeCount}`} />
            </div>
            {bottles.length > 0 && (
              <div className="mb-4 px-4 py-3 rounded-2xl text-sm" style={{ background: 'var(--color-surface)' }}>
                <span style={{ color: 'var(--color-muted)' }}>Avg per feed: </span>
                <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                  {Math.round(totalMl / bottles.length)} ml
                </span>
              </div>
            )}
            {dayEntries.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
                <div className="text-4xl mb-3">💤</div>
                <p>Nothing logged for this day</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: 'var(--color-muted)' }}>
                  Timeline
                </p>
                {dayEntries.map(entry => (
                  <EntryRow key={entry.id} entry={entry} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Range aggregate stats */}
            <div className="flex gap-3 mb-3">
              <StatCard
                icon="🍼" title="Total Feeds" value={rangeBottles.length}
                subtitle={`${rangeTotalMl} ml · avg ${rangeBottles.length > 0 ? Math.round(rangeTotalMl / rangeBottles.length) : 0} ml/feed`}
              />
              <StatCard
                icon="🧷" title="Diapers" value={rangeDiapers.length}
                subtitle={`💩 ${rangePoopCount} · 💧 ${rangePeeCount}`}
              />
            </div>
            <div className="mb-4 px-4 py-3 rounded-2xl text-sm flex justify-around" style={{ background: 'var(--color-surface)' }}>
              <div className="text-center">
                <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {(rangeBottles.length / rangeDays).toFixed(1)}
                </div>
                <div style={{ color: 'var(--color-muted)' }}>feeds/day</div>
              </div>
              <div className="text-center">
                <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {Math.round(rangeTotalMl / rangeDays)}
                </div>
                <div style={{ color: 'var(--color-muted)' }}>ml/day</div>
              </div>
              <div className="text-center">
                <div className="font-bold" style={{ color: 'var(--color-text)' }}>
                  {(rangeDiapers.length / rangeDays).toFixed(1)}
                </div>
                <div style={{ color: 'var(--color-muted)' }}>diapers/day</div>
              </div>
            </div>

            {/* Day-by-day breakdown */}
            {dayKeys.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--color-muted)' }}>
                <div className="text-4xl mb-3">💤</div>
                <p>Nothing logged yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider px-1 mb-1" style={{ color: 'var(--color-muted)' }}>
                  Day by day
                </p>
                {dayKeys.map(key => (
                  <DayRow
                    key={key}
                    dayEntries={groupedByDay[key]}
                    label={formatDateLabel(new Date(key))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
