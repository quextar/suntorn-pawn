import type { ReactNode } from 'react';

export const metadata = { title: 'สุนทรการค้า' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, fontFamily: "'Noto Sans Thai', system-ui, sans-serif", background: '#F2F4F8', color: '#0F1B3D' }}>
        {children}
      </body>
    </html>
  );
}
