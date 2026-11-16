import '../assets/arcade.css';
import './globals.css';
import { ProfileProvider } from '../components/ProfileProvider';
import SiteShell from '../components/SiteShell';
export const metadata = {
  metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'),
  title: { default:'Algoredeem Games — Play hard. Go all in.', template:'%s · Algoredeem Games' },
  description:'Play 31 free football, racing, sports, action, puzzle and rhythm games on Algoredeem Games.',
  manifest:'/manifest.webmanifest',
  icons:{icon:'/assets/arcade-icon.svg',apple:'/assets/arcade-icon-192.png'},
};
export const viewport = { width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#080d1a' };
export default function RootLayout({children}){return <html lang="en"><body><ProfileProvider><SiteShell>{children}</SiteShell></ProfileProvider></body></html>;}
