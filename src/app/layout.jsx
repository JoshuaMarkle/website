import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import "@/app/globals.css";

export const metadata = {
  title: "Joshua Markle | Portfolio",
  description: "Hi, I'm Josh. Check out my stuff",
  // openGraph: {
  //   url: "https://algotype.net",
  //   title: "AlgoType | Typing Practice For Programmers",
  //   description:
  //     "AlgoType.net is designed to help programmers train their typing skills on syntax and special characters in order to achive flow and maximize productivity.",
  //   images: [
  //     {
  //       url: "https://algotype.net/twitter-card.png",
  //       width: 1200,
  //       height: 630,
  //       alt: "AlgoType Logo",
  //     },
  //   ],
  // },
  // twitter: {
  //   card: "summary_large_image",
  //   title: "AlgoType | Typing Practice For Programmers",
  //   description:
  //     "AlgoType.net is designed to help programmers train their typing skills on syntax and special characters in order to achive flow and maximize productivity.",
  //   images: ["https://algotype.net/twitter-card.png"],
  // },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
