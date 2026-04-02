import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import RealtimeChat from "@/components/RealtimeChat";
import { ReactNode } from "react";

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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <RealtimeChat roomName="support-chat" />
      </body>
    </html>
  );
}
