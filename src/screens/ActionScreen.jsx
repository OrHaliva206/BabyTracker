import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'

function formatElapsed(ms) {
  if (ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m ago`
  if (m > 0) return `${m}m ago`
  return 'Just now'
}

function LastTimer({ label, timestamp }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const elapsed = timestamp ? now - new Date(timestamp).getTime() : -1
  return (
    <div className="text-center">
      <div className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-muted)' }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
        {formatElapsed(elapsed)}
      </div>
    </div>
  )
}

const SCROLL_THRESHOLD = 10 // px — more movement = scroll, not tap

function ActionButton({ children, color, onClick }) {
  const [pressed, setPressed] = useState(false)
  const pointerStart = useRef(null)

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    setPressed(true)
  }

  const handlePointerUp = (e) => {
    setPressed(false)
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    pointerStart.current = null
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) return // was a scroll
    if (navigator.vibrate) navigator.vibrate(30)
    onClick()
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { setPressed(false); pointerStart.current = null }}
      className="rounded-3xl flex flex-col items-center justify-center font-bold select-none"
      style={{
        background: color,
        color: '#1a2e22',
        minHeight: '90px',
        fontSize: '1rem',
        WebkitTapHighlightColor: 'transparent',
        transform: pressed ? 'scale(0.93)' : 'scale(1)',
        transition: 'transform 0.08s',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-0.5">
        {children}
      </div>
    </button>
  )
}

export default function ActionScreen({ onOpenSettings }) {
  const { entries, addEntry, settings } = useApp()

  const lastBottle = entries.find(e => e.type === 'bottle')
  const lastDiaper = entries.find(e => e.type === 'diaper')

  const todayBottles = entries.filter(e => e.type === 'bottle')
  const todayDiapers = entries.filter(e => e.type === 'diaper')
  const totalMl = entries
    .filter(e => e.type === 'bottle' || e.type === 'bottle_extra')
    .reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const poopCount = todayDiapers.filter(e => e.diaper_type === 'poop' || e.diaper_type === 'both').length
  const peeCount = todayDiapers.filter(e => e.diaper_type === 'pee' || e.diaper_type === 'both').length

  const handleBottle = useCallback(async (ml) => {
    await addEntry({ type: 'bottle', bottle_ml: ml })
  }, [addEntry])

  const handleAddTen = useCallback(async () => {
    await addEntry({ type: 'bottle_extra', bottle_ml: 10 })
  }, [addEntry])

  const handleDiaper = useCallback(async (type) => {
    await addEntry({ type: 'diaper', diaper_type: type })
  }, [addEntry])

  // Remove 10 from bottleSizes — +10 button takes that slot
  const bottleSizes = (settings?.bottle_sizes || [30, 60, 90]).filter(s => s !== 10)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>JohnnyTracker 👶</h1>
        </div>
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          ⚙️
        </button>
      </div>

      {/* Last fed / changed timers */}
      <div className="flex justify-around px-5 py-3 mx-4 rounded-2xl mb-4"
           style={{ background: 'var(--color-surface)' }}>
        <LastTimer label="Last fed" timestamp={lastBottle?.created_at} />
        <div className="w-px" style={{ background: 'var(--color-muted)', opacity: 0.2 }} />
        <LastTimer label="Last changed" timestamp={lastDiaper?.created_at} />
      </div>

      {/* Main buttons */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-5 pb-4">
        {/* Bottles */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--color-muted)' }}>
            🍼 Bottle
          </p>
          <div className="grid grid-cols-3 gap-3">
            <ActionButton color="#c8f0d4" onClick={handleAddTen}>
              <span className="text-2xl font-bold">+10</span>
              <span className="text-xs font-semibold opacity-70">ml extra</span>
            </ActionButton>
            {bottleSizes.map((ml) => (
              <ActionButton
                key={ml}
                color="#a8d8b9"
                onClick={() => handleBottle(ml)}
              >
                <span className="text-2xl font-bold">{ml}</span>
                <span className="text-xs font-semibold opacity-70">ml</span>
              </ActionButton>
            ))}
          </div>
        </div>

        {/* Diapers */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--color-muted)' }}>
            🧷 Diaper
          </p>
          <div className="grid grid-cols-3 gap-3">
            <ActionButton color="#f5d6a8" onClick={() => handleDiaper('poop')}>
              <span className="text-3xl">💩</span>
              <span className="text-xs font-semibold mt-1">Poop</span>
            </ActionButton>
            <ActionButton color="#c8e6f5" onClick={() => handleDiaper('pee')}>
              <span className="text-3xl">💧</span>
              <span className="text-xs font-semibold mt-1">Pee</span>
            </ActionButton>
            <ActionButton color="#e8d5f5" onClick={() => handleDiaper('both')}>
              <span className="text-3xl">💛</span>
              <span className="text-xs font-semibold mt-1">Both</span>
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Daily stats bar */}
      <div className="mx-4 mb-2 px-4 py-3 rounded-2xl flex justify-around text-sm"
           style={{ background: 'var(--color-surface)' }}>
        <div className="text-center">
          <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{todayBottles.length}</div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>feeds</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{totalMl}</div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>ml total</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{poopCount}</div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>💩</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{peeCount}</div>
          <div className="text-xs" style={{ color: 'var(--color-muted)' }}>💧</div>
        </div>
      </div>

    </div>
  )
}
