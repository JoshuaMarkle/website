import { DM_Sans } from "next/font/google";
import LocomotiveScrollProvider from '@/components/LocomotiveScrollProvider';
import ScrollDownIndicator from '@/components/ScrollDownIndicator';
import Footer from "@/components/Footer";
import GridBackground from "@/components/GridBackground";
import "./globals.css";

const dmSans = DM_Sans({
	variable: "--font-dm-sans",
	subsets: ["latin"],
});

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className={`${dmSans.variable} antialiased`}>
				<LocomotiveScrollProvider>
					<GridBackground/>
					<ScrollDownIndicator/>
					{children}
					<Footer />
				</LocomotiveScrollProvider>
			</body>
		</html>
	);
}
