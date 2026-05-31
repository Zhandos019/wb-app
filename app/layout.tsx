import type { Metadata, Viewport } from "next";
import "./globals.css";

import {
  ClerkProvider,
} from "@clerk/nextjs";

import {
  Geist,
  Geist_Mono,
} from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WB Analytics",
  description: "WB Analytics Dashboard",

  manifest: "/manifest.json",

  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider dynamic>
      <html lang="ru">
        <body
          className={`${geistSans.variable} ${geistMono.variable}`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}