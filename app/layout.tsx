export const metadata = { title: "Two-Number Web Dialer", description: "Twilio WebRTC dialer for two company numbers" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="min-h-screen bg-zinc-50 text-zinc-900">{children}</body></html>);
}
