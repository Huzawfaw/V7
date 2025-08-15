# Two-Number Web Dialer (Twilio + Next.js on Vercel)

- One dialer UI for *two* Twilio numbers (Company A/B)
- Separate histories & recordings (fetched live from Twilio)
- Mock mode for local testing (no Twilio needed)

## Env
Copy `.env.example` to `.env.local` (for local) or set on Vercel Project → Environment Variables.

## Local Dev
```
npm install
npm run dev
```
Mock testing (no calls):
```
NEXT_PUBLIC_MOCK=1
MOCK=1
```

## Deploy on Vercel
- Add the Twilio env vars (no MOCK flags)
- Node 18/20 recommended
- Build command: `npm run build`
- Output dir: `.next`
