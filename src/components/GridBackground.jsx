'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocomotiveScroll } from './LocomotiveScrollProvider';

const SQUARE   = 60;
const GAP      = 1;
const TORCH    = 600;
const TOPGLOW  = 0.3;

export default function GridBackground() {
	const { scroll }  = useLocomotiveScroll() || {};
	const heroRef     = useRef(null);
	const torchRef    = useRef(null);
	const [grid, setGrid] = useState({ cols: 0, rows: 0 });
	const lastPos = useRef({ x: 0, y: 0 });

	/* 1 ▸ build enough squares (+1 row/col) */
	useEffect(() => {
		const step = SQUARE + GAP;
		const fit  = () => setGrid({
			cols: Math.ceil(window.innerWidth  / step) + 1,
			rows: Math.ceil(document.body.scrollHeight / step) + 1,
		});
		fit();
		window.addEventListener('resize', fit);
		return () => window.removeEventListener('resize', fit);
	}, []);

	/* 2 ▸ position the torch in hero-local space */
	const renderTorch = ({ x, y }) => {
		if (!heroRef.current || !torchRef.current) return;
		const { left, top } = heroRef.current.getBoundingClientRect();
		torchRef.current.style.transform =
			`translate3d(${x - left - TORCH / 2}px, ${y - top - TORCH / 2}px,0)`;
	};

	/* pointer moves */
	useEffect(() => {
		const move = (e) => {
			lastPos.current = { x: e.clientX, y: e.clientY };
			renderTorch(lastPos.current);
		};
		window.addEventListener('pointermove', move, { passive: true });
		return () => window.removeEventListener('pointermove', move);
	}, []);

	/* smooth-scroll moves (user wheel / keyboard while mouse is still) */
	useEffect(() => {
		const tick = () => renderTorch(lastPos.current);
		if (scroll && typeof scroll.on === 'function') {
			scroll.on('scroll', tick);
			return () => scroll.off('scroll', tick);
		}
		/* fallback for any other scroll engine (or none) */
		window.addEventListener('scroll', tick, { passive: true });
		return () => window.removeEventListener('scroll', tick);
	}, [scroll]);

	const cells = Array.from({ length: grid.cols * grid.rows });

	return (
		<section
		id="hero" data-scroll data-scroll-sticky data-scroll-target="#hero"
		ref={heroRef}
		className="fixed inset-0 pointer-events-none -z-10"
		>
			{/* ambient top glow */}
			<div
			className="glowtop absolute w-full h-[500vh] -z-10"
			style={{
				transform: 'translateY(-50%)',
				background: `radial-gradient(circle, rgba(255,255,255,${TOPGLOW}) 0%, transparent 60%)`,
				mixBlendMode: 'screen',
			}}
			/>

			{/* ambient bottom glow */}
			<div
			className="glowtop absolute bottom-0 w-full h-[500vh] -z-10"
			style={{
				transform: 'translateY(50%)',
				background: `radial-gradient(circle, rgba(255,255,255,${TOPGLOW}) 0%, transparent 60%)`,
				mixBlendMode: 'screen',
			}}
			/>

			{/* moving torch */}
			<div
			ref={torchRef}
			className="absolute top-0 left-0 -z-10"
			style={{
				width: TORCH, height: TORCH, borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 80%)',
					mixBlendMode: 'screen',
					willChange: 'transform',
			}}
			/>

			{/* black-square overlay */}
			<div
			className="absolute inset-0 grid -z-10"
			style={{
				gridTemplateColumns: `repeat(${grid.cols}, ${SQUARE}px)`,
					gridAutoRows: `${SQUARE}px`,
					gap: `${GAP}px`,
			}}
			>
			{cells.map((_, i) => <div key={i} className="bg-black" />)}
		</div>
		</section>
	);
}
