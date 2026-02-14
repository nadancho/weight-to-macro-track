import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weight Gain Tracker",
  description: "Track weight and macros over time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
