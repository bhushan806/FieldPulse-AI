import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FieldPulse AI — Infrastructure Progress Tracking",
  description:
    "Intelligent data-capture and schedule-linking layer for oil & gas infrastructure project management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-bg-app text-text-primary antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
