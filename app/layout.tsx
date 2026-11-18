import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/src/components/ui/ToastProvider";
import { MotionProvider } from "@/src/components/providers/MotionProvider";
import { AmbientBackground } from "@/src/components/layout/AmbientBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "LEVELUP — Premium Gaming Lounge",
    template: "%s · LEVELUP",
  },
  description:
    "Reservasi setup gaming premium: PC high-end, PS5 station, dan private room dengan suasana lounge futuristik. Pesan slot favoritmu dalam hitungan detik.",
  applicationName: "LEVELUP",
  keywords: ["gaming lounge", "reservasi", "PC gaming", "PS5", "private room", "Jakarta"],
  openGraph: {
    title: "LEVELUP — Premium Gaming Lounge",
    description:
      "PC high-end, PS5 station, dan private room. Reservasi online dengan konfirmasi cepat.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LEVELUP — Premium Gaming Lounge",
    description: "Reservasi setup gaming premium secara online.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080810",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-foreground">
        <MotionProvider>
          <ToastProvider>
            <AmbientBackground />
            <div className="flex min-h-dvh flex-col">{children}</div>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
