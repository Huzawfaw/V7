import { NextRequest } from 'next/server'
import { twiml } from 'twilio'

export async function POST(req: NextRequest) {
  const vr = new twiml.VoiceResponse()

  if (process.env.MOCK === '1') {
    vr.say('Mock mode.')
    return new Response(vr.toString(), { headers: { 'Content-Type': 'text/xml' } })
  }

  const form = await req.formData()
  const to = String(form.get('To') || '')
  const company = String(form.get('Company') || 'A')
  const callerId = company === 'B' ? process.env.COMPANY_B_NUMBER! : process.env.COMPANY_A_NUMBER!

  // Twilio's type defs for Dial options are strict; cast literals to satisfy them.
  const dial = vr.dial({
    callerId,
    // literal cast to DialRecord
    record: 'record-from-answer' as any,
    // this prop expects a specific enum/array type in Twilio defs; cast for safety
    recordingStatusCallback: '/api/recording-status',
    recordingStatusCallbackEvent: ['completed'] as any
  } as any)

  dial.number({}, to)

  return new Response(vr.toString(), { headers: { 'Content-Type': 'text/xml' } })
}
