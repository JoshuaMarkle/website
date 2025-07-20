import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "@/app/globals.css";

export const metadata = {
  title: "Joshua Markle | Portfolio",
  description: "Hi, I'm Josh. Check out my stuff!",
  openGraph: {
    url: "https://joshuamarkle.com",
    title: "Joshua Markle | Portfolio",
    description: "Hi, I'm Josh. Check out my stuff!",
    images: [
      {
        url: "https://joshuamarkle.com/images/twitter-card.png",
        width: 1200,
        height: 630,
        alt: "Joshua Markle Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Joshua Markle | Portfolio",
    description: "Hi, I'm Josh. Check out my stuff!",
    images: ["https://joshuamarkle.com/images/twitter-card.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/images/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/images/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" href="/images/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
