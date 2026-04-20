import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StatusBanner } from "@features/platform-status";
import { Footer } from "@shared/components/layout/footer";
import { Navbar } from "@shared/components/layout/navbar";
import { GoogleAnalytics } from "@shared/components/ui/google-analytics";
import { Toaster } from "@shared/components/ui/sonner";
import { Providers } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FAVOR - (Functional Annotation of Variants Online Resource)",
  description:
    "An open-access variant functional annotation portal for whole genome sequencing (WGS/WES) data. FAVOR contains total 8,892,915,237 variants (all possible 8,812,917,339 SNVs and 79,997,898 Observed indels).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <GoogleAnalytics GA_TRACKING_ID={process.env.GA_TRACKING_ID} />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <StatusBanner />
          <Navbar />
          <main
            style={{
              marginTop: "calc(4rem + var(--status-banner-h, 0px))",
            }}
            className="flex-1"
          >
            {children}
          </main>
          <Footer />
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
