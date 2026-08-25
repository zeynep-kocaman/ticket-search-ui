import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enpal Ticket Search',
  description: 'Secure support answer drafting tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
