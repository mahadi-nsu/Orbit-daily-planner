import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'ORBIT — A space for your next chapter',
  description:
    'Your personal, local-first learning workspace. Connect your knowledge, shape your routine, and make room for focus.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.dataset.theme=localStorage.getItem('orbit.theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
