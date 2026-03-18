import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FAMILY_ID = 'f0000000-beef-0000-0000-000000000001'
const SWIPE_THRESHOLD = 60

function TodoItem({ item, onDelete }) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(null)
  const itemRef = useRef(null)

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = (e) => {
    if (startXRef.current === null) return
    const dx = e.touches[0].clientX - startXRef.current
    if (dx < 0) setOffsetX(Math.max(dx, -100))
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-100) // snap open
    } else {
      setOffsetX(0)   // snap closed
    }
    startXRef.current = null
  }

  const handleDelete = () => {
    onDelete(item.id)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={itemRef}>
      {/* Delete button revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center px-5"
        style={{ background: '#ef4444', width: '80px' }}
      >
        <button
          onClick={handleDelete}
          className="text-white font-bold text-sm"
        >
          מחק
        </button>
      </div>

      {/* Item row */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-center gap-3 px-4 py-4 relative"
        style={{
          background: 'var(--color-surface)',
          transform: `translateX(${offsetX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          direction: 'rtl',
          touchAction: 'pan-y',
        }}
      >
        <span style={{ color: '#a8d8b9', fontSize: '10px', flexShrink: 0 }}>●</span>
        <span className="flex-1 text-base" style={{ color: 'var(--color-text)', lineHeight: 1.5 }}>
          {item.text}
        </span>
      </div>
    </div>
  )
}

export default function TodoScreen() {
  const [items, setItems] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  const loadItems = useCallback(async () => {
    const { data } = await supabase
      .from('todo_items')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()

    const channel = supabase
      .channel('todo_items:family')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'todo_items',
        filter: `family_id=eq.${FAMILY_ID}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = payload.new
          if (!item.deleted_at) {
            setItems(prev => prev.find(i => i.id === item.id) ? prev : [...prev, item])
          }
        } else if (payload.eventType === 'UPDATE') {
          const item = payload.new
          if (item.deleted_at) {
            setItems(prev => prev.filter(i => i.id !== item.id))
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [loadItems])

  const handleAdd = async () => {
    const text = inputText.trim()
    if (!text) return
    setInputText('')

    const { data, error } = await supabase
      .from('todo_items')
      .insert({ family_id: FAMILY_ID, text })
      .select()
      .single()
    if (error) { console.error(error); return }
    setItems(prev => prev.find(i => i.id === data.id) ? prev : [...prev, data])
  }

  const handleDelete = async (id) => {
    await supabase
      .from('todo_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <div className="px-5 pt-safe pt-5 pb-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)', direction: 'rtl' }}>
          רשימה 📝
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)', direction: 'rtl' }}>
          החלק שמאלה למחיקה
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-4">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--color-muted)' }}>טוען…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--color-muted)', direction: 'rtl' }}>
            <div className="text-4xl mb-3">✨</div>
            <p>הרשימה ריקה</p>
          </div>
        ) : (
          items.map(item => (
            <TodoItem key={item.id} item={item} onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* Input bar */}
      <div
        className="px-4 pb-safe pb-4 pt-3 flex gap-2 border-t"
        style={{ background: 'var(--color-surface)', borderColor: 'rgba(107,138,116,0.15)' }}
      >
        <button
          onClick={handleAdd}
          disabled={!inputText.trim()}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold disabled:opacity-40 flex-shrink-0"
          style={{ background: '#a8d8b9', color: '#1a2e22' }}
        >
          +
        </button>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="הוסף פריט…"
          className="flex-1 px-4 py-2.5 rounded-2xl text-base outline-none"
          style={{
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            border: '2px solid rgba(168,216,185,0.4)',
            direction: 'rtl',
          }}
        />
      </div>
    </div>
  )
}
