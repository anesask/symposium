import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond, Marcellus_SC } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";

// Display: Cormorant Garamond. Reading text: EB Garamond. Labels and names: Marcellus SC (Roman inscription capitals).
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], variable: "--font-display" });
const body = EB_Garamond({ subsets: ["latin", "greek"], variable: "--font-body" });
const caps = Marcellus_SC({ subsets: ["latin"], weight: "400", variable: "--font-caps-face" });

export const metadata: Metadata = {
  title: "Symposium",
  description: "Argue it out with the greats. A table of great minds debates your question, then calls the vote.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${caps.variable}`}>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
