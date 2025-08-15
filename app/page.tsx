'use client'
import { useEffect, useState } from 'react'

declare global { interface Window {} }
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

  async function getToken(id: string) {
    const res = await fetch(`/api/token?identity=${encodeURIComponent(id)}`)
    const json = await res.json()
    return json.token as string
  }

  useEffect(() => {
    (async () => {
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
    const r = await fetch('/api/recordings' + (callSid ? `?callSid=${callSid}` : ''))
    setRecordings(await r.json())
  }

  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Two-Number Web Dialer</h1>
        <button
          onClick={toggleDarkMode}
          className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          🌙 Toggle Dark Mode
        </button>
      </div>

      <p className="mb-4">Twilio WebRTC with separate histories & recordings</p>
      <p className="mb-4 font-medium">Status: {status}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="px-2 py-1 border rounded bg-white dark:bg-gray-800"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
        />
        <select
          className="px-2 py-1 border rounded bg-white dark:bg-gray-800"
          value={company}
          onChange={(e) => setCompany(e.target.value as 'A' | 'B')}
        >
          <option value="A">Company A</option>
          <option value="B">Company B</option>
        </select>
        <input
          className="px-2 py-1 border rounded bg-white dark:bg-gray-800"
          placeholder="Dial Number e.g. +1856230"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          onClick={handleCall}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Call
        </button>
        <button
          onClick={hangup}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Hang Up
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={loadLogs}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loadingLogs ? 'Loading...' : 'Refresh Call Logs'}
        </button>
        <button
          onClick={() => loadRecordings()}
          className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Load Recordings
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Company A — Call History</h2>
          {logs.A.length === 0 ? (
            <p className="text-gray-500">No calls yet</p>
          ) : (
            logs.A.map((log: any, i: number) => (
              <div key={i} className="mb-2 p-3 border rounded bg-white dark:bg-gray-800">
                <p>{log.number} ({log.direction}) • {log.duration}s • {log.status}</p>
                <button
                  onClick={() => loadRecordings(log.sid)}
                  className="mt-1 text-blue-500 hover:underline"
                >
                  Recordings
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Company B — Call History</h2>
          {logs.B.length === 0 ? (
            <p className="text-gray-500">No calls yet</p>
          ) : (
            logs.B.map((log: any, i: number) => (
              <div key={i} className="mb-2 p-3 border rounded bg-white dark:bg-gray-800">
                <p>{log.number} ({log.direction}) • {log.duration}s • {log.status}</p>
                <button
                  onClick={() => loadRecordings(log.sid)}
                  className="mt-1 text-blue-500 hover:underline"
                >
                  Recordings
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {recordings.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Recordings</h2>
          {recordings.map((rec, i) => (
            <div key={i} className="mb-2 p-3 border rounded bg-white dark:bg-gray-800">
              <audio controls src={rec.url} className="w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
