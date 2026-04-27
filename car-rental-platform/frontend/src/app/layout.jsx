import '../styles/globals.css';
import Navbar from '../components/Navbar';
import AIAssistant from '../components/AIAssistant';
import ServiceWorkerRegister from '../components/ServiceWorkerRegister';
import Toaster from '../components/Toaster';

export const metadata = {
  title: 'Trustly Cars — Trust-First Offline Car Rental',
  description: 'Book cars with verifiable evidence, offline-first reliability, and a trust assistant.',
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  themeColor: '#1f54e6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
        <AIAssistant />
        <ServiceWorkerRegister />
        <Toaster />
      </body>
    </html>
  );
}
