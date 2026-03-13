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

const COOLDOWN_MS = 2000

const SCROLL_THRESHOLD = 10 // px movement = treat as scroll, not tap

function ActionButton({ children, color, onClick }) {
  const [cooldown, setCooldown] = useState(0) // 1 = just pressed, 0 = ready
  const [confirmed, setConfirmed] = useState(false)
  const rafRef = useRef(null)
  const pointerStart = useRef(null)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const handlePointerUp = (e) => {
    if (!pointerStart.current) return
    const dx = Math.abs(e.clientX - pointerStart.current.x)
    const dy = Math.abs(e.clientY - pointerStart.current.y)
    pointerStart.current = null
    if (dx > SCROLL_THRESHOLD || dy > SCROLL_THRESHOLD) return // was a scroll
    if (cooldown > 0) return
    if (navigator.vibrate) navigator.vibrate(30)
    onClick()
    setConfirmed(true)
    setCooldown(1)

    const start = Date.now()
    const tick = () => {
      const remaining = Math.max(0, 1 - (Date.now() - start) / COOLDOWN_MS)
      setCooldown(remaining)
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setConfirmed(false)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => { pointerStart.current = null }}
      className="rounded-3xl flex flex-col items-center justify-center font-bold select-none relative overflow-hidden"
      style={{
        background: color,
        color: '#1a2e22',
        minHeight: '90px',
        fontSize: '1rem',
        WebkitTapHighlightColor: 'transparent',
        opacity: cooldown > 0 ? 0.85 : 1,
        transform: cooldown === 1 ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.1s, opacity 0.1s',
      }}
    >
      {/* Draining overlay — shrinks from top as cooldown decreases */}
      {cooldown > 0 && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: `${cooldown * 100}%`,
          background: 'rgba(255,255,255,0.35)',
          transition: 'none',
          pointerEvents: 'none',
        }} />
      )}

      {confirmed ? (
        <span style={{ fontSize: '1.8rem', position: 'relative' }}>✓</span>
      ) : (
        <div className="flex flex-col items-center justify-center gap-0.5" style={{ position: 'relative' }}>
          {children}
        </div>
      )}
    </button>
  )
}

export default function ActionScreen({ onOpenSettings }) {
  const { entries, addEntry, updateEntry, getLastBottleEver, settings } = useApp()

  const lastBottle = entries.find(e => e.type === 'bottle')
  const lastDiaper = entries.find(e => e.type === 'diaper')

  const todayBottles = entries.filter(e => e.type === 'bottle')
  const todayDiapers = entries.filter(e => e.type === 'diaper')
  const totalMl = todayBottles.reduce((sum, e) => sum + (e.bottle_ml || 0), 0)
  const poopCount = todayDiapers.filter(e => e.diaper_type === 'poop' || e.diaper_type === 'both').length
  const peeCount = todayDiapers.filter(e => e.diaper_type === 'pee' || e.diaper_type === 'both').length

  const handleBottle = useCallback(async (ml) => {
    await addEntry({ type: 'bottle', bottle_ml: ml })
  }, [addEntry])

  const handleAddTen = useCallback(async () => {
    let target = lastBottle
    if (!target) target = await getLastBottleEver()
    if (!target) return
    await updateEntry(target.id, { bottle_ml: (target.bottle_ml || 0) + 10 })
  }, [lastBottle, updateEntry, getLastBottleEver])

  const handleDiaper = useCallback(async (type) => {
    await addEntry({ type: 'diaper', diaper_type: type })
  }, [addEntry])

  const bottleSizes = settings?.bottle_sizes || [30, 60, 90]

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
          <div className="mt-3">
            <ActionButton color="#c8f0d4" onClick={handleAddTen}>
              <span className="text-xl font-bold">+10 ml</span>
              <span className="text-xs font-semibold opacity-70">add to last feeding</span>
            </ActionButton>
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
