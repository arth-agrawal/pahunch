import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const source = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  title: "Pahunch — readiness and consented receipt",
  description:
    "A proposal for Valmo COD: ask if the buyer is ready before dispatch, and hand a parcel only to a neighbour who independently agrees.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${source.variable} antialiased`}>{children}</body>
    </html>
  );
}
