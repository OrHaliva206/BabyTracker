import { useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useRealtime } from './hooks/useRealtime'
import ActionScreen from './screens/ActionScreen'
import SummaryScreen from './screens/SummaryScreen'
import TodoScreen from './screens/TodoScreen'
import SettingsSheet from './components/SettingsSheet'

function NameScreen() {
  const { setUserName } = useApp()
  const [name, setName] = useState('')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-7xl mb-3">👶</div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>JohnnyTracker</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>What should we call you?</p>
        </div>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setUserName(name.trim())}
            placeholder="Dad / Mom / your name…"
            autoFocus
            maxLength={20}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none text-center text-xl"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '2px solid #a8d8b9' }}
          />
          <button
            onClick={() => name.trim() && setUserName(name.trim())}
            disabled={!name.trim()}
            className="w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50"
            style={{ background: '#a8d8b9', color: '#1a2e22' }}
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  )
}

function TabBar({ active, onChange }) {
  return (
    <div className="flex border-t" style={{ background: 'var(--color-surface)', borderColor: 'rgba(107,138,116,0.15)' }}>
      {[
        { id: 'action', icon: '🍼', label: 'Track' },
        { id: 'summary', icon: '📊', label: 'Summary' },
        { id: 'todo', icon: '📝', label: 'TDL' },
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
  const { userName, ready } = useApp()
  const [tab, setTab] = useState('action')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useRealtime()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-4xl">👶</div>
      </div>
    )
  }

  if (!userName) return <NameScreen />

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
        {tab === 'todo' && (
          <div className="absolute inset-0 overflow-y-auto">
            <TodoScreen />
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
