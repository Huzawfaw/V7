import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Two-Number Web Dialer',
  description: 'Twilio WebRTC Dialer with dark mode',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
        {children}
      </body>
    </html>
  )
}
