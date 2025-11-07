"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const usePlainLayout = pathname.startsWith("/login"); // không có sidebar ở trang login

  return (
    <html lang="en">
      <body className="bg-bac-bg text-bac-text">
        {usePlainLayout ? children : <AppShell>{children}</AppShell>}
      </body>
    </html>
  );
}
