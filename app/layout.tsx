import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import ConditionalRealtimeChat from "@/components/ConditionalRealtimeChat";
import ClientPresenceHeartbeat from "@/components/ClientPresenceHeartbeat";
import SessionToasts from "@/components/SessionToasts";
import ActionToastStack from "@/components/ActionToastStack";
import AuthHashRedirect from "@/components/AuthHashRedirect";
import { ReactNode, Suspense } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Grace Writers - Professional Writing Services",
  description: "Professional writing services for academic, business, technical, and creative content. Fast turnaround, 100% original, unlimited revisions.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased" suppressHydrationWarning>
        <Suspense fallback={null}>
          <AuthHashRedirect />
        </Suspense>
        <AppShell>{children}</AppShell>
        <ConditionalRealtimeChat />
        <ClientPresenceHeartbeat />
        <SessionToasts />
        <ActionToastStack />
      </body>
    </html>
  );
}
