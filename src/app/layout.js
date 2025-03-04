// src/app/layout.js
'use client';

import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Translation App</title>
        <meta name="description" content="Professional-quality translations powered by AI" />
      </head>
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}