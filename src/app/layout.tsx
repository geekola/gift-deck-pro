import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gift Deck Pro",
  description: "Gift Deck Pro (PSF) — internal preview build",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
