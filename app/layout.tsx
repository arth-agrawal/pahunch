import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Pahunch — readiness and consented receipt",
  description:
    "A proposal for Valmo COD: ask if the buyer is ready before dispatch, and hand a parcel only to a neighbour who independently agrees.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
