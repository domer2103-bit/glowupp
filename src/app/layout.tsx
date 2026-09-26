import type { Metadata } from "next";
import { Geist, Geist_Mono, Caveat } from "next/font/google";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Handwritten-style annotations on the marketing homepage/redesign pages only. */
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlowUpp — visualise your home renovation, then find the right pro",
  description:
    "Upload a photo of your space, preview renovation ideas instantly, and connect with trusted local professionals to bring them to life.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
