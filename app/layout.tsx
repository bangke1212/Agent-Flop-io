import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLOP // BOT — Agent Control",
  description: "Dashboard aman untuk identitas dan signed check-in agen FLOP Labs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
