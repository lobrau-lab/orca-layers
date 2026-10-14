import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '8-Bit/16-Bit Retro Music Video Sequencer Overlay',
  description: 'Decoupled 2D Canvas Game Overlay and Puppeteer UI Controller for retro music video sequencing with BackendBridge telemetry, multi-track overdubbing, and rail sequencing.',
  openGraph: {
    title: '8-Bit/16-Bit Retro Music Video Sequencer Overlay',
    description: 'Decoupled 2D Canvas Game Overlay and Puppeteer UI Controller with BackendBridge telemetry and multi-track overdubbing.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
