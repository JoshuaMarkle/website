'use client';

import { useEffect, useRef } from 'react';
import 'locomotive-scroll/dist/locomotive-scroll.css';

export default function LocomotiveScrollProvider({ children }: { children: React.ReactNode }) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		(async () => {
			const LocomotiveScroll = (await import('locomotive-scroll')).default;
			const scroll = new LocomotiveScroll({
				el: containerRef.current,
				smooth: true,
				lerp: 0.05,
				multiplier: 1,
			});

			window.addEventListener('load', () => {
				scroll.update(); // Update after everything (like images) loads
			});

			return () => {
				scroll.destroy();
			};
		})();
	}, []);

	return (
		<div ref={containerRef} data-scroll-container>
		{children}
		</div>
	);
}
