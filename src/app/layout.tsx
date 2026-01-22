import type { Metadata } from "next";
import { Kanit } from "next/font/google"; // turbo
import "./globals.css";
import { Providers } from "@/components/Providers";
import ClientLayout from "@/components/layout/ClientLayout";
import { ToastContainer } from "@/components/ui/Toast";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kanit",
});

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
    <html lang="en" suppressHydrationWarning>
      <body className={`${kanit.variable} antialiased font-sans`} suppressHydrationWarning>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
          {/* Toast Container for Global Notifications */}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
