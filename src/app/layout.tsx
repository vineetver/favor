import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { QueryProviders } from "@/components/providers/tanstack-query";
import { Footer } from "@/components/layout/footer";
import { ChatInterface } from "@/components/chat/chat-interface";
import { cookies } from "next/headers";
import { DEFAULT_MODEL_NAME, models } from "@/lib/ai/models";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@/components/ui/google-analytics";

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
  const cookieStore = cookies();
  const modelIdFromCookie = cookieStore.get("model-id")?.value;

  // Use cookie value if valid, otherwise fall back to default
  const selectedModelId =
    modelIdFromCookie && models.find((m) => m.id === modelIdFromCookie)
      ? modelIdFromCookie
      : DEFAULT_MODEL_NAME;

  return (
    <html lang="en">
      <GoogleAnalytics GA_TRACKING_ID={process.env.GA_TRACKING_ID} />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface font-sans text-on-surface min-h-screen`}
      >
        <Navbar />
        <main className="mt-16 flex-1">
          <QueryProviders>{children}</QueryProviders>
        </main>
        <Footer />
        <Toaster />
        <ChatInterface selectedModelId={selectedModelId} />
      </body>
    </html>
  );
}
