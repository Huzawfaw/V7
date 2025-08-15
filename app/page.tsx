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

  async function getToken(id: string) {
    setStatus('Getting token...')
    const res = await fetch(`/api/token?identity=${encodeURIComponent(id)}`)
    const json = await res.json()
    console.log('Twilio token received:', json)
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
        console.log('Importing Twilio Voice SDK...')
        const mod = await import('@twilio/voice-sdk')
        Voice = mod
        setStatus('Fetching token...')
        const token = await getToken(identity)
        console.log('Creating device with token...')
        const dev = await Voice.Device.create(token)

        // Debug all events
        dev.on('registered', () => { console.log('Device registered'); setStatus('Registered') })
        dev.on('error', (e: any) => { console.error('Device error:', e); setStatus('Error: ' + e.message) })
        dev.on('incoming', (call: any) => { console.log('Incoming call:', call); call.reject() })
        dev.on('unregistered', () => { console.log('Device unregistered'); setStatus('Unregistered') })
        dev.on('registrationFailed', (e: any) => { console.error('Registration failed:', e) })

        setDevice(dev)
        setReady(true)
        console.log('Device created successfully')
      } catch (err) {
        console.error('Failed to initialize Twilio device:', err)
        setStatus('Error: ' + (err as any).message)
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
    console.log('Placing call with params:', params)
    const call = await device.connect({ params })
    setConn(call)

    // Call events
    call.on('accept', () => { console.log('Call accepted'); setStatus('In call') })
    call.on('disconnect', () => { console.log('Call disconnected'); setStatus('Idle'); setConn(null) })
    call.on('cancel', () => { console.log('Call canceled'); setStatus('Canceled'); setConn(null) })
    call.on('error', (e: any) => { console.error('Call error:', e); setStatus('Error: ' + e.message) })
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
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Connectiv</h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">Where innovation takes place</p>

      <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded text-center font-semibold mb-6">
        Status: {status}
      </div>

      <input value={identity} onChange={e => setIdentity(e.target.value)} className="border p-2 w-full mb-2 rounded" />
      <select value={company} onChange={e => setCompany(e.target.value as 'A' | 'B')} className="border p-2 w-full mb-2 rounded">
        <option value="A">Company A</option>
        <option value="B">Company B</option>
      </select>
      <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Dial Number e.g. +1856230" className="border p-2 w-full mb-4 rounded" />

      <div className="flex gap-2 mb-4">
        <button onClick={handleCall} disabled={!isReady} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Call</button>
        <button onClick={hangup} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Hang Up</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={loadLogs} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">Refresh Call Logs</button>
        <button onClick={() => loadRecordings()} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">Load Recordings</button>
      </div>

      <h2 className="text-xl font-semibold">Company A — Call History</h2>
      {logs.A.length === 0 ? <p>No calls yet</p> : <ul>{logs.A.map((c: any, i: number) => <li key={i}>{c}</li>)}</ul>}

      <h2 className="text-xl font-semibold mt-4">Company B — Call History</h2>
      {logs.B.length === 0 ? <p>No calls yet</p> : <ul>{logs.B.map((c: any, i: number) => <li key={i}>{c}</li>)}</ul>}
    </div>
  )
}
