import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

export function useRealtime() {
  const { profile, setEntries } = useApp()

  useEffect(() => {
    if (!profile?.family_id) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const channel = supabase
      .channel(`entries:${profile.family_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries',
          filter: `family_id=eq.${profile.family_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const entry = payload.new
            // Only add if it's today and not deleted
            if (!entry.deleted_at && new Date(entry.created_at) >= today) {
              setEntries(prev => {
                if (prev.find(e => e.id === entry.id)) return prev
                return [entry, ...prev]
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const entry = payload.new
            if (entry.deleted_at) {
              // Soft deleted — remove from list
              setEntries(prev => prev.filter(e => e.id !== entry.id))
            } else {
              setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
            }
          } else if (payload.eventType === 'DELETE') {
            setEntries(prev => prev.filter(e => e.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile?.family_id, setEntries])
}
