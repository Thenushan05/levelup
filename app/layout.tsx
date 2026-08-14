import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";

// Orbitron: the geometric, heavy-set sci-fi face for the "System" chrome —
// headers, labels, numbers. Rajdhani: a technical-but-readable body face so
// paragraphs of copy don't fight the display font. Neither is tied to any
// anime/game IP — both are open Google Fonts widely used for HUD styling.
const fontDisplay = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const fontBody = Rajdhani({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LevelUp — Level Up Your Training",
  description:
    "LevelUp turns your real-life gym routine into a leveling system. Track workouts, earn XP, level up, and rank up.",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
