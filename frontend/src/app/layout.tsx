import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import EmotionCacheProvider from "@/components/emotion-cache";
import Providers from "@/components/providers";
import KeepAlive from "@/components/KeepAlive";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Rolevo - Auto Apply with AI",
  description:
    "AI-powered job application platform. Search jobs, generate cover letters, and auto-apply with one click.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <EmotionCacheProvider>
          <Providers>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <KeepAlive />
          </Providers>
        </EmotionCacheProvider>
      </body>
    </html>
  );
}
