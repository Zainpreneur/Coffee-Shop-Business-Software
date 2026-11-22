import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brew Base — Coffee Shop Business Suite",
  description: "Point of sale, menu, inventory, orders, customers, staff and reporting for coffee shops.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
