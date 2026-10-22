
import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "Tia Earn",
  description: "Tia Earn Telegram Mini App"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
