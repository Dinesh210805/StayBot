import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/nav/Navigation";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "StayBot — AI-Powered Accommodation",
  description:
    "Discover extraordinary stays in Bangkok, London, and Cape Town. Your personal AI concierge for unforgettable accommodations.",
  keywords: ["travel", "accommodation", "AI", "Bangkok", "London", "Cape Town"],
  openGraph: {
    title: "StayBot — AI-Powered Accommodation",
    description: "Your personal AI concierge for extraordinary stays.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <Navigation />
        <main>{children}</main>
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}
