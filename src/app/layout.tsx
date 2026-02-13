import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Navigation } from "@/components/Navigation";
import { BottomTabNavigation } from "@/components/BottomTabNavigation";
import { AuthProvider } from "@/components/AuthProvider";
// import { DebugLogViewer } from "@/components/DebugLogViewer";
import "./globals.css";
import DevInstanceCheck from '@/components/DevInstanceCheck'
import { BackupReminderHandler } from "@/components/settings/BackupReminderHandler";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Money Mngr",
  description: "Privacy-first personal finance manager",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MoneyMngr",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  applicationName: "Money Mngr",
  keywords: ["finance", "money", "budget", "expense tracker", "pwa"],
  authors: [{ name: "Money Mngr" }],
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Toaster position="top-center" reverseOrder={false} />
          <BackupReminderHandler />
          <Navigation />
          {children}
          <BottomTabNavigation />
          <DevInstanceCheck />
        </AuthProvider>
      </body>
    </html>
  );
}
