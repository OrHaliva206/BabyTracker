import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)
  const [family, setFamily] = useState(null)
  const [settings, setSettings] = useState({ bottle_sizes: [30, 60, 90] })
  const [entries, setEntries] = useState([])
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true')

  // Apply dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load profile + family when session changes
  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setFamily(null)
      setEntries([])
      return
    }
    loadProfile(session.user.id)
  }, [session])

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, families(*), family_settings(*)')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      setProfile(data)
      if (data.families) {
        setFamily(data.families)
        if (data.family_settings) {
          setSettings(data.family_settings)
        }
        loadTodayEntries(data.family_id)
      }
    }
  }

  const loadTodayEntries = async (familyId) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('entries')
      .select('*')
      .eq('family_id', familyId)
      .gte('created_at', today.toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    setEntries(data || [])
  }

  const addEntry = useCallback(async (entryData) => {
    if (!profile?.family_id) return null
    const { data, error } = await supabase
      .from('entries')
      .insert({
        family_id: profile.family_id,
        logged_by: profile.id,
        logged_by_name: profile.display_name,
        ...entryData,
      })
      .select()
      .single()

    if (error) { console.error(error); return null }
    return data
  }, [profile])

  const undoEntry = useCallback(async (entryId) => {
    await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', entryId)
  }, [])

  const updateSettings = useCallback(async (newSizes) => {
    if (!profile?.family_id) return
    const { data } = await supabase
      .from('family_settings')
      .upsert({ family_id: profile.family_id, bottle_sizes: newSizes, updated_at: new Date().toISOString() })
      .select()
      .single()
    if (data) setSettings(data)
  }, [profile])

  const refreshProfile = useCallback(() => {
    if (session?.user) loadProfile(session.user.id)
  }, [session])

  return (
    <AppContext.Provider value={{
      session,
      profile,
      family,
      settings,
      entries,
      setEntries,
      darkMode,
      setDarkMode,
      addEntry,
      undoEntry,
      updateSettings,
      refreshProfile,
      loadTodayEntries: () => profile?.family_id && loadTodayEntries(profile.family_id),
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
