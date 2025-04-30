'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollDownIndicator() {
	const [shouldShow, setShouldShow] = useState(true);
	const [positionFromTop, setPositionFromTop] = useState(0);

	useEffect(() => {
		const mediaQuery = window.matchMedia('(min-height: 670px)');

		// Function to update visibility and position
		const handleResize = () => {
			const screenHeight = window.innerHeight;
			const paddingFromBottom = 120; // pixels above the bottom
			setPositionFromTop(screenHeight - paddingFromBottom);
			setShouldShow(mediaQuery.matches);
		};

		handleResize(); // run on load

		window.addEventListener('resize', handleResize);
		mediaQuery.addEventListener('change', (e) => setShouldShow(e.matches));

		return () => {
			window.removeEventListener('resize', handleResize);
			mediaQuery.removeEventListener('change', (e) => setShouldShow(e.matches));
		};
	}, []);

	return (
		<AnimatePresence>
			{shouldShow && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5 }}
					style={{
						position: 'absolute',     // <- absolute position
						top: `${positionFromTop}px`, // <- dynamically calculated
						left: '50%',
						transform: 'translateX(-50%)',
						pointerEvents: 'none',    // <- prevent accidental clicks
						zIndex: 40,
					}}
				>
					<div className="flex flex-col items-center">
						<div className="text-md text-neutral-500 mb-2">Scroll Down</div>
						<motion.div
							animate={{
								y: [0, 10, 0],
								opacity: [0.2, 1, 0.2],
							}}
							transition={{
								repeat: Infinity,
								duration: 2,
							}}
							className="w-6 h-10 rounded-full border-2 border-neutral-500 flex justify-center pt-1"
						>
							<motion.div className="w-1 h-1 rounded-full bg-white" />
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
