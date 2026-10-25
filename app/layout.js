import './globals.css';

export const metadata = {
  title: 'Vyuham Esports | eFootball Club Draft',
  description: 'First come, first served club selection for Vyuham Esports eFootball tournament.'
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
