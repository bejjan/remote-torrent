import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppToaster } from "@/components/app-toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deluge Nova",
  description:
    "A modern web UI for Deluge. Manage torrents, speeds, files, and labels from the browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} h-full antialiased`}
    >
      <body className={`${geistSans.className} min-h-full flex flex-col font-sans`}>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
