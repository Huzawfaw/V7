import { NextRequest, NextResponse } from 'next/server'
import Twilio from 'twilio'

export async function GET(req: NextRequest) {
  if (process.env.MOCK === '1') {
    return NextResponse.json({ recordings:[{sid:'RECA',callSid:'CA1',duration:60,dateCreated:new Date().toISOString(),mediaUrl:'#'}] })
  }
  const client = Twilio(process.env.TWILIO_API_KEY_SID!, process.env.TWILIO_API_KEY_SECRET!, { accountSid: process.env.TWILIO_ACCOUNT_SID })
  const { searchParams } = new URL(req.url)
  const callSid = searchParams.get('callSid')
  const recs = callSid ? await client.recordings.list({ callSid, limit:20 }) : await client.recordings.list({ limit:50 })
  const out = recs.map((r:any)=>({ sid:r.sid, callSid:r.callSid, duration:Number(r.duration||0), dateCreated:r.dateCreated?.toISOString?.()||'', mediaUrl:`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${r.sid}.mp3` }))
  return NextResponse.json({ recordings: out })
}
