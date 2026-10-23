import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "Francisco Souza — dev front-end",
  description: "Portfólio de Francisco Souza, dev front-end e estudante de Engenharia de Software. Um terminal para explorar projetos, stack e contato.",
};

export const viewport: Viewport = {
  themeColor: "#040c07",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
