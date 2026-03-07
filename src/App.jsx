import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useRealtime } from './hooks/useRealtime'
import AuthScreen from './screens/AuthScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ActionScreen from './screens/ActionScreen'
import SummaryScreen from './screens/SummaryScreen'
import SettingsSheet from './components/SettingsSheet'

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-t" style={{
      background: 'var(--color-surface)',
      borderColor: 'rgba(107,138,116,0.15)',
    }}>
      {[
        { id: 'action', icon: '🍼', label: 'Track' },
        { id: 'summary', icon: '📊', label: 'Summary' },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5"
          style={{
            color: active === tab.id ? '#a8d8b9' : 'var(--color-muted)',
            fontWeight: active === tab.id ? '700' : '400',
          }}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

function MainApp() {
  const { session, profile, family } = useApp()
  const [tab, setTab] = useState('action')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useRealtime()

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-4xl">👶</div>
      </div>
    )
  }

  if (!session) return <AuthScreen />
  if (!profile || !family) return <OnboardingScreen />

  return (
    <div className="flex flex-col h-full" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="flex-1 overflow-hidden relative">
        {tab === 'action' && (
          <div className="absolute inset-0 overflow-y-auto">
            <ActionScreen onOpenSettings={() => setSettingsOpen(true)} />
          </div>
        )}
        {tab === 'summary' && (
          <div className="absolute inset-0 overflow-y-auto">
            <SummaryScreen />
          </div>
        )}
      </div>
      <TabBar active={tab} onChange={setTab} />
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  )
}
