'use client'

import { useEffect, useState } from 'react'

const isMock = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_MOCK === '1'
let Voice: any = null

export default function Page() {
  const [identity, setIdentity] = useState('agent-' + Math.random().toString(36).slice(2, 8))
  const [company, setCompany] = useState<'A' | 'B'>('A')
  const [target, setTarget] = useState('')
  const [device, setDevice] = useState<any>(null)
  const [isReady, setReady] = useState(false)
  const [conn, setConn] = useState<any>(null)
  const [status, setStatus] = useState('Idle')
  const [logs, setLogs] = useState<any>({ A: [], B: [] })
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [recordings, setRecordings] = useState<any[]>([])
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  async function getToken(id: string) {
    const res = await fetch(`/api/token?identity=${encodeURIComponent(id)}`)
    const json = await res.json()
    return json.token as string
  }

  // Theme setup
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored) {
      setTheme(stored as 'light' | 'dark')
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialTheme = prefersDark ? 'dark' : 'light'
      setTheme(initialTheme)
      document.documentElement.classList.toggle('dark', initialTheme === 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    localStorage.setItem('theme', newTheme)
  }

  useEffect(() => {
    ;(async () => {
      if (isMock) { setStatus('Mock mode: ready'); setReady(true); return }
      const mod = await import('@twilio/voice-sdk'); Voice = mod
      const token = await getToken(identity)
      const dev = await Voice.Device.create(token)
      dev.on('registered', () => setStatus('Registered'))
      dev.on('error', (e: any) => setStatus('Error: ' + e.message))
      dev.on('incoming', (call: any) => { call.reject() })
      setDevice(dev); setReady(true)
    })()
  }, [])

  async function handleCall() {
    if (isMock) {
      if (!target) return; setStatus('Mock: calling ' + target)
      setTimeout(() => setStatus('Mock: in call'), 400)
      setTimeout(() => setStatus('Idle'), 1800)
      return
    }
    if (!device || !target) return
    setStatus('Calling...')
    const params = { To: target, Company: company } as any
    const call = await device.connect({ params })
    setConn(call)
    call.on('accept', () => setStatus('In call'))
    call.on('disconnect', () => { setStatus('Idle'); setConn(null) })
    call.on('cancel', () => { setStatus('Canceled'); setConn(null) })
    call.on('error', (e: any) => setStatus('Error: ' + e.message))
  }

  function hangup() { if (!isMock) conn?.disconnect() }

  async function loadLogs() { setLoadingLogs(true); const r = await fetch('/api/calls'); setLogs(await r.json()); setLoadingLogs(false) }
  async function loadRecordings(callSid?: string) {
    const url = callSid ? `/api/recordings?callSid=${callSid}` : '/api/recordings'
    const r = await fetch(url)
    setRecordings(await r.json())
  }

  const statusColor =
    status.startsWith('Error') ? 'bg-red-500' :
    status.includes('call') || status === 'Registered' ? 'bg-green-500' :
    status.includes('Calling') ? 'bg-yellow-500' : 'bg-gray-500'

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with theme toggle */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Two-Number Web Dialer</h1>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          Twilio WebRTC with separate histories & recordings
        </p>
        
        {/* Status Banner */}
        <div className={`text-white px-4 py-2 rounded-md text-center font-medium ${statusColor}`}>
          Status: {status}
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-4">
          <input
            value={identity}
            onChange={e => setIdentity(e.target.value)}
            placeholder="Agent Identity"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
          />

          <select
            value={company}
            onChange={e => setCompany(e.target.value as 'A' | 'B')}
            className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
          >
            <option value="A">Company A</option>
            <option value="B">Company B</option>
          </select>

          <input
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder="Dial Number e.g. +18562307373"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-700"
          />

          <div className="flex gap-4">
            <button
              onClick={handleCall}
              disabled={!isReady}
              className="flex-1 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              Call
            </button>
            <button
              onClick={hangup}
              className="flex-1 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Hang Up
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={loadLogs}
              className="flex-1 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Refresh Call Logs
            </button>
            <button
              onClick={() => loadRecordings()}
              className="flex-1 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
            >
              Load Recordings
            </button>
          </div>
        </div>

        {/* Call History */}
        <div className="space-y-4">
          {['A', 'B'].map(c => (
            <div key={c} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-2">Company {c} — Call History</h2>
              {logs[c].length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No calls yet</p>
              ) : (
                <ul className="space-y-2">
                  {logs[c].map((log: any, i: number) => (
                    <li key={i} className="border-b dark:border-gray-700 pb-2">
                      <div className="flex justify-between">
                        <span>{log.from} → {log.to}</span>
                        <span className="text-sm text-gray-500">{log.duration}s</span>
                      </div>
                      <button
                        onClick={() => loadRecordings(log.sid)}
                        className="text-blue-500 hover:underline text-sm"
                      >
                        Recordings
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Recordings */}
        {recordings.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-2">Recordings</h2>
            <ul className="space-y-2">
              {recordings.map((rec, i) => (
                <li key={i}>
                  <audio controls src={rec.url} className="w-full" />
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
