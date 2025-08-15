// 'use client'
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
    const url = callSid ? `/api/recordings?callSid=${callSid}` : '/api/recordings'
    const r = await fetch(url); const j = await r.json(); setRecordings(j.recordings)
  }
  useEffect(() => { loadLogs() }, [])

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-2">Two-Number Web Dialer</h1>
      <p className="text-sm text-zinc-600 mb-6">Twilio WebRTC dialer with separate histories & recordings per company number.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 p-4 rounded-2xl shadow bg-white">
          <div className="flex gap-2 items-end mb-4">
            <div className="flex-1">
              <label className="block text-sm mb-1">Agent Identity</label>
              <input value={identity} onChange={e => setIdentity(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Company</label>
              <select value={company} onChange={e => setCompany(e.target.value as any)} className="border rounded-lg p-2">
                <option value="A">Company A</option>
                <option value="B">Company B</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">Dial Number</label>
              <input placeholder="e.g. +18562307373" value={target} onChange={e => setTarget(e.target.value)} className="w-full border rounded-lg p-2" />
            </div>
            <button onClick={handleCall} disabled={!isReady && !isMock || !target} className="px-4 py-2 rounded-xl bg-zinc-900 text-white disabled:opacity-40">Call</button>
            <button onClick={hangup} disabled={!conn && !isMock} className="px-4 py-2 rounded-xl bg-zinc-200">Hang up</button>
          </div>

          <div className="mt-4 text-sm text-zinc-700">Status: {status}</div>
        </div>

        <div className="p-4 rounded-2xl shadow bg-white">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <button onClick={loadLogs} className="px-3 py-2 rounded-lg bg-zinc-100 w-full mb-2">Refresh Call Logs</button>
          <button onClick={() => loadRecordings()} className="px-3 py-2 rounded-lg bg-zinc-100 w-full">Load Recordings</button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <div className="p-4 rounded-2xl shadow bg-white">
          <h3 className="font-semibold mb-2">Company A — Call History</h3>
          {loadingLogs ? <div>Loading…</div> : (
            <ul className="text-sm divide-y">
              {logs.A?.map((c: any) => (
                <li key={c.sid} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.toFormatted} <span className="text-xs text-zinc-500">({c.direction})</span></div>
                    <div className="text-xs text-zinc-500">{c.startTime} • {c.duration}s • {c.status}</div>
                  </div>
                  <button onClick={() => loadRecordings(c.sid)} className="text-xs underline">Recordings</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 rounded-2xl shadow bg-white">
          <h3 className="font-semibold mb-2">Company B — Call History</h3>
          {loadingLogs ? <div>Loading…</div> : (
            <ul className="text-sm divide-y">
              {logs.B?.map((c: any) => (
                <li key={c.sid} className="py-2 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.toFormatted} <span className="text-xs text-zinc-500">({c.direction})</span></div>
                    <div className="text-xs text-zinc-500">{c.startTime} • {c.duration}s • {c.status}</div>
                  </div>
                  <button onClick={() => loadRecordings(c.sid)} className="text-xs underline">Recordings</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="p-4 rounded-2xl shadow bg-white mt-6">
        <h3 className="font-semibold mb-2">Recordings</h3>
        <ul className="text-sm divide-y">
          {recordings.map((r: any) => (
            <li key={r.sid} className="py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.callSid} • {r.duration}s</div>
                <div className="text-xs text-zinc-500">Created: {r.dateCreated}</div>
              </div>
              <a className="text-xs underline" href={r.mediaUrl} target="_blank">Play</a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
