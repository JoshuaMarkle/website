'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import 'locomotive-scroll/dist/locomotive-scroll.css';

const ScrollContext = createContext(null);
export const useLocomotiveScroll = () => useContext(ScrollContext);

export default function LocomotiveScrollProvider({ children }) {
	const containerRef = useRef(null);
	const [scroll, setScroll] = useState(null);

	useEffect(() => {
		if (!containerRef.current) return;

		let locoScroll;                           // will hold the instance
		(async () => {
			const LocomotiveScroll = (await import('locomotive-scroll')).default;

			locoScroll = new LocomotiveScroll({
				el: containerRef.current,
				smooth: true,
				lerp: 0.05,
				multiplier: 1,
			});

			// force an update once images / fonts are in
			window.addEventListener('load', () => locoScroll.update());
			setScroll(locoScroll);                  // expose through context
		})();

		// CLEAN-UP (runs when the component unmounts)
		return () => {
			locoScroll && locoScroll.destroy();
		};
	}, []);

	return (
		<ScrollContext.Provider value={scroll}>
		<div ref={containerRef} data-scroll-container>
		{children}
		</div>
		</ScrollContext.Provider>
	);
}
