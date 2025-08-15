import { NextResponse } from 'next/server'
import Twilio from 'twilio'

export async function GET() {
  if (process.env.MOCK === '1') {
    const now = new Date().toISOString()
    return NextResponse.json({
      A: [{ sid:'CA1', to:'+15551230001', toFormatted:'+1 555 123 0001', from:'+1555A', startTime:now, duration:60, status:'completed', direction:'outbound-api' }],
      B: [{ sid:'CB1', to:'+15558880001', toFormatted:'+1 555 888 0001', from:'+1555B', startTime:now, duration:45, status:'completed', direction:'inbound' }]
    })
  }
  const client = Twilio(process.env.TWILIO_API_KEY_SID!, process.env.TWILIO_API_KEY_SECRET!, { accountSid: process.env.TWILIO_ACCOUNT_SID })
  const A = process.env.COMPANY_A_NUMBER!, B = process.env.COMPANY_B_NUMBER!
  const [aOut,aIn] = await Promise.all([client.calls.list({from:A,limit:25}), client.calls.list({to:A,limit:25})])
  const [bOut,bIn] = await Promise.all([client.calls.list({from:B,limit:25}), client.calls.list({to:B,limit:25})])
  const norm=(c:any)=>({ sid:c.sid,to:c.to,toFormatted:c.toFormatted||c.to,from:c.from,startTime:c.startTime?.toISOString?.()||c.startTime||c.dateCreated?.toISOString?.()||'',duration:Number(c.duration||0),status:c.status,direction:c.direction })
  const sort=(x:any,y:any)=> new Date(y.startTime||y.dateCreated).getTime()-new Date(x.startTime||x.dateCreated).getTime()
  return NextResponse.json({ A:[...aOut,...aIn].sort(sort).slice(0,50).map(norm), B:[...bOut,...bIn].sort(sort).slice(0,50).map(norm) })
}
