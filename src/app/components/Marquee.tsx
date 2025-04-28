"use client";

import { useEffect, useRef } from "react";

export default function Marquee() {
	const textPathRef = useRef<SVGTextPathElement>(null);

	useEffect(() => {
		let animationFrameId: number;

		const animate = () => {
			if (textPathRef.current) {
				const startOffset = parseFloat(textPathRef.current.getAttribute("startOffset") || "0");
				const newOffset = (startOffset - 1) % 450;
				textPathRef.current.setAttribute("startOffset", `${newOffset}`);
			}
			animationFrameId = requestAnimationFrame(animate);
		};

		animationFrameId = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationFrameId);
	}, []);

	return (
		<div className="overflow-hidden w-full h-[300px] relative">
			<svg viewBox="0 0 2550 300" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 -left-[10vw] w-[300%] h-full text-white">
				{/* Wavy Path */}
				<path
					id="marquee-path"
					d="M-850,150 
					L-850,150 
					S-283.05,250 0,250 
					S566.95,150 850,150 
					S1416.95,250 1700,250 
					S2266.95,150 2550,150"
					fill="none"
					stroke="transparent"
				/>

				{/* Text following the path */}
				<text className="fill-current font-light text-6xl">
					<textPath href="#marquee-path" startOffset="0" ref={textPathRef}>
						{"view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓ view my work ↓"}
					</textPath>
				</text>
			</svg>
		</div>
	);
}
