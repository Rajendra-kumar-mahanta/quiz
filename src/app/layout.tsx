import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROBOQUEST — Live Technical Quiz & Competition Platform',
  description: 'Next-generation real-time interactive competition platform for robotics, engineering, and programming workshops.',
  keywords: ['robotics quiz', 'arduino challenge', 'live competition', 'classroom quiz', 'real-time leaderboard'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-gray-100 min-h-screen selection:bg-cyber-cyan selection:text-background circuit-pattern relative">
        <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-background/40 to-background z-0" />
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
