'use client'
import { useEffect, useState } from 'react'

declare global { interface Window { } }
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
  const [darkMode, setDarkMode] = useState(true)

  async function getToken(id: string) {
    setStatus('Getting token...')
    const res = await fetch(`/api/token?identity=${encodeURIComponent(id)}`)
    const json = await res.json()
    return json.token as string
  }

  useEffect(() => {
    (async () => {
      if (isMock) {
        setStatus('Mock mode: ready')
        setReady(true)
        return
      }
      try {
        const mod = await import('@twilio/voice-sdk')
        Voice = mod
        setStatus('Fetching token...')
        const token = await getToken(identity)

        // ✅ FIX: use `new Device` not `Device.create`
        const dev = new Voice.Device(token)

        dev.on('registered', () => setStatus('Registered'))
        dev.on('error', (e: any) => setStatus('Error: ' + e.message))
        dev.on('incoming', (call: any) => call.reject())
        dev.on('unregistered', () => setStatus('Unregistered'))
        dev.on('registrationFailed', (e: any) => setStatus('Registration failed: ' + e.message))

        setDevice(dev)
        setReady(true)
      } catch (err: any) {
        setStatus('Error: ' + err.message)
      }
    })()
  }, [])

  async function handleCall() {
    if (isMock) {
      if (!target) return
      setStatus('Mock: calling ' + target)
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

  function hangup() {
    if (!isMock) conn?.disconnect()
  }

  async function loadLogs() {
    setLoadingLogs(true)
    const r = await fetch('/api/calls')
    setLogs(await r.json())
    setLoadingLogs(false)
  }

  async function loadRecordings(callSid?: string) {
    const url = callSid ? `/api/recordings?callSid=${callSid}` : '/api/recordings'
    const r = await fetch(url)
    setRecordings(await r.json())
  }

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
      <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">Connectiv</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Where innovation takes place</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded text-center font-semibold mb-6">
          Status: {status}
        </div>

        {/* Input Fields */}
        <input
          value={identity}
          onChange={e => setIdentity(e.target.value)}
          className="border p-2 w-full mb-2 rounded dark:bg-gray-800 dark:border-gray-600"
        />
        <select
          value={company}
          onChange={e => setCompany(e.target.value as 'A' | 'B')}
          className="border p-2 w-full mb-2 rounded dark:bg-gray-800 dark:border-gray-600"
        >
          <option value="A">Company A</option>
          <option value="B">Company B</option>
        </select>
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="Dial Number e.g. +1856230"
          className="border p-2 w-full mb-4 rounded dark:bg-gray-800 dark:border-gray-600"
        />

        {/* Call Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCall}
            disabled={!isReady}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Call
          </button>
          <button
            onClick={hangup}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Hang Up
          </button>
        </div>

        {/* Log & Recordings */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={loadLogs}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Refresh Call Logs
          </button>
          <button
            onClick={() => loadRecordings()}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Load Recordings
          </button>
        </div>

        {/* Company A Logs */}
        <h2 className="text-xl font-semibold">Company A — Call History</h2>
        {logs.A.length === 0 ? <p>No calls yet</p> : <ul>{logs.A.map((c: any, i: number) => <li key={i}>{c}</li>)}</ul>}

        {/* Company B Logs */}
        <h2 className="text-xl font-semibold mt-4">Company B — Call History</h2>
        {logs.B.length === 0 ? <p>No calls yet</p> : <ul>{logs.B.map((c: any, i: number) => <li key={i}>{c}</li>)}</ul>}
      </div>
    </div>
  )
}
