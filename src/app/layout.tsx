import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import LocomotiveScrollProvider from '@/components/LocomotiveScrollProvider';
import ScrollDownIndicator from '@/components/ScrollDownIndicator';
import Footer from "@/components/Footer"
import GridBackground from "@/components/GridBackground";
import "./globals.css";

// Fonts
const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin"],
});

// Metadata
export const metadata: Metadata = {
	title: "Joshua Markle | Portfolio",
	description: "Student at UVA studying Computer Science",
};

// Main layout
export default function RootLayout({
	children,
}: Readonly<{
		children: React.ReactNode;
	}>) {
	return (
		<html lang="en">
			<body className={`${dmSans.variable} antialiased`}>
				<LocomotiveScrollProvider>
					<GridBackground/>
					<ScrollDownIndicator/>
					{children}
					<Footer/>
				</LocomotiveScrollProvider>
			</body>
		</html>
	);
}
