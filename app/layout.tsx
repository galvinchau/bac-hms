// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Blue Angels Care — Health Management System",
  description: "BAC-HMS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
