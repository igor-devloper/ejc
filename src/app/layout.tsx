import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vista o propósito | EJC",
  description: "Personalize sua camisa do Ministério do Esporte EJC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="module"
          src="https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
