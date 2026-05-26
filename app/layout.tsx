import type {Metadata} from 'next';
import './globals.css'; 
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Subic Church of Christ Data Entry',
  description: 'Data entry system for Subic Church of Christ members',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50 text-gray-900" suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
