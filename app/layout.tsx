import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessGuard - AI Analysis",
  description: "State of the art chess analysis and next move prediction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
