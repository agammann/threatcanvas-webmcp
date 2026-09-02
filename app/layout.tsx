import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Outpost — Human judgment. Agent speed.',
  description:
    'A shared security triage workspace for human analysts and AI agents, powered by WebMCP.',
  applicationName: 'Outpost',
  keywords: ['WebMCP', 'security triage', 'human in the loop', 'AI agents', 'remediation planning'],
  openGraph: {
    title: 'Outpost — Human judgment. Agent speed.',
    description: 'Explainable security triage and capacity-aware remediation planning through browser-native WebMCP tools.',
    type: 'website',
    images: [{ url: '/threatcanvas-social.png', width: 1672, height: 941, alt: 'Outpost human-in-the-loop security triage workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Outpost — Human judgment. Agent speed.',
    description: 'Explainable security triage and remediation planning through browser-native WebMCP tools.',
    images: ['/threatcanvas-social.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
