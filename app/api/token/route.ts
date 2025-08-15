import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const identity = searchParams.get('identity') || 'agent'
  if (process.env.MOCK === '1') return NextResponse.json({ token: 'mock-'+identity })

  const AccessToken = (twilio as any).jwt.AccessToken
  const VoiceGrant = AccessToken.VoiceGrant

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY_SID!,
    process.env.TWILIO_API_KEY_SECRET!,
    { identity }
  )
  const voiceGrant = new VoiceGrant({ outgoingApplicationSid: process.env.TWILIO_APP_SID!, incomingAllow: false })
  token.addGrant(voiceGrant)
  return NextResponse.json({ token: token.toJwt() })
}
