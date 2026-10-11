import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  metadataBase: new URL("https://wb-app-sigma.vercel.app"),
  title: {
    default: "WB Analytics — аналитика продаж Wildberries",
    template: "%s | WB Analytics",
  },
  description:
    "Анализируйте продажи Wildberries, отслеживайте выручку и динамику по месяцам. Загружайте Excel-отчёты и изучайте показатели магазина в одном кабинете.",
  applicationName: "WB Analytics",
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "F9ZlYkt3g31quHTnbIbRqbKpH0YGVkbCEHvtr5Z5zY0",
  },
  openGraph: {
    title: "WB Analytics — аналитика продаж Wildberries",
    description:
      "Удобный анализ продаж, выручки и динамики магазина Wildberries.",
    url: "https://wb-app-sigma.vercel.app/",
    siteName: "WB Analytics",
    locale: "ru_RU",
    type: "website",
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
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}