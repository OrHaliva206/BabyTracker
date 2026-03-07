import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Hardcoded family ID — same on all devices, no auth needed
const FAMILY_ID = 'f0000000-beef-0000-0000-000000000001'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [userName, setUserNameState] = useState(() => localStorage.getItem('userName') || '')
  const [settings, setSettings] = useState({ bottle_sizes: [30, 60, 90] })
  const [entries, setEntries] = useState([])
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  useEffect(() => {
    loadSettings()
    loadTodayEntries()
    setReady(true)
  }, [])

  const setUserName = (name) => {
    localStorage.setItem('userName', name)
    setUserNameState(name)
  }

  const loadSettings = async () => {
    const { data } = await supabase
      .from('family_settings')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .maybeSingle()
    if (data) setSettings(data)
  }

  const loadTodayEntries = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('family_id', FAMILY_ID)
      .gte('created_at', today.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    setEntries(data || [])
  }

  const addEntry = useCallback(async (entryData) => {
    const { data, error } = await supabase
      .from('entries')
      .insert({ family_id: FAMILY_ID, logged_by_name: userName, ...entryData })
      .select()
      .single()
    if (error) { console.error(error); return null }
    return data
  }, [userName])

  const undoEntry = useCallback(async (entryId) => {
    await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId)
  }, [])

  const updateSettings = useCallback(async (newSizes) => {
    const { data } = await supabase
      .from('family_settings')
      .upsert({ family_id: FAMILY_ID, bottle_sizes: newSizes, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (data) setSettings(data)
  }, [])

  return (
    <AppContext.Provider value={{
      userName,
      setUserName,
      settings,
      entries,
      setEntries,
      darkMode,
      setDarkMode,
      addEntry,
      undoEntry,
      updateSettings,
      loadTodayEntries,
      ready,
      FAMILY_ID,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
