import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "CRM Pro - Next-Gen Customer Relationship Management",
  description: "Premium CRM solution with Apple-inspired design for modern businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
