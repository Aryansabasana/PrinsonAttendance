import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prinson Plynest — Employee Attendance Portal",
  description: "Official Employee Attendance & Leave Management Portal for Prinson Plynest Showroom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-white text-zinc-900 antialiased selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
