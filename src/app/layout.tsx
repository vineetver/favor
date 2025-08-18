import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { QueryProviders } from "@/components/providers/tanstack-query";
import { Footer } from "@/components/layout/footer";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        <main className="mt-16 flex-1">
          <QueryProviders>{children}</QueryProviders>
        </main>
        <Footer />
      </body>
    </html>
  );
}
