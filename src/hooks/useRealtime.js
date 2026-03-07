import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../context/AppContext'

const FAMILY_ID = 'f0000000-beef-0000-0000-000000000001'

export function useRealtime() {
  const { setEntries } = useApp()

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const channel = supabase
      .channel('entries:family')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'entries',
        filter: `family_id=eq.${FAMILY_ID}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const entry = payload.new
          if (!entry.deleted_at && new Date(entry.created_at) >= today) {
            setEntries(prev => prev.find(e => e.id === entry.id) ? prev : [entry, ...prev])
          }
        } else if (payload.eventType === 'UPDATE') {
          const entry = payload.new
          if (entry.deleted_at) {
            setEntries(prev => prev.filter(e => e.id !== entry.id))
          } else {
            setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [setEntries])
}
