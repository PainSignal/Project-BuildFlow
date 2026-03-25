import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "BuildFlow - Construction Project Management Software",
    template: "%s | BuildFlow"
  },
  description: "The all-in-one platform for construction management. Track projects, manage tasks, control budgets, and collaborate with your team. Start your 14-day free trial today.",
  keywords: [
    "construction management software",
    "project management",
    "construction tools",
    "task tracking",
    "budget management",
    "purchase orders",
    "permit tracking",
    "team collaboration"
  ],
  authors: [{ name: "BuildFlow" }],
  creator: "BuildFlow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://buildflow.com",
    title: "BuildFlow - Construction Project Management Software",
    description: "The all-in-one platform for construction management. Track projects, manage tasks, control budgets, and collaborate with your team.",
    siteName: "BuildFlow",
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildFlow - Construction Project Management Software",
    description: "The all-in-one platform for construction management.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
