import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/nav/Navigation";
import { Toaster } from "sonner";
import Cursor from "@/components/fx/Cursor";
import SmoothScroll from "@/components/providers/SmoothScroll";

export const metadata: Metadata = {
  title: "StayBot — A Living Atlas of Stays",
  description:
    "An AI concierge for extraordinary stays in Bangkok, London, and Cape Town. Describe what you want — we curate where you sleep.",
  keywords: ["travel", "AI concierge", "Bangkok", "London", "Cape Town", "luxury stays"],
  openGraph: {
    title: "StayBot — A Living Atlas of Stays",
    description: "An AI concierge for extraordinary stays.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full" suppressHydrationWarning>
        <SmoothScroll>
          <Cursor />
          <Navigation />
          <main>{children}</main>
          <Toaster
            theme="light"
            toastOptions={{
              style: {
                background: "#FBF6EA",
                border: "1px solid #DACFB7",
                color: "#0E1110",
              },
            }}
          />
        </SmoothScroll>
      </body>
    </html>
  );
}
